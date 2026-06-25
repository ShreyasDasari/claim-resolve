import { Database } from "lucide-react"
import { formatCarrier, type SourceRecord } from "@/lib/trace"

interface SourceRecordsProps {
  records: SourceRecord[]
}

export function SourceRecords({ records }: SourceRecordsProps) {
  return (
    <section aria-labelledby="source-records-heading">
      <div className="flex items-baseline justify-between">
        <h2 id="source-records-heading" className="text-sm font-medium">
          Source records
        </h2>
        <span className="font-mono text-xs text-muted-foreground">raw, as received</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Each carrier sends different field names and formats for the same person.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        {records.map((rec) => {
          const fields = Object.entries(rec.raw_fields)
          return (
            <div
              key={rec.carrier}
              className="overflow-hidden rounded-lg border border-border bg-card"
            >
              <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
                <Database className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                <span className="font-mono text-xs font-medium">{formatCarrier(rec.carrier)}</span>
              </div>
              <dl className="divide-y divide-border/60">
                {fields.map(([key, value]) => (
                  <div key={key} className="flex items-start gap-3 px-4 py-2">
                    <dt className="w-2/5 shrink-0 font-mono text-[11px] text-muted-foreground">
                      {key}
                    </dt>
                    <dd className="min-w-0 break-words font-mono text-[11px] text-foreground">
                      {String(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )
        })}
      </div>
    </section>
  )
}
