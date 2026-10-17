import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    name: "carreras-strydpanama-v2",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-10-07",
    compatibilityFlags: ["nodejs_compat"],
    assets: { notFoundHandling: "none" },
    env: {
      ASSETS: bindings.assets(),
      DB: bindings.d1({ name: "carreras-v2-db", id: "2ed5a4d6-d368-4e50-8dbb-36fb7514d36f" }),
      MEDIA: bindings.r2({ name: "carreras-v2-media" }),
      YAPPY_MERCHANT_ID: bindings.text(""),
      GOOGLE_CLIENT_ID: bindings.text(""),
      GOOGLE_CLIENT_SECRET: bindings.text(""),
      RESEND_API_KEY: bindings.text(""),
      YAPPY_SECRET_KEY: bindings.text(""),
      YAPPY_URL_DOMAIN: bindings.text(""),
      // Cupos digitales (cNFT). Vacios = apagado; los secretos
      // (CNFT_WALLET_KEY, CNFT_TREASURY_SECRET) NUNCA van aqui en claro:
      // en produccion se ponen con "wrangler secret put". Ver docs/cupos-cnft.md.
      // Origen de las URLs absolutas de imagen (og:image). Apunta al host que
      // sirve esta rama: si queda vacio, cae al dominio de produccion y los
      // enlaces de staging se comparten SIN imagen (la imagen no existe alli).
      // CUTOVER: cambiar a "https://carreras.strydpanama.com" en el deploy de prod.
      SITE_URL: bindings.text("https://carreras-strydpanama-v2.ricardosanjur.workers.dev"),
      // RS ID (id.rsanjur.com): login SSO cross-domain (?volver= + /api/auth/canjear).
      // Vacios = el boton "Entrar con RS ID" no se muestra. El secreto de app
      // (RS_ID_MOD_SECRET = RS_ID_CANJE_SECRET del worker rs-id) va con wrangler secret put.
      ID_ORIGEN: bindings.text("https://id.rsanjur.com"),
      // Allowlist de la mesa: quien entra por RS ID con uno de estos correos ve el
      // panel. Debe ir en el MISMO orden/valores que settings.admin_emails en D1
      // (esa fila es la que decide dentro del panel; esta es la que deja pasar).
      RS_ID_PANEL_EMAILS: bindings.text("eysbel@gmail.com,ricardosanjurg@gmail.com,ricardosanjur@gmail.com,gerencia@ricardosanjur.com"),
      CNFT_RED: bindings.text(""),
      CNFT_MAINNET_OK: bindings.text(""),
      CNFT_TREE_ADDRESS: bindings.text(""),
      CNFT_PROVIDER: bindings.text("bubblegum"),
      // RS Pay (pay.rsanjur.com): cobro de inscripciones con el merchant Yappy de
      // carreras. "1" enciende el flujo; con cualquier otro valor el sitio usa el
      // Yappy directo de siempre. Las llaves del comercio `stryd-carreras`
      // (RS_PAY_API_KEY, RS_PAY_CALLBACK_SECRET) NUNCA van aqui:
      // se ponen con "wrangler secret put". Ver docs/rs-pay.md.
      // APAGADO hasta que el comercio `stryd-carreras` tenga las llaves Yappy
      // cargadas (yappy_merchant_id/token/url_domain/secret_key). Con "0" el cobro
      // va por Yappy directo, igual que v1.
      PAGO_RS_PAY: bindings.text("0"),
      RS_PAY_URL: bindings.text("https://pay.rsanjur.com"),
    },
  }),
});
