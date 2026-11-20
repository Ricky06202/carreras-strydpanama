export type PaymentMethodKey = 'yappy' | 'transfer' | 'preinscripcion' | 'cupon';

const PAYMENT_SETTINGS: Record<PaymentMethodKey, string> = {
  yappy: 'paymentYappyEnabled',
  transfer: 'paymentTransferEnabled',
  preinscripcion: 'paymentPreinscriptionEnabled',
  cupon: 'paymentCouponEnabled',
};

const isNotDisabled = (value: unknown) => value !== false && value !== 'false';

export const isWaitlistEnabled = (raceData: any) =>
  isNotDisabled(raceData?.waitlistEnabled);

export const getEnabledPaymentMethods = (raceData: any): PaymentMethodKey[] =>
  (Object.keys(PAYMENT_SETTINGS) as PaymentMethodKey[])
    .filter((method) => isNotDisabled(raceData?.[PAYMENT_SETTINGS[method]]));

export const isPaymentMethodEnabled = (raceData: any, method: PaymentMethodKey) =>
  getEnabledPaymentMethods(raceData).includes(method);

export const normalizePaymentMethod = (method: unknown): PaymentMethodKey | null => {
  const value = String(method || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  if (!value) return null;
  if (value.includes('yappy')) return 'yappy';
  if (value.includes('transfer')) return 'transfer';
  if (value.includes('preinscrip')) return 'preinscripcion';
  if (value.includes('cupon') || value.includes('boleto') || value === 'codigo' || value === 'code') return 'cupon';
  return null;
};

export const assertPaymentMethodEnabled = (raceData: any, method: unknown) => {
  const key = normalizePaymentMethod(method);
  if (!key) throw new Error('Método de pago no soportado para esta carrera.');
  if (!isPaymentMethodEnabled(raceData, key)) {
    const labels: Record<PaymentMethodKey, string> = {
      yappy: 'Yappy',
      transfer: 'Transferencia bancaria',
      preinscripcion: 'Preinscripción',
      cupon: 'Cupones y boletos',
    };
    throw new Error(`${labels[key]} no está habilitado para esta carrera.`);
  }
};
