import { Sparkles } from "lucide-react"
import { CORTEX_QUERIES, formatFieldName } from "@/lib/trace"

export function CortexSection() {
  return (
    <section aria-labelledby="cortex-heading">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-accent" aria-hidden="true" />
        <h2 id="cortex-heading" className="text-sm font-medium">
          Ask in plain English
        </h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Snowflake Cortex translates natural-language questions into SQL over the resolved entities.
        These are real questions, the SQL Cortex generated, and the rows it returned.
      </p>

      <div className="mt-4 flex flex-col gap-4">
        {CORTEX_QUERIES.map((q) => (
          <div key={q.question} className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-medium text-foreground">{q.question}</p>
            </div>

            <div className="border-b border-border bg-muted/30 px-4 py-3">
              <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                generated SQL
              </span>
              <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed text-accent">
                <code>{q.sql}</code>
              </pre>
            </div>

            <div className="px-4 py-3">
              <span className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                result
              </span>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left">
                      {q.result_columns.map((col) => (
                        <th
                          key={col}
                          className="border-b border-border px-3 py-1.5 font-mono text-[10px] font-medium uppercase text-muted-foreground"
                        >
                          {formatFieldName(col)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {q.result_rows.map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => (
                          <td key={ci} className="px-3 py-1.5 font-mono text-xs text-foreground">
                            {String(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
