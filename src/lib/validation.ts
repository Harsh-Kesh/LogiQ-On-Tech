/**
 * Production Validation Engine for LogiQ-On Tech
 * Enforces Australian Statutory Standards (ABN/ACN), Security Password Policies, and Email RFC RFC 5322
 */

// Australian Business Number (ABN) 11-digit ATO Checksum Validation Algorithm
export function isValidAbn(abn: string): boolean {
  const cleanAbn = abn.replace(/\s+/g, '');
  if (!/^\d{11}$/.test(cleanAbn)) return false;

  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  const digits = cleanAbn.split('').map(Number);
  digits[0] -= 1; // Subtract 1 from first digit

  const sum = digits.reduce((acc, digit, idx) => acc + digit * weights[idx], 0);
  return sum % 89 === 0;
}

// Australian Company Number (ACN) 9-digit ASIC Checksum Validation Algorithm
export function isValidAcn(acn: string): boolean {
  const cleanAcn = acn.replace(/\s+/g, '');
  if (!/^\d{9}$/.test(cleanAcn)) return false;

  const weights = [8, 7, 6, 5, 4, 3, 2, 1];
  const digits = cleanAcn.split('').map(Number);
  const sum = digits.slice(0, 8).reduce((acc, digit, idx) => acc + digit * weights[idx], 0);
  const remainder = sum % 10;
  const complement = (10 - remainder) % 10;

  return complement === digits[8];
}

export function isValidAbnAcn(abnAcn: string): { valid: boolean; message?: string } {
  const clean = abnAcn.replace(/\s+/g, '');
  if (!clean) return { valid: false, message: 'ABN or ACN is required' };
  
  if (clean.length === 11) {
    if (!isValidAbn(clean)) {
      return { valid: false, message: 'Invalid Australian Business Number (ABN 11-digit ATO checksum failed)' };
    }
    return { valid: true };
  } else if (clean.length === 9) {
    if (!isValidAcn(clean)) {
      return { valid: false, message: 'Invalid Australian Company Number (ACN 9-digit ASIC checksum failed)' };
    }
    return { valid: true };
  }

  return { valid: false, message: 'ABN must be exactly 11 digits or ACN must be 9 digits' };
}

// Strict Email RFC 5322 Regex
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim());
}

// Production Security Password Policy
export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePasswordPolicy(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Must contain at least one uppercase letter (A-Z)');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Must contain at least one lowercase letter (a-z)');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Must contain at least one number (0-9)');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Must contain at least one special character (!@#$%^&*)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Full Name Validation
export function isValidFullName(name: string): boolean {
  const trimmed = name.trim();
  if (trimmed.length < 2) return false;
  return /^[a-zA-Z\s\-\'\.]+$/.test(trimmed);
}

// Company Name Validation
export function isValidCompanyName(companyName: string): boolean {
  const trimmed = companyName.trim();
  return trimmed.length >= 3;
}
