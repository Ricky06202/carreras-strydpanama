import { HeroV2 } from "@/components/effects/HeroV2";

export default function Home() {
  return (
    <>
      <HeroV2 />
      <section className="border-t border-hairline bg-abyss">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <p className="font-mono text-sm text-mist">
            // v2 en construcción — fases F0–F7 en docs/PLAN-V2.md
          </p>
        </div>
      </section>
    </>
  );
}
