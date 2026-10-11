type JsonLdData = Record<string, unknown> | Record<string, unknown>[];

/** Inline JSON-LD structured data (RSC-safe). */
export function JsonLd({ data }: { data: JsonLdData }) {
  return (
    <script
      type="application/ld+json"
      // Serializado por nosotros; no hay entrada de usuario sin escapar aquí.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
