import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    name: "v2",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-10-07",
    compatibilityFlags: ["nodejs_compat"],
    assets: { notFoundHandling: "none" },
    env: {
      ASSETS: bindings.assets(),
      DB: bindings.d1({ name: "carreras-v2-db", id: "2ed5a4d6-d368-4e50-8dbb-36fb7514d36f" }),
      MEDIA: bindings.r2({ name: "carreras-v2-media" }),
    },
  }),
});
