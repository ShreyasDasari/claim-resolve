import { ArrowRight, UserCheck } from "lucide-react"

const carriers = [
  {
    name: "Carrier A",
    schema: "claimants.csv",
    fields: [
      { k: "full_name", v: "Jonathan R. Meyer" },
      { k: "dob", v: "1984-03-12" },
      { k: "policy_no", v: "A-99231" },
    ],
  },
  {
    name: "Carrier B",
    schema: "policyholders.json",
    fields: [
      { k: "name", v: "Jon Meyer" },
      { k: "birth_date", v: "03/12/1984" },
      { k: "pol_id", v: "B0099231" },
    ],
  },
  {
    name: "Carrier C",
    schema: "members.parquet",
    fields: [
      { k: "claimant", v: "Meyer, Jonathon" },
      { k: "date_of_birth", v: "12-Mar-84" },
      { k: "policy", v: "99231-C" },
    ],
  },
]

export function ProblemSection() {
  return (
    <section id="problem" className="border-b border-border">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="max-w-2xl">
          <p className="font-mono text-sm text-primary">The problem</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            One person. Three carriers. Three schemas that disagree.
          </h2>
          <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
            The same claimant shows up across carriers with different field names, formats, and typos. There is no
            shared key, so a deterministic join silently fails or splits one person into three.
          </p>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {carriers.map((c) => (
            <div key={c.name} className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{c.name}</span>
                <span className="font-mono text-xs text-muted-foreground">{c.schema}</span>
              </div>
              <dl className="mt-4 space-y-2 font-mono text-xs">
                {c.fields.map((f) => (
                  <div key={f.k} className="flex items-center justify-between gap-3 border-t border-border pt-2">
                    <dt className="text-muted-foreground">{f.k}</dt>
                    <dd className="text-foreground">{f.v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-center">
          <ArrowRight className="h-5 w-5 rotate-90 text-muted-foreground" aria-hidden="true" />
        </div>

        <div className="mt-4 flex flex-col items-center gap-4 rounded-lg border border-primary/30 bg-primary/5 p-6 text-center sm:flex-row sm:justify-center sm:text-left">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="font-mono text-sm font-medium">resolved_entity #E-1042</p>
            <p className="text-sm text-muted-foreground">
              Jonathan R. Meyer — one canonical record, linked to all three source rows, with a confidence score and an
              audit trail.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
