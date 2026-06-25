import { ShieldCheck, ScrollText, Cpu } from "lucide-react"

const cards = [
  {
    icon: ShieldCheck,
    title: "Confidence-based governance",
    body: "When a match is genuinely ambiguous, it is escalated for human review rather than silently forced. The 0.15–0.75 confidence band routes uncertain calls to a person, so the pipeline never fakes certainty it does not have.",
    tag: "0.15 – 0.75 review band",
  },
  {
    icon: ScrollText,
    title: "Full reasoning capture",
    body: "Every agent's input, reasoning, and output is logged to a structured trace. There is no black box: you can replay exactly what each agent saw and why it decided the way it did.",
    tag: "input · reasoning · output",
  },
  {
    icon: Cpu,
    title: "Real model output",
    body: "All reasoning shown in the dashboard was captured from actual runs against live data. Nothing is hand-written or mocked, what you see is what the models produced.",
    tag: "captured from live runs",
  },
]

export function Credibility() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="max-w-2xl">
          <p className="font-mono text-sm text-primary">Why it&apos;s credible</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            Built to be audited, not just trusted.
          </h2>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {cards.map((card) => (
            <div
              key={card.title}
              className="flex flex-col rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary/40"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-primary">
                <card.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-medium">{card.title}</h3>
              <p className="mt-3 flex-1 text-pretty text-sm leading-relaxed text-muted-foreground">{card.body}</p>
              <span className="mt-5 inline-flex w-fit rounded-full border border-border bg-background px-3 py-1 font-mono text-xs text-muted-foreground">
                {card.tag}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
