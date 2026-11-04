// Turkish mobile numbers, stored as 05XXXXXXXXX so "0532 111 22 33", "+90 532 111 2233"
// and "5321112233" are the same customer.

export function normalizePhone(input: string) {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("0090")) digits = digits.slice(4);
  else if (digits.startsWith("90") && digits.length === 12) digits = digits.slice(2);
  if (digits.length === 10) digits = `0${digits}`;
  return digits;
}

export const isValidPhone = (input: string) => /^0\d{10}$/.test(normalizePhone(input));

/** "05321112233" → "0532 111 22 33" */
export function formatPhone(input: string) {
  const d = normalizePhone(input);
  return d.length === 11 ? `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9)}` : input;
}

/** wa.me wants the international number without + */
export const whatsappNumber = (input: string) => `90${normalizePhone(input).slice(1)}`;
