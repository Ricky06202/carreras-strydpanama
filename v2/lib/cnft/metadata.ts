// Metadata del cupo digital (estandar Metaplex, el que entienden wallets/exploradores).
// Solo datos reales: nombre/simbolo derivados de la carrera, fecha, distancia,
// categoria, dorsal, atleta y el credito "creado por rsanjur.com" con enlaces.

/** Cuenta "casa" de rsanjur (del dueno): aparece como creadora en cada cupo.
 *  Su llave NO vive en el sistema: es solo la firma publica que identifica la casa. */
export const CASA_RSANJUR = "HeqLYZRnZqDszE2GQUftdLQ4FimQsT1LGK4CVMYnJn9S";
export interface TicketMetadataInput {
  network: "devnet" | "mainnet" | "mock";
  registrationId: string;
  confirmationCode: string;
  raceTitle: string;
  raceDate: string; // YYYY-MM-DD
  raceSlug: string;
  distanceTitle: string | null;
  categoryTitle: string | null;
  bibNumber: number | null;
  athleteName: string;
  athleteAlias?: string | null;
  athletePublic?: boolean;
  imageUrl: string | null;
  siteUrl: string;
  cupoIndex?: number | null;
  cupoTotal?: number | null;
  nonTransferable?: boolean;
  issuer?: string | null;
  createdAt: string;
}

export interface TicketMetadata {
  name: string;
  symbol: string;
  description: string;
  image?: string;
  external_url: string;
  attributes: { trait_type: string; value: string | number }[];
  properties: {
    category: string;
    files: { uri: string; type: string }[];
    creators: { address: string; share: number; verified?: boolean }[];
    non_transferable?: boolean;
  };
  rsanjur: {
    creado_por: string;
    url: string;
    carrera: string;
    verificar: string;
  };
}

/** Simbolo derivado del titulo de la carrera (sin inventar datos). */
export function raceSymbol(title: string): string {
  const clean = (title || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const words = clean
    .split(/[^A-Za-z0-9]+/)
    .filter((w) => w && !/^(de|del|la|el|los|las|y|the)$/i.test(w));
  const acronym = words.map((w) => w.charAt(0)).join("").toUpperCase();
  const base = acronym.length >= 2 ? acronym : (words[0] ?? "STRYD").slice(0, 6).toUpperCase();
  return base.slice(0, 10);
}

function athleteLabel(input: TicketMetadataInput): string {
  if (input.athleteAlias) return input.athleteAlias.startsWith("@") ? input.athleteAlias : `@${input.athleteAlias}`;
  if (input.athletePublic === false) {
    return input.athleteName
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => `${p.charAt(0).toUpperCase()}.`)
      .join(" ");
  }
  return input.athleteName;
}

export function buildTicketMetadata(input: TicketMetadataInput): TicketMetadata {
  const site = input.siteUrl.replace(/\/+$/, "");
  const publicUrl = `${site}/mi-cupo/${input.registrationId}`;
  const verifyUrl = `${site}/verificar/${input.registrationId}`;
  const symbol = raceSymbol(input.raceTitle);
  const cupo = input.bibNumber != null ? `#${input.bibNumber}` : input.confirmationCode;
  const name = `Cupo ${cupo} · ${input.raceTitle}`.slice(0, 100);

  const attributes: { trait_type: string; value: string | number }[] = [
    { trait_type: "Carrera", value: input.raceTitle },
    { trait_type: "Fecha", value: input.raceDate },
  ];
  if (input.distanceTitle) attributes.push({ trait_type: "Distancia", value: input.distanceTitle });
  if (input.categoryTitle) attributes.push({ trait_type: "Categoria", value: input.categoryTitle });
  if (input.bibNumber != null) attributes.push({ trait_type: "Dorsal", value: input.bibNumber });
  attributes.push({ trait_type: "Atleta", value: athleteLabel(input) });
  if (input.cupoIndex != null) attributes.push({ trait_type: "Cupo", value: input.cupoIndex });
  if (input.cupoTotal != null) attributes.push({ trait_type: "Cupos de la edicion", value: input.cupoTotal });
  attributes.push({ trait_type: "Edicion", value: input.raceDate.slice(0, 4) });
  attributes.push({ trait_type: "Transferible", value: input.nonTransferable === false ? "Si" : "No (personal)" });
  attributes.push({ trait_type: "Red", value: input.network });

  const description = [
    `Cupo digital verificado de ${input.raceTitle}.`,
    `Atleta: ${athleteLabel(input)}. Dorsal: ${input.bibNumber ?? "por asignar"}.`,
    `Codigo de confirmacion: ${input.confirmationCode}.`,
    "Este cupo es personal y no transferible: vive en la cadena, no es una captura de pantalla.",
    "Creado por rsanjur.com",
  ].join(" ");

  const meta: TicketMetadata = {
    name,
    symbol,
    description,
    external_url: publicUrl,
    attributes,
    properties: {
      category: "image",
      files: input.imageUrl ? [{ uri: input.imageUrl, type: "image/*" }] : [],
      creators: [{ address: input.issuer ?? CASA_RSANJUR, share: 100, verified: false }],
      non_transferable: input.nonTransferable !== false,
    },
    rsanjur: {
      creado_por: "rsanjur.com",
      url: "https://rsanjur.com",
      carrera: `${site}/carrera/${input.raceSlug}`,
      verificar: verifyUrl,
    },
  };
  if (input.imageUrl) meta.image = input.imageUrl;
  return meta;
}
