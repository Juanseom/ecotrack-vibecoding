const STEPS = [
  {
    title: "Escribe tu día",
    body: "Como se lo contarías a alguien: la luz, el gas, los repartos, la basura. Sin formularios.",
  },
  {
    title: "Eco lo interpreta y calcula",
    body: "La IA entiende tu texto; el cálculo lo hace nuestro código con factores de emisión referenciales.",
  },
  {
    title: "Recibe tu recibo de carbono",
    body: "Cada línea muestra lo que dijiste, lo que se supuso y la operación. Más tres ideas para mejorar.",
  },
];

/** Estado vacío: cómo funciona, en tres pasos. */
export function HowItWorks() {
  return (
    <section aria-labelledby="how-title" className="flex flex-col gap-4">
      <h2 id="how-title" className="font-mono text-xs uppercase tracking-widest text-ink-soft">
        Cómo funciona
      </h2>
      <ol className="grid gap-4 sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <li
            key={step.title}
            className="flex flex-col gap-2 border-t border-dashed border-ink/25 pt-4"
          >
            <span
              aria-hidden="true"
              className="font-display text-3xl font-medium italic leading-none text-moss"
            >
              {index + 1}.
            </span>
            <h3 className="text-base font-semibold text-ink">{step.title}</h3>
            <p className="text-sm leading-relaxed text-ink-soft">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
