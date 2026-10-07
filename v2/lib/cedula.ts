// Cédula panameña — formato canónico con guiones, como la gente la distingue:
//   vieja:  D-NNN-NNNN  (7-8 dígitos, primer dígito = provincia; prefijo N/E para extranjeros)
//   nueva:  NNNNNNNN-D  (8 dígitos + dígito verificador, desde 2016)

/** Normaliza a formato canónico. Devuelve null si no parece una cédula válida. */
export function formatCedula(raw: string): string | null {
  let core = raw.toUpperCase().replace(/[^0-9A-Z]/g, "");
  if (core.length === 0 || core.length > 11) return null;
  const lead = /^[A-Z]/.test(core) ? core[0] : "";
  if (lead) core = core.slice(1);
  if (!/^\d{6,10}$/.test(core)) return null;
  if (lead) {
    // extranjero: la letra ocupa la posicion de provincia (N-123-4567)
    return `${lead}-${core.slice(0, 3)}-${core.slice(3)}`;
  }
  const body =
    core.length <= 8
      ? `${core[0]}-${core.slice(1, 4)}-${core.slice(4)}`
      : `${core.slice(0, 8)}-${core.slice(8)}`;
  return body;
}

/** Clave comparable sin guiones (para dedupe y búsquedas). */
export function cedulaKey(c: string): string {
  return c.toUpperCase().replace(/[^0-9A-Z]/g, "");
}

/** Teléfono: solo dígitos, sin código de país (Yappy exige 8 dígitos limpios). */
export function phoneDigits(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("507") && d.length > 8) d = d.slice(3);
  return d;
}
