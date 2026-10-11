import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        // /api/images/ aloja los afiches que también son og:image de las carreras:
        // regla más específica (más larga) que gana sobre "Disallow: /api/" en Google.
        allow: ["/", "/api/images/"],
        disallow: ["/api/", "/admin/", "/mi-portal/", "/entrar", "/lab"],
      },
    ],
    sitemap: "https://carreras.strydpanama.com/sitemap.xml",
    host: "https://carreras.strydpanama.com",
  };
}
