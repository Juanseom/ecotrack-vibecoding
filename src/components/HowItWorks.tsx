const STEPS = [
  {
    title: "Escribe tu día",
    body: "Como se lo contarías a alguien: la luz, el gas, los repartos, la basura. Sin formularios.",
  },
  {
    title: "Eco lo interpreta y calcula",
    body: "Eco lee tu texto —con IA cuando está disponible, o con reglas simples si no— y nuestro código hace el cálculo con factores de emisión referenciales.",
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
      <h2 id="how-title" className="section-label">
        Cómo funciona
      </h2>
      <ol className="grid gap-6 sm:grid-cols-3 sm:gap-8">
        {STEPS.map((step, index) => (
          <li
            key={step.title}
            className="relative flex flex-col gap-2 pt-4"
          >
            <span aria-hidden="true" className="dotted-rule absolute inset-x-0 top-0" />
            <span
              aria-hidden="true"
              className="font-display text-2xl font-medium italic leading-none text-moss"
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
