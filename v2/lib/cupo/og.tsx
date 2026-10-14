// Tarjeta OG dinamica del cupo (1200x630) — la que se ve al compartir el link
// en WhatsApp/Instagram/X. Se dibuja con JSX -> satori -> resvg WASM (via
// next/og de vinext, que ya trae las piezas de @vercel/og para workerd).
//
// Identidad: fondo oscuro con el degradado de la marca (azul -> cyan -> violeta),
// tipografia de marca (Space Grotesk / JetBrains Mono) y el nombre del atleta
// como protagonista.
import { ImageResponse } from "next/og";
import type { CupoPublic } from "@/lib/cnft/issue";
import { OG_FONT_JBM_400, OG_FONT_SG_500, OG_FONT_SG_700 } from "./og-fonts";
import { qrSvg } from "./qr";

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

// Degradado de marca (mismo del logo rsanjur).
const BRAND = "linear-gradient(115deg, #2563EB 0%, #06B6D4 55%, #8B5CF6 100%)";

function b64ToArrayBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

function base64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** Fecha corta es-PA sin depender de Intl: "15 nov 2026". */
function fechaCorta(fecha: string | null | undefined): string {
  const raw = (fecha ?? "").slice(0, 10);
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return raw || "";
  const [, y, mo, d] = m;
  const mes = MESES[Number(mo) - 1] ?? mo;
  return `${Number(d)} ${mes} ${y}`;
}

function estadoSello(status: string | undefined, mock: boolean | undefined): { label: string; bg: string; ring: string; fg: string } {
  if (status === "minted" && !mock) return { label: "Verificado en cadena", bg: "rgba(16,185,129,0.16)", ring: "rgba(52,211,153,0.45)", fg: "#6EE7B7" };
  if (status === "minted") return { label: "Simulado (devnet)", bg: "rgba(245,158,11,0.16)", ring: "rgba(251,191,36,0.45)", fg: "#FCD34D" };
  if (status === "error") return { label: "Pendiente de reintento", bg: "rgba(239,68,68,0.16)", ring: "rgba(248,113,113,0.45)", fg: "#FCA5A5" };
  if (status === "pending") return { label: "Emitiendo…", bg: "rgba(14,165,233,0.16)", ring: "rgba(56,189,248,0.45)", fg: "#7DD3FC" };
  return { label: "Cupo no emitido", bg: "rgba(255,255,255,0.08)", ring: "rgba(255,255,255,0.18)", fg: "#B4B4B8" };
}

export interface CupoOgInput extends CupoPublic {
  verifyUrl: string;
  siteHost: string;
}

