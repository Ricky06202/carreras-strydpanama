// Teléfonos de Panamá: 8 dígitos; celular empieza con 6, fijo con 2-9.
export function normalizePanamaPhone(raw: string): string | null {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('507')) digits = digits.slice(3);
  if (digits.length !== 8) return null;
  if (!/^[2-9]/.test(digits)) return null;
  return digits;
}

export function isValidPanamaPhone(raw: string): boolean {
  return normalizePanamaPhone(raw) !== null;
}

// Yappy solo funciona con celular panameño (empieza con 6)
export function isYappyMobilePhone(raw: string): boolean {
  const d = normalizePanamaPhone(raw);
  return !!d && d.startsWith('6');
}

export function formatPanamaPhone(value: string): string {
  const d = normalizePanamaPhone(value);
  return d ? `${d.slice(0, 4)}-${d.slice(4)}` : value;
}
