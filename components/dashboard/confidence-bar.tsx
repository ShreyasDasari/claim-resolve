import {
  REJECT_THRESHOLD,
  CONFIDENT_THRESHOLD,
  confidenceBand,
  bandTone,
  TONE_CLASSES,
} from "@/lib/trace"

interface ConfidenceBarProps {
  value: number
  showThresholds?: boolean
}

export function ConfidenceBar({ value, showThresholds = true }: ConfidenceBarProps) {
  const pct = Math.round(value * 100)
  const tone = bandTone(confidenceBand(value))
  const classes = TONE_CLASSES[tone]

  return (
    <div className="w-full">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="font-mono text-xs text-muted-foreground">confidence</span>
        <span className={`font-mono text-xs font-medium ${classes.text}`}>{value.toFixed(2)}</span>
      </div>
      <div
        className="relative h-2 w-full overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Match confidence"
      >
        <div className={`h-full rounded-full ${classes.bar}`} style={{ width: `${pct}%` }} />
        {showThresholds && (
          <>
            <span
              className="absolute top-0 h-full w-px bg-foreground/30"
              style={{ left: `${REJECT_THRESHOLD * 100}%` }}
              aria-hidden="true"
            />
            <span
              className="absolute top-0 h-full w-px bg-foreground/30"
              style={{ left: `${CONFIDENT_THRESHOLD * 100}%` }}
              aria-hidden="true"
            />
          </>
        )}
      </div>
      {showThresholds && (
        <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
          <span>0.00</span>
          <span>reject · escalate · confident</span>
          <span>1.00</span>
        </div>
      )}
    </div>
  )
}
