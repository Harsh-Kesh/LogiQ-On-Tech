import { isValidAbnAcn } from './validation';

export function checkAbnAcnCompliance(abnAcn?: string | null): { verified: boolean; message: string } {
  if (!abnAcn || !abnAcn.trim()) {
    return { verified: false, message: 'Not Submitted' };
  }
  const result = isValidAbnAcn(abnAcn);
  if (result.valid) {
    return { verified: true, message: 'ATO Checksum Verified' };
  }
  return { verified: false, message: result.message || 'Checksum Failed' };
}
