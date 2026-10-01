// MYOB Business API client — OAuth2 refresh token flow.
// One-time setup: visit /api/auth/myob/connect as Platform Owner to authorise.
// Credentials needed: MYOB_CLIENT_ID, MYOB_CLIENT_SECRET, MYOB_COMPANY_FILE_ID,
//                     MYOB_REFRESH_TOKEN (obtained via /api/auth/myob/connect)

const MYOB_BASE = 'https://api.myob.com/accountright';
const MYOB_TOKEN_URL = 'https://secure.myob.com/oauth2/v1/token';

let _cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (_cachedToken && Date.now() < _cachedToken.expiresAt - 60_000) {
    return _cachedToken.token;
  }

  const clientId = process.env.MYOB_CLIENT_ID;
  const clientSecret = process.env.MYOB_CLIENT_SECRET;
  const refreshToken = process.env.MYOB_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'MYOB credentials not configured. Set MYOB_CLIENT_ID, MYOB_CLIENT_SECRET and MYOB_REFRESH_TOKEN. ' +
      'Visit /api/auth/myob/connect (as Platform Owner) to generate the refresh token.'
    );
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });

  const res = await fetch(MYOB_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MYOB token refresh failed ${res.status}: ${text}. Re-visit /api/auth/myob/connect to re-authorise.`);
  }

  const data = await res.json();
  _cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 1200) * 1000,
  };
  return _cachedToken.token;
}

function companyFileId(): string {
  const id = process.env.MYOB_COMPANY_FILE_ID;
  if (!id) throw new Error('MYOB_COMPANY_FILE_ID environment variable is not set.');
  return id;
}

async function myobRequest(method: string, path: string, body?: object): Promise<any> {
  const token = await getAccessToken();
  const url = `${MYOB_BASE}/${companyFileId()}${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-myobapi-key': process.env.MYOB_CLIENT_ID || '',
      'x-myobapi-version': 'v2',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MYOB API ${method} ${path} failed ${res.status}: ${text}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

export interface MyobPoLine {
  itemCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxCode?: string; // 'GST' for AU
}

export interface CreateMyobPoParams {
  supplierContactId: string; // vendor.myobContactId (MYOB Supplier GUID)
  poNumber: string;          // our internal PO number for reference
  deliveryAddress: string;
  currency: string;
  lines: MyobPoLine[];
  memo?: string;
}

export interface MyobPoResult {
  guid: string;
  poNumber: string;
}

export async function createMyobPurchaseOrder(params: CreateMyobPoParams): Promise<MyobPoResult> {
  if (!process.env.MYOB_CLIENT_ID) {
    const fakeGuid = `DEMO-MYOB-PO-${Date.now()}`;
    console.log(`[MYOB DEMO] Would create PO ${params.poNumber} for supplier ${params.supplierContactId}`);
    return { guid: fakeGuid, poNumber: params.poNumber };
  }
  const body = {
    Supplier: { UID: params.supplierContactId },
    Number: params.poNumber,
    Date: new Date().toISOString().split('T')[0],
    ShipToAddress: params.deliveryAddress,
    Memo: params.memo || `Purchase Order ${params.poNumber} — LogiQ-On Tech`,
    Lines: params.lines.map((l) => ({
      Type: 'Item',
      Item: { DisplayID: l.itemCode },
      Description: l.description,
      ShipQuantity: l.quantity,
      UnitPrice: l.unitPrice,
      TaxCode: { Code: l.taxCode || 'GST' },
    })),
  };

  const result = await myobRequest('POST', '/Purchase/Order/Item', body);
  // MYOB returns the new resource URI in the Location header or body
  const guid: string = result?.UID || result?.uid || result?.id || '';
  const number: string = result?.Number || params.poNumber;
  return { guid, poNumber: number };
}

export interface MyobBillParams {
  supplierContactId: string;
  purchaseOrderGuid?: string;
  invoiceNumber: string; // supplier's invoice number
  invoiceDate: string;   // ISO date string
  deliveryAddress: string;
  lines: MyobPoLine[];
  memo?: string;
}

export interface MyobBillResult {
  guid: string;
  billNumber: string;
}

export async function createMyobBill(params: MyobBillParams): Promise<MyobBillResult> {
  if (!process.env.MYOB_CLIENT_ID) {
    const fakeGuid = `DEMO-MYOB-BILL-${Date.now()}`;
    const fakeBillNumber = `DEMO-BILL-${params.invoiceNumber}`;
    console.log(`[MYOB DEMO] Would create Bill for invoice ${params.invoiceNumber}, supplier ${params.supplierContactId}`);
    return { guid: fakeGuid, billNumber: fakeBillNumber };
  }
  const body = {
    Supplier: { UID: params.supplierContactId },
    SupplierInvoiceNumber: params.invoiceNumber,
    Date: params.invoiceDate,
    ShipToAddress: params.deliveryAddress,
    Memo: params.memo || `Supplier Bill ${params.invoiceNumber} — LogiQ-On Tech`,
    ...(params.purchaseOrderGuid ? { PurchaseOrder: { UID: params.purchaseOrderGuid } } : {}),
    Lines: params.lines.map((l) => ({
      Type: 'Item',
      Item: { DisplayID: l.itemCode },
      Description: l.description,
      BillQuantity: l.quantity,
      UnitPrice: l.unitPrice,
      TaxCode: { Code: l.taxCode || 'GST' },
    })),
  };

  const result = await myobRequest('POST', '/Purchase/Bill/Item', body);
  const guid: string = result?.UID || result?.uid || '';
  const billNumber: string = result?.Number || params.invoiceNumber;
  return { guid, billNumber };
}

export interface MyobSupplierPaymentParams {
  supplierContactId: string;
  billGuid: string;
  amount: number;
  paymentDate: string; // ISO date string
  memo?: string;
}

export interface MyobPaymentResult {
  guid: string;
}

export async function recordMyobSupplierPayment(params: MyobSupplierPaymentParams): Promise<MyobPaymentResult> {
  if (!process.env.MYOB_CLIENT_ID) {
    const fakeGuid = `DEMO-MYOB-PAY-${Date.now()}`;
    console.log(`[MYOB DEMO] Would record supplier payment AUD ${params.amount} against bill ${params.billGuid}`);
    return { guid: fakeGuid };
  }
  const body = {
    Supplier: { UID: params.supplierContactId },
    Date: params.paymentDate,
    Memo: params.memo || 'Supplier payment via Monoova NPP',
    PaymentMethod: 'ElectronicPayment',
    Lines: [
      {
        Purchase: { UID: params.billGuid },
        AmountApplied: params.amount,
      },
    ],
  };

  const result = await myobRequest('POST', '/Purchase/SupplierPayment', body);
  const guid: string = result?.UID || result?.uid || '';
  return { guid };
}
