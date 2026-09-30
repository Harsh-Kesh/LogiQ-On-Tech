// Monoova NPP/OSKO payment client
// Credentials: MONOOVA_USERNAME, MONOOVA_PASSWORD, MONOOVA_SOURCE_ACCOUNT_ID
// Sandbox base URL: https://sandbox.monoova.com
// Production base URL: https://api.monoova.com

const MONOOVA_BASE = process.env.MONOOVA_BASE_URL || 'https://sandbox.monoova.com';

function basicAuthHeader(): string {
  const user = process.env.MONOOVA_USERNAME;
  const pass = process.env.MONOOVA_PASSWORD;
  if (!user || !pass) {
    throw new Error('MONOOVA_USERNAME or MONOOVA_PASSWORD environment variable is not set.');
  }
  return `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
}

export interface MonoovaOskoParams {
  toAccountBsb: string;       // vendor.bankBsb
  toAccountNumber: string;    // vendor.bankAccountNumber
  toAccountName: string;      // vendor.bankAccountName
  amount: number;             // AUD, 2 decimal places
  description: string;        // payment description shown to recipient
  reference?: string;         // optional internal reference (PO number)
}

export interface MonoovaOskoResult {
  transactionId: string;
  status: string;
  uniqueReference: string;
}

export async function sendMonoovaOskoPayment(params: MonoovaOskoParams): Promise<MonoovaOskoResult> {
  const sourceAccountId = process.env.MONOOVA_SOURCE_ACCOUNT_ID;
  if (!sourceAccountId) {
    throw new Error('MONOOVA_SOURCE_ACCOUNT_ID environment variable is not set.');
  }

  const body = {
    sourceAccountId,
    toAccountBSB: params.toAccountBsb,
    toAccountNumber: params.toAccountNumber,
    toAccountName: params.toAccountName,
    amount: Number(params.amount.toFixed(2)),
    description: params.description.slice(0, 280),
    ...(params.reference ? { uniqueReference: params.reference } : {}),
  };

  const res = await fetch(`${MONOOVA_BASE}/transactions/osko/v1`, {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Monoova OSKO payment failed ${res.status}: ${text}`);
  }

  const data = await res.json();
  return {
    transactionId: data.transactionId || data.id || '',
    status: data.status || 'PENDING',
    uniqueReference: data.uniqueReference || params.reference || '',
  };
}
