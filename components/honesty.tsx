import { Info } from "lucide-react"

export function Honesty() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 rounded-lg border border-border bg-card p-6 sm:flex-row sm:items-start">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-accent">
            <Info className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-medium">A note on scope</h3>
            <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
              All data is synthetic. Qlik Replicate and Qlik Compose were not used (commercial, no free tier); the
              ingestion layer simulates their role in the architecture. Full disclosure is in the repo README.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
