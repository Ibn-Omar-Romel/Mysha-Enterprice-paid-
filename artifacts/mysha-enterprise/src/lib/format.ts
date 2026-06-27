export function formatBDT(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace('BDT', '৳').trim();
}

/**
 * Validates a Bangladeshi mobile number. Accepts local (01XXXXXXXXX) or with
 * country code (8801XXXXXXXX / +8801XXXXXXXX). Operator digit must be 3–9.
 */
export function isValidBdPhone(value: string): boolean {
  const digits = (value || "").replace(/\D/g, "");
  return /^(?:880)?0?1[3-9]\d{8}$/.test(digits);
}
