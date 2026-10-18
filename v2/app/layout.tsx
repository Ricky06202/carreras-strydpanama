import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { SmoothScroll } from "@/components/site/SmoothScroll";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_WIDTH,
  ORGANIZATION_LD,
  SITE_NAME,
  SITE_URL,
  WEBSITE_LD,
} from "@/lib/seo";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Carreras Stryd Panamá — inscripciones y cronometraje",
    template: "%s · Stryd Panamá",
  },
  description: DEFAULT_DESCRIPTION,
  keywords: ["carreras Panamá", "running Panamá", "cronometraje", "inscripciones carreras", "stryd panama", "10K", "media maratón"],
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "es_PA",
    url: "/",
    title: "Carreras Stryd Panamá",
    description: "Inscripciones, cronometraje y resultados de carreras en Panamá.",
    images: [
      { url: DEFAULT_OG_IMAGE, width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT, alt: `${SITE_NAME} — carreras y cronometraje en Panamá` },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Carreras Stryd Panamá",
    description: "Inscripciones, cronometraje y resultados de carreras en Panamá.",
    images: [DEFAULT_OG_IMAGE],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-PA" className={`${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-void text-snow">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-stryd focus:px-4 focus:py-2 focus:font-semibold focus:text-black"
        >
          Saltar al contenido
        </a>
        <SmoothScroll />
        <Nav />
        <main id="contenido">{children}</main>
        <Footer />
        <JsonLd data={[ORGANIZATION_LD, WEBSITE_LD]} />
        {/* "Tu perfil": el chip lo dibuja el modulo (sesion.js), igual en todos los
            sitios de rsanjur. Sin sesion no dibuja nada. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'window.RSID_MENU={cosas:[{t:"Mi portal",u:"/mi-portal",i:"pedido"},{t:"Mi cupo",u:"/mi-cupo",i:"perfil"}]};',
          }}
        />
        <script src="https://pay.rsanjur.com/sesion.js" defer />
      </body>
    </html>
  );
}
