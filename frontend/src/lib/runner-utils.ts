export function parseSafe<T>(str: string, fallback: T): T {
  try { return str ? JSON.parse(str) : fallback; } catch { return fallback; }
}

export const flagMap: Record<string, string> = {
  'Panamá': '🇵🇦', 'Costa Rica': '🇨🇷', 'Colombia': '🇨🇴', 'Venezuela': '🇻🇪',
  'Estados Unidos': '🇺🇸', 'México': '🇲🇽', 'Argentina': '🇦🇷', 'España': '🇪🇸',
  'Chile': '🇨🇱', 'Perú': '🇵🇪', 'Ecuador': '🇪🇨', 'Guatemala': '🇬🇹',
  'Honduras': '🇭🇳', 'Nicaragua': '🇳🇮', 'El Salvador': '🇸🇻', 'Brasil': '🇧🇷',
  'Uruguay': '🇺🇾', 'Paraguay': '🇵🇾', 'Bolivia': '🇧🇴', 'Canadá': '🇨🇦',
};
