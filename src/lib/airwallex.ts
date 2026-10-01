// Airwallex supplier payment client (alternative to Monoova for sandbox/demo).
// Env vars: AIRWALLEX_CLIENT_ID, AIRWALLEX_API_KEY, AIRWALLEX_ENV (demo | prod)
// Docs: https://www.airwallex.com/docs/api

const BASE_URL = () =>
  process.env.AIRWALLEX_ENV === 'prod'
    ? 'https://api.airwallex.com'
    : 'https://api-demo.airwallex.com';

let _token: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (_token && Date.now() < _token.expiresAt - 60_000) return _token.value;

  const clientId = process.env.AIRWALLEX_CLIENT_ID;
  const apiKey = process.env.AIRWALLEX_API_KEY;

  if (!clientId || !apiKey) {
    throw new Error('AIRWALLEX_CLIENT_ID and AIRWALLEX_API_KEY must be set.');
  }

  const res = await fetch(`${BASE_URL()}/api/v1/authentication/login`, {
    method: 'POST',
    headers: {
      'x-client-id': clientId,
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Airwallex auth failed ${res.status}: ${text}`);
  }

  const data = await res.json();
  _token = {
    value: data.token,
    expiresAt: Date.now() + (data.expires_in || 1800) * 1000,
  };
  return _token.value;
}

export interface AirwallexPaymentParams {
  toAccountBsb: string;
  toAccountNumber: string;
  toAccountName: string;
  amount: number;
  currency: string;
  reference: string;    // shown on recipient's bank statement
  requestId: string;    // idempotency key (e.g. storefront order ID)
}

export interface AirwallexPaymentResult {
  transactionId: string;
  status: string;
}

export async function sendAirwallexPayment(
  params: AirwallexPaymentParams
): Promise<AirwallexPaymentResult> {
  const token = await getAccessToken();

  const body = {
    request_id: params.requestId,
    amount: params.amount,
    currency: params.currency || 'AUD',
    payment_method: {
      type: 'LOCAL_BANK_TRANSFER',
      local_bank_transfer: {
        bank_country_code: 'AU',
        account_name: params.toAccountName,
        account_number: params.toAccountNumber,
        bsb: params.toAccountBsb,
      },
    },
    remarks: params.reference.slice(0, 64),
  };

  const res = await fetch(`${BASE_URL()}/api/v1/transfers/create`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-on-behalf-of': process.env.AIRWALLEX_ACCOUNT_ID || '',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Airwallex payment failed ${res.status}: ${text}`);
  }

  const data = await res.json();
  return {
    transactionId: data.id || data.transfer_id || '',
    status: data.status || 'PENDING',
  };
}
