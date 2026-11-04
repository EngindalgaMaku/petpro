// CSV for Excel in Turkish locale: ";" separators, UTF-8 BOM so ç/ğ/ş open correctly.

/**
 * One quoted cell. Text starting with = + - @ (or tab/CR) would run as a formula in Excel
 * (CSV injection, e.g. a customer named "=HYPERLINK(…)"), so it is prefixed with an apostrophe.
 * Plain numbers and phone numbers ("+90 532 111 22 33", "-150") are left as they are.
 */
export function csvCell(value: unknown): string {
  let text = String(value ?? "");
  const looksNumeric = /^[+-][\d\s().,]+$/.test(text);
  if (/^[=+\-@\t\r]/.test(text) && !looksNumeric) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(csvCell).join(";"), ...rows.map((row) => row.map(csvCell).join(";"))];
  return "\uFEFF" + lines.join("\r\n");
}
