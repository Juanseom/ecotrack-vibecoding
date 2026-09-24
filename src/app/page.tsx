import Link from "next/link";

import { EcoTrackApp } from "@/components/EcoTrackApp";
import { LeafMark } from "@/components/LeafMark";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 py-6 sm:px-8 sm:py-10">
      <header className="flex items-center justify-between gap-4 border-b border-dashed border-ink/20 pb-5">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-sm"
          aria-label="EcoTrack AI, inicio"
        >
          <LeafMark className="h-8 w-8 shrink-0" />
          <span className="font-display text-2xl font-semibold tracking-tight text-ink">
            EcoTrack
          </span>
          <span className="rounded-sm bg-signal px-1.5 py-0.5 font-mono text-[0.7rem] font-medium uppercase tracking-widest text-ink">
            AI
          </span>
        </Link>
        <p className="hidden font-mono text-xs uppercase tracking-widest text-ink-soft sm:block">
          Cuaderno de campo · Nº 001
        </p>
      </header>

      <main className="flex flex-1 flex-col gap-10 py-10 sm:gap-12 sm:py-14">
        <section aria-labelledby="lema" className="flex max-w-3xl flex-col gap-5">
          <p className="font-mono text-xs uppercase tracking-widest text-moss">
            Huella de carbono para pequeños negocios
          </p>
          <h1
            id="lema"
            className="font-display text-4xl font-medium leading-[1.08] tracking-tight text-ink sm:text-6xl"
          >
            Cuéntanos tu día.
            <br />
            <span className="italic text-moss">Te devolvemos tu huella.</span>
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
            Escribe con tus palabras lo que usó tu negocio hoy —la luz, el gas,
            los repartos— y te devolvemos una estimación en kg CO₂e, con cada
            paso del cálculo a la vista.
          </p>
        </section>

        <EcoTrackApp />
      </main>

      <footer className="border-t border-dashed border-ink/20 pt-4 font-mono text-[0.7rem] uppercase tracking-widest text-ink-soft">
        <p className="flex flex-wrap justify-between gap-x-4 gap-y-1">
          <span>Estimación, no medición</span>
          <span>Factores referenciales · kg CO₂e</span>
        </p>
      </footer>
    </div>
  );
}
