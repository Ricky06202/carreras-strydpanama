export class YappyAPI {
  private static BASE_URL = 'https://apipagosbg.bgeneral.cloud';

  /**
   * Generates HMAC-SHA256 signature for Yappy
   */
  private static async sign(payload: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(payload);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    
    // Convert to Hex
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  static async getMerchantToken(env: any): Promise<string> {
    const merchantId = env.YAPPY_MERCHANT_ID;
    const secret = env.YAPPY_SECRET_KEY;
    const urlDomain = env.YAPPY_URL_DOMAIN; // Usar exacto como viene (ej: https://...)

    if (!merchantId || !urlDomain || !secret) {
      throw new Error('Faltan variables de entorno de Yappy (MERCHANT_ID, URL_DOMAIN, SECRET_KEY)');
    }

    // El manual indica que el dominio debe coincidir con lo registrado
    const payloadObj = { merchantId, urlDomain };
    const payloadStr = JSON.stringify(payloadObj);
    const signature = await this.sign(payloadStr, secret);

    const response = await fetch(`${this.BASE_URL}/payments/validate/merchant`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Yappy-Signature': signature,
        'X-Merchant-Id': merchantId
      },
      body: payloadStr
    });

    const data = await response.json();
    if (!response.ok || !data.token) {
       throw new Error(`Yappy Auth Error: ${data.message || data.code || 'Token inválido'}. Payload: ${payloadStr}`);
    }

    return data.token;
  }

  static async createYappyPayment(env: any, orderId: string, total: number, aliasYappy: string) {
    const merchantId = env.YAPPY_MERCHANT_ID;
    const secret = env.YAPPY_SECRET_KEY;
    const token = await this.getMerchantToken(env);

    // Formato estricto: string con 2 decimales
    const totalStr = total.toFixed(2);
    
    // Usar el dominio tal cual viene en la variable (permitiendo http:// o https://)
    const rawDomain = env.YAPPY_URL_DOMAIN;
    const baseUrl = rawDomain.includes('://') ? rawDomain : `https://${rawDomain}`;
    
    const payloadObj = {
      merchantId: merchantId,
      orderId: orderId,
      domain: baseUrl,
      aliasYappy: aliasYappy, 
      subtotal: totalStr,
      total: totalStr,
      successUrl: `${baseUrl.replace(/\/$/, '')}/registro/exito`,
      failUrl: `${baseUrl.replace(/\/$/, '')}/registro/error`,
      ipnUrl: `${baseUrl.replace(/\/$/, '')}/api/yappy/webhook`
    };

    const payloadStr = JSON.stringify(payloadObj);
    const signature = await this.sign(payloadStr, secret);

    const response = await fetch(`${this.BASE_URL}/payments/payment-wc`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Yappy-Signature': signature
      },
      body: payloadStr
    });

    const data = await response.json();
    if (!response.ok || !data.transactionId) {
      throw new Error(`Yappy Payment Error: ${data.message || data.code || 'Error en validación'}`);
    }

    return data;
  }
}
