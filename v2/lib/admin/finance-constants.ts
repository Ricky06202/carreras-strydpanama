// Constantes y tipos sin dependencias de servidor: los puede importar un
// componente cliente sin arrastrar lib/db (cloudflare:workers) al bundle.
export const EXPENSE_CATEGORIES = [
  "Producción y Logística de Carrera",
  "Transferencias al Organizador",
  "Premiación y Trofeos",
  "Marketing y Publicidad",
  "Personal y Servicios",
  "Otros",
] as const;

export const EXPENSE_METHODS = ["Yappy", "Transferencia", "Efectivo", "Cheque", "Otro"] as const;

export type AdminExpense = {
  id: string;
  title: string;
  beneficiary: string;
  amount: number;
  payDate: string;
  category: string;
  method: string;
  reference: string;
  notes: string;
  createdAt: string;
};

export type FinanceStats = {
  recaudado: number;
  salientes: number;
  saldo: number;
  confirmados: number;
  pendientes: number;
};
