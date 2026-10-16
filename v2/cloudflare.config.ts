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
      SITE_URL: bindings.text(""),
      // RS ID (id.rsanjur.com): login SSO cross-domain (?volver= + /api/auth/canjear).
      // Vacios = el boton "Entrar con RS ID" no se muestra. El secreto de app
      // (RS_ID_MOD_SECRET = RS_ID_CANJE_SECRET del worker rs-id) va con wrangler secret put.
      ID_ORIGEN: bindings.text("https://id.rsanjur.com"),
      RS_ID_PANEL_EMAILS: bindings.text(""),
      CNFT_RED: bindings.text(""),
      CNFT_MAINNET_OK: bindings.text(""),
      CNFT_TREE_ADDRESS: bindings.text(""),
      CNFT_PROVIDER: bindings.text("bubblegum"),
    },
  }),
});
