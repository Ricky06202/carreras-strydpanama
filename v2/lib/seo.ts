import type { Metadata } from "next";

/** Dominio canónico de producción (v1 vive aquí; v2 toma el relevo en el cutover). */
export const SITE_URL = "https://carreras.strydpanama.com";
export const SITE_NAME = "Stryd Panamá";
export const DEFAULT_OG_IMAGE = "/og-default.png";
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

export const DEFAULT_DESCRIPTION =
  "Carreras, cronometraje y comunidad de corredores en Panamá. Inscríbete en las próximas carreras, consulta podios y resultados oficiales de Stryd Panamá.";

/** Absolute URL for a path or pass-through for an already-absolute URL. */
export function absUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return new URL(pathOrUrl, SITE_URL).toString();
}

/**
 * Per-page head metadata: self-referencing canonical + Open Graph + Twitter card.
 * Relative image URLs resolve to absolute via the root metadataBase.
 */
export function pageMetadata(opts: {
  path: string;
  title?: string;
  description?: string;
  image?: string | null;
  imageAlt?: string;
  type?: "website" | "article";
}): Metadata {
  const url = absUrl(opts.path);
  const title = opts.title ?? "Carreras Stryd Panamá — inscripciones y cronometraje";
  const description = opts.description ?? DEFAULT_DESCRIPTION;
  const image = opts.image ?? DEFAULT_OG_IMAGE;
  const imageAlt = opts.imageAlt ?? `${SITE_NAME} — carreras y cronometraje en Panamá`;
  const images =
    opts.image
      ? [{ url: image, alt: imageAlt }]
      : [{ url: DEFAULT_OG_IMAGE, width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT, alt: imageAlt }];

  return {
    ...(opts.title ? { title: opts.title } : {}),
    ...(opts.description ? { description: opts.description } : {}),
    alternates: { canonical: opts.path },
    openGraph: {
      type: opts.type ?? "website",
      siteName: SITE_NAME,
      locale: "es_PA",
      url,
      title,
      description,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

/** ISO-8601 start datetime for schema.org Event (Panamá es UTC-5 todo el año). */
export function eventStartDate(date: string, startTime: string | null | undefined): string {
  const day = (date ?? "").slice(0, 10);
  if (!startTime) return day;
  const m = startTime.match(/^(\d{1,2})[:h](\d{2})?\s*(am|pm)?/i);
  if (!m) return day;
  let h = Number(m[1]);
  const min = m[2] ?? "00";
  const period = (m[3] ?? "").toLowerCase();
  if (period === "pm" && h < 12) h += 12;
  if (period === "am" && h === 12) h = 0;
  return `${day}T${String(h).padStart(2, "0")}:${min}:00-05:00`;
}

/** Organization + WebSite graph, emitted site-wide. */
export const ORGANIZATION_LD = {
  "@context": "https://schema.org",
  "@type": "SportsOrganization",
  "@id": `${SITE_URL}/#organization`,
  name: SITE_NAME,
  alternateName: "Carreras Stryd Panamá",
  url: `${SITE_URL}/`,
  logo: absUrl("/og-default.png"),
  email: "carreras@strydpanama.com",
  description:
    "Organización de carreras y cronometraje oficial en Panamá: inscripciones en línea, resultados y podios.",
  areaServed: { "@type": "Country", name: "Panamá" },
};

export const WEBSITE_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: "Carreras Stryd Panamá",
  url: `${SITE_URL}/`,
  inLanguage: "es-PA",
  publisher: { "@id": `${SITE_URL}/#organization` },
};

/** breadcrumbList helper: items of {name, path}. */
export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absUrl(it.path),
    })),
  };
}
