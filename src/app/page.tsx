import Link from "next/link";

import { EcoTrackApp } from "@/components/EcoTrackApp";
import { LeafMark } from "@/components/LeafMark";
import { Methodology } from "@/components/Methodology";

const REPO_URL = "https://github.com/Juanseom/ecotrack-vibecoding";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 py-6 sm:px-8 sm:py-10">
      <header className="flex items-center justify-between gap-4 pb-5">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-sm"
          aria-label="EcoTrack AI, inicio"
        >
          <LeafMark className="h-8 w-8 shrink-0" />
          <span className="font-display text-2xl font-semibold tracking-tight text-ink">
            EcoTrack
          </span>
          <span className="rounded-sm border border-moss/40 px-1.5 py-px font-mono text-[0.65rem] font-medium uppercase tracking-widest text-moss">
            AI
          </span>
        </Link>
        <p className="section-label hidden sm:block">
          Cuaderno de campo · Nº 001
        </p>
      </header>
      <div aria-hidden="true" className="dotted-rule" />

      <main className="flex flex-1 flex-col gap-10 py-10 sm:gap-12 sm:py-14">
        <section aria-labelledby="lema" className="flex max-w-3xl flex-col gap-5">
          <p className="section-label">
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

        <Methodology />
      </main>

      <footer className="flex flex-col gap-3 pt-2">
        <div aria-hidden="true" className="dotted-rule" />
        <p className="section-label flex flex-wrap justify-between gap-x-4 gap-y-2">
          <span>Estimación, no medición · kg CO₂e</span>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-sm underline decoration-ink/25 underline-offset-4 hover:text-ink hover:decoration-ink/60"
          >
            Código en GitHub<span className="sr-only"> (se abre en otra pestaña)</span>
          </a>
        </p>
      </footer>
    </div>
  );
}
