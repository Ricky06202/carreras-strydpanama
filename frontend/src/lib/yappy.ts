export class YappyAPI {
  private static BASE_URL = 'https://apipagosbg.bgeneral.cloud';

  static async getMerchantToken(env: any): Promise<string> {
    const merchantId = env.YAPPY_MERCHANT_ID;
    const urlDomain = env.YAPPY_URL_DOMAIN;

    if (!merchantId || !urlDomain) {
      throw new Error('Faltan variables de entorno de Yappy (YAPPY_MERCHANT_ID, YAPPY_URL_DOMAIN)');
    }

    const payload = {
      merchantId: merchantId,
      urlDomain: urlDomain
    };

    const response = await fetch(`${this.BASE_URL}/payments/validate/merchant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok || !data.token) {
       throw new Error(`Yappy Auth Error: ${data.message || data.code || 'Token inválido'}`);
    }

    return data.token;
  }

  static async createYappyPayment(env: any, orderId: string, total: number, aliasYappy: string) {
    const merchantId = env.YAPPY_MERCHANT_ID;
    const urlDomain = env.YAPPY_URL_DOMAIN;
    const token = await this.getMerchantToken(env);

    // Ensure strict format: 2 decimal places as a string
    const subtotalStr = total.toFixed(2);
    
    const baseUrl = `https://${urlDomain}`;
    
    const payload = {
      merchantId: merchantId,
      orderId: orderId,
      domain: baseUrl,
      aliasYappy: aliasYappy, 
      subtotal: subtotalStr,
      total: subtotalStr,
      successUrl: `${baseUrl}/registro/exito`,
      failUrl: `${baseUrl}/registro/error`,
      ipnUrl: `${baseUrl}/api/yappy/webhook`
    };

    const response = await fetch(`${this.BASE_URL}/payments/payment-wc`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok || !data.transactionId) {
      throw new Error(`Yappy Payment Error: ${data.message || data.code || 'Error en validación'}`);
    }

    return data;
  }
}
