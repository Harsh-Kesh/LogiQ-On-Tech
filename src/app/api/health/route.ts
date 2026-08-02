import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    system: 'LogiQ-On Tech Platform',
    task: 'KAN-1',
    environment: 'staging',
    timestamp: new Date().toISOString(),
  });
}
