import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getRaceBySlug } from "@/lib/db/queries";
import { formatDateEs, raceImageUrl } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";
import { RegistrationWizard } from "@/components/registration/RegistrationWizard";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const race = await getRaceBySlug(slug);
  if (!race) return { title: "Inscripción", robots: { index: false, follow: false } };
  return {
    ...pageMetadata({
      path: `/carrera/${race.slug}/inscribirse`,
      title: `Inscríbete — ${race.title}`,
      description: `Formulario de inscripción para ${race.title}. Cupos, modalidades y pago en línea.`,
      image: raceImageUrl(race.imageUrl),
    }),
    // Embudo transaccional (wizard cliente): fuera del índice para no indexar un shell.
    robots: { index: false, follow: true },
  };
}

export default async function RegisterPage({ params }: Props) {
  const { slug } = await params;
  const race = await getRaceBySlug(slug);
  if (!race) notFound();
  if (race.status !== "accepting" || race.distances.length === 0) {
    redirect(`/carrera/${slug}`);
  }

  return (
    <section className="bg-void min-h-screen">
      <RegistrationWizard
        race={{
          slug: race.slug,
          title: race.title,
          dateLabel: formatDateEs(race.date),
          price: race.price,
          platformFee: race.platformFee ?? 0,
          showShirtSize: race.showShirtSize,
          maxParticipants: race.maxParticipants,
          distances: race.distances,
          categories: race.categories,
          termsUrl: `/carrera/${race.slug}#terminos`,
          hasEventTerms: !!race.termsAndConditions?.trim(),
        }}
      />
    </section>
  );
}