/** Elemento de la tarjeta (separado para poder probarlo con satori directo). */
export function cupoOgElement(cupo: CupoOgInput) {
  const sello = estadoSello(cupo.status, cupo.mock);
  const nombre = (cupo.athlete ?? "Atleta").trim() || "Atleta";
  const carrera = (cupo.raceTitle ?? "").trim();
  const fecha = fechaCorta(cupo.raceDate);
  const modalidad = (cupo.distance ?? "").trim();
  const categoria = (cupo.category ?? "").trim();
  const dorsal = cupo.bibNumber != null ? `#${cupo.bibNumber}` : "—";
  const qr = qrSvg(cupo.verifyUrl, { size: 240, margin: 2, ecl: "M", dark: "#05060B", light: "#FFFFFF" });
  const qrUri = `data:image/svg+xml;base64,${base64Utf8(qr)}`;

  const chips = [modalidad, categoria].filter(Boolean);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        backgroundColor: "#05060B",
        fontFamily: "Space Grotesk",
        color: "#F5F5F7",
      }}
    >
      {/* halo de marca */}
      <div
        style={{
          position: "absolute",
          top: -180,
          left: -120,
          width: 820,
          height: 820,
          borderRadius: 9999,
          background: "radial-gradient(circle, rgba(37,99,235,0.42) 0%, rgba(5,6,11,0) 68%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -300,
          right: -160,
          width: 900,
          height: 900,
          borderRadius: 9999,
          background: "radial-gradient(circle, rgba(139,92,246,0.34) 0%, rgba(5,6,11,0) 66%)",
        }}
      />
      <div style={{ position: "absolute", top: -260, right: 220, width: 620, height: 620, borderRadius: 9999, background: "radial-gradient(circle, rgba(6,182,212,0.30) 0%, rgba(5,6,11,0) 70%)" }} />

      {/* barra superior con el degradado de marca */}
      <div style={{ display: "flex", width: "100%", height: 10, background: BRAND }} />

      <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "48px 56px 40px", position: "relative" }}>
        {/* cabecera */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 56, height: 56, borderRadius: 16, background: BRAND, color: "#FFFFFF", fontSize: 26, fontWeight: 700, letterSpacing: -1 }}>
              RS
            </div>
            <div style={{ display: "flex", flexDirection: "column", marginLeft: 16 }}>
              <div style={{ display: "flex", fontSize: 24, fontWeight: 700, letterSpacing: -0.5 }}>rsanjur</div>
              <div style={{ display: "flex", fontSize: 15, color: "#8A8A8E", fontFamily: "JetBrains Mono" }}>cupo digital</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", padding: "12px 22px", borderRadius: 9999, background: sello.bg, border: `1px solid ${sello.ring}`, color: sello.fg, fontSize: 21, fontWeight: 500 }}>
            {sello.label}
          </div>
        </div>

        {/* cuerpo */}
        <div style={{ display: "flex", flex: 1, alignItems: "center", marginTop: 26 }}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, paddingRight: 40 }}>
            <div style={{ display: "flex", fontSize: 17, letterSpacing: 3, textTransform: "uppercase", color: "#8A8A8E", fontFamily: "JetBrains Mono" }}>
              Este cupo pertenece a
            </div>
            <div style={{ display: "flex", marginTop: 14, fontSize: nombre.length > 22 ? 60 : nombre.length > 14 ? 74 : 86, fontWeight: 700, lineHeight: 1.02, letterSpacing: -2.5, color: "#FFFFFF", maxWidth: 720 }}>
              {nombre}
            </div>
            <div style={{ display: "flex", marginTop: 18, fontSize: 30, fontWeight: 500, color: "#E4E4E7", maxWidth: 720 }}>
              {carrera || "Carrera"}
            </div>
            <div style={{ display: "flex", marginTop: 6, fontSize: 24, color: "#B4B4B8", maxWidth: 720 }}>
              {fecha}
            </div>

            <div style={{ display: "flex", alignItems: "center", marginTop: 26 }}>
              {chips.map((c) => (
                <div key={c} style={{ display: "flex", marginRight: 12, padding: "8px 18px", borderRadius: 9999, border: "1px solid rgba(255,255,255,0.14)", color: "#F5F5F7", fontSize: 20 }}>
                  {c}
                </div>
              ))}
              <div style={{ display: "flex", alignItems: "center", padding: "8px 20px", borderRadius: 9999, background: BRAND, color: "#FFFFFF", fontSize: 22, fontWeight: 700 }}>
                Dorsal {dorsal}
              </div>
            </div>
          </div>

          {/* QR hacia la pagina de verificacion */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 300 }}>
            <div style={{ display: "flex", padding: 16, borderRadius: 26, background: "#FFFFFF" }}>
              <img src={qrUri} width={232} height={232} alt="QR de verificacion" />
            </div>
            <div style={{ display: "flex", marginTop: 14, fontSize: 18, color: "#B4B4B8", fontFamily: "JetBrains Mono" }}>
              Escanea para verificar
            </div>
          </div>
        </div>

        {/* pie */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 18, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.10)" }}>
          <div style={{ display: "flex", fontSize: 18, color: "#8A8A8E" }}>
            Personal y no transferible · prueba de propiedad en la cadena
          </div>
          <div style={{ display: "flex", fontSize: 18, color: "#8A8A8E", fontFamily: "JetBrains Mono" }}>
            {cupo.siteHost}
          </div>
        </div>
      </div>
    </div>
  );
}

/** PNG de la tarjeta (ImageResponse). */
export function renderCupoOg(cupo: CupoOgInput): ImageResponse {
  return new ImageResponse(cupoOgElement(cupo), {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    fonts: [
      { name: "Space Grotesk", data: b64ToArrayBuffer(OG_FONT_SG_500), weight: 500, style: "normal" },
      { name: "Space Grotesk", data: b64ToArrayBuffer(OG_FONT_SG_700), weight: 700, style: "normal" },
      { name: "JetBrains Mono", data: b64ToArrayBuffer(OG_FONT_JBM_400), weight: 400, style: "normal" },
    ],
  });
}
