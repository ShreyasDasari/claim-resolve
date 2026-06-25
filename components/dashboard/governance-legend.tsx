const bands = [
  { label: "Reject", range: "< 0.15", tone: "danger" as const, hint: "Not the same entity" },
  { label: "Escalate", range: "0.15 – 0.75", tone: "warning" as const, hint: "Send to human review" },
  { label: "Confident", range: "≥ 0.75", tone: "success" as const, hint: "Auto-resolve" },
]

const toneVar: Record<"danger" | "warning" | "success", string> = {
  danger: "var(--danger)",
  warning: "var(--warning)",
  success: "var(--success)",
}

export function GovernanceLegend() {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
        Governance thresholds
      </h3>
      <div className="mt-3 flex flex-col gap-2">
        {bands.map((b) => (
          <div key={b.label} className="flex items-start gap-2 rounded-md bg-muted/50 p-2.5">
            <span
              className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: toneVar[b.tone] }}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium">{b.label}</span>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">{b.range}</span>
              </div>
              <p className="text-xs text-muted-foreground">{b.hint}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
