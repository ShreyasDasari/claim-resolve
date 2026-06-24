"use client"

import { CASE_META, TONE_CLASSES, claimantName, type ResolutionCase } from "@/lib/trace"

interface CaseSelectorProps {
  cases: ResolutionCase[]
  selectedId: string
  onSelect: (id: string) => void
}

export function CaseSelector({ cases, selectedId, onSelect }: CaseSelectorProps) {
  return (
    <div
      className="flex flex-col gap-3"
      role="tablist"
      aria-label="Resolution cases"
    >
      {cases.map((c) => {
        const meta = CASE_META[c.case_type]
        const classes = TONE_CLASSES[meta.tone]
        const selected = c.case_id === selectedId
        return (
          <button
            key={c.case_id}
            role="tab"
            aria-selected={selected}
            onClick={() => onSelect(c.case_id)}
            className={`group rounded-lg border p-4 text-left transition-colors ${
              selected
                ? "border-primary bg-card"
                : "border-border bg-card/50 hover:border-foreground/30 hover:bg-card"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[11px] ${classes.border} ${classes.bg} ${classes.text}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${classes.dot}`} aria-hidden="true" />
                {meta.label}
              </span>
              <span className={`font-mono text-xs font-medium ${classes.text}`}>
                {c.final_result.confidence.toFixed(2)}
              </span>
            </div>
            <p className="mt-2.5 text-sm font-medium text-foreground">{claimantName(c)}</p>
            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
              {c.source_records.length} carriers · {c.case_id}
            </p>
          </button>
        )
      })}
    </div>
  )
}
