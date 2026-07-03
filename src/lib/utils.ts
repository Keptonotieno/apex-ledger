/**
 * Centralized currency formatting utility function to consistently display
 * monetary values in Kenyan Shillings (KSh) with standard comma separators.
 */
export function formatKSh(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) {
    return 'KSh 0';
  }
  
  const numericVal = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numericVal)) {
    return 'KSh 0';
  }

  // Format with thousand separators (comma) and no decimal places for clean integer-like display
  // unless there is a fractional part, in which case we display up to 2 decimals.
  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return `KSh ${formatter.format(numericVal)}`;
}
