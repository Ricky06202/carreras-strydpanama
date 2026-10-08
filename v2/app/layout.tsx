import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { SmoothScroll } from "@/components/site/SmoothScroll";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";

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
  metadataBase: new URL("https://carreras.strydpanama.com"),
  title: {
    default: "Carreras Stryd Panamá — inscripciones y cronometraje",
    template: "%s · Stryd Panamá",
  },
  description:
    "Carreras, cronometraje y comunidad de corredores en Panamá. Inscríbete, consulta podios y resultados oficiales de Stryd Panamá.",
  keywords: ["carreras Panamá", "running Panamá", "cronometraje", "inscripciones carreras", "stryd panama", "10K", "media maratón"],
  openGraph: {
    type: "website",
    siteName: "Stryd Panamá",
    locale: "es_PA",
    url: "/",
    title: "Carreras Stryd Panamá",
    description: "Inscripciones, cronometraje y resultados de carreras en Panamá.",
  },
  twitter: {
    card: "summary",
    title: "Carreras Stryd Panamá",
    description: "Inscripciones, cronometraje y resultados de carreras en Panamá.",
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
      </body>
    </html>
  );
}
