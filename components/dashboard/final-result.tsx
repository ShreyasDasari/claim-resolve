import { CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react"
import {
  formatFieldName,
  confidenceBand,
  bandTone,
  TONE_CLASSES,
  type FinalResult as FinalResultType,
} from "@/lib/trace"
import { ConfidenceBar } from "./confidence-bar"

interface FinalResultProps {
  result: FinalResultType
}

interface ClaimRow {
  claim_type?: string
  claim_date?: string
  claim_amount?: number
}

export function FinalResult({ result }: FinalResultProps) {
  const flagged = result.flagged_for_review
  const tone = bandTone(confidenceBand(result.confidence))
  const toneClasses = TONE_CLASSES[tone]
  const entity = result.canonical_entity as Record<string, unknown>
  const claims = (entity.claims as ClaimRow[] | undefined) ?? []

  const entityFields = Object.entries(entity).filter(([k]) => k !== "claims")

  return (
    <section aria-labelledby="final-heading" className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <h2 id="final-heading" className="text-sm font-medium">
          Final result
        </h2>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] ${toneClasses.border} ${toneClasses.bg} ${toneClasses.text}`}
        >
          {result.matched ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" /> matched
            </>
          ) : (
            <>
              <ShieldAlert className="h-3.5 w-3.5" /> not merged
            </>
          )}
        </span>
      </div>

      <div className="px-5 py-4">
        {flagged && (
          <div className="mb-4 flex items-start gap-3 rounded-md border border-[color-mix(in_oklch,var(--warning)_45%,transparent)] bg-[color-mix(in_oklch,var(--warning)_12%,transparent)] p-3.5">
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning)]"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-medium text-[var(--warning)]">Escalated for human review</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Confidence landed in the escalation band — the evidence was genuinely ambiguous, so
                the pipeline declined to force a merge and routed this case to a person.
              </p>
            </div>
          </div>
        )}

        {result.matched ? (
          <>
            <span className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              canonical entity
            </span>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
              {entityFields.map(([key, value]) => (
                <div key={key} className="flex items-baseline justify-between gap-3 border-b border-border/50 py-1.5">
                  <dt className="font-mono text-[11px] text-muted-foreground">{formatFieldName(key)}</dt>
                  <dd className="text-right font-mono text-xs text-foreground">{String(value)}</dd>
                </div>
              ))}
            </dl>

            {claims.length > 0 && (
              <div className="mt-4">
                <span className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  merged claims ({claims.length})
                </span>
                <div className="overflow-hidden rounded-md border border-border">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted/40 text-left">
                        <th className="px-3 py-1.5 font-mono text-[10px] font-medium uppercase text-muted-foreground">Type</th>
                        <th className="px-3 py-1.5 font-mono text-[10px] font-medium uppercase text-muted-foreground">Date</th>
                        <th className="px-3 py-1.5 text-right font-mono text-[10px] font-medium uppercase text-muted-foreground">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {claims.map((claim, i) => (
                        <tr key={i}>
                          <td className="px-3 py-1.5 font-mono text-xs">{claim.claim_type}</td>
                          <td className="px-3 py-1.5 font-mono text-xs text-muted-foreground">{claim.claim_date}</td>
                          <td className="px-3 py-1.5 text-right font-mono text-xs">
                            {typeof claim.claim_amount === "number"
                              ? `$${claim.claim_amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">
            No canonical entity was emitted. The records were left unmerged pending a reviewer&apos;s
            decision.
          </p>
        )}

        <div className="mt-5 max-w-sm">
          <ConfidenceBar value={result.confidence} />
        </div>
      </div>
    </section>
  )
}
