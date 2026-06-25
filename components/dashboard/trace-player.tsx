"use client"

import { useEffect, useRef, useState } from "react"
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Map as MapIcon,
  GitMerge,
  Scale,
  RotateCcw,
} from "lucide-react"
import {
  AGENT_META,
  confidenceBand,
  bandTone,
  TONE_CLASSES,
  type AgentName,
  type TraceStep,
} from "@/lib/trace"
import { ConfidenceBar } from "./confidence-bar"

const AGENT_ICONS: Record<AgentName, typeof MapIcon> = {
  schema_mapping: MapIcon,
  entity_resolution: GitMerge,
  conflict_resolver: Scale,
}

const STEP_DELAY = 3200

interface TracePlayerProps {
  steps: TraceStep[]
  caseId: string
}

export function TracePlayer({ steps, caseId }: TracePlayerProps) {
  const [active, setActive] = useState(0)
  const [playing, setPlaying] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset when switching cases
  useEffect(() => {
    setActive(0)
    setPlaying(false)
  }, [caseId])

  // Auto-advance
  useEffect(() => {
    if (!playing) return
    if (active >= steps.length - 1) {
      setPlaying(false)
      return
    }
    timerRef.current = setTimeout(() => setActive((i) => i + 1), STEP_DELAY)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [playing, active, steps.length])

  const atStart = active === 0
  const atEnd = active === steps.length - 1

  function handlePlay() {
    if (atEnd) {
      setActive(0)
      setPlaying(true)
    } else {
      setPlaying((p) => !p)
    }
  }

  return (
    <section aria-labelledby="trace-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="trace-heading" className="text-sm font-medium">
            Agent reasoning trace
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Step through how the 3-agent pipeline reached its verdict.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePlay}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 font-mono text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            {atEnd ? (
              <>
                <RotateCcw className="h-3.5 w-3.5" /> Replay
              </>
            ) : playing ? (
              <>
                <Pause className="h-3.5 w-3.5" /> Pause
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" /> Play
              </>
            )}
          </button>
          <button
            onClick={() => {
              setPlaying(false)
              setActive((i) => Math.max(0, i - 1))
            }}
            disabled={atStart}
            aria-label="Previous step"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-foreground transition-colors hover:bg-muted disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setPlaying(false)
              setActive((i) => Math.min(steps.length - 1, i + 1))
            }}
            disabled={atEnd}
            aria-label="Next step"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-foreground transition-colors hover:bg-muted disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress dots */}
      <div className="mt-4 flex items-center gap-2">
        {steps.map((s, i) => {
          const reached = i <= active
          return (
            <button
              key={s.agent}
              onClick={() => {
                setPlaying(false)
                setActive(i)
              }}
              aria-label={`Go to ${AGENT_META[s.agent].label}`}
              className="group flex flex-1 flex-col gap-1.5"
            >
              <span
                className={`h-1 w-full rounded-full transition-colors ${
                  reached ? "bg-primary" : "bg-muted"
                }`}
              />
              <span
                className={`font-mono text-[10px] transition-colors ${
                  i === active ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {i + 1}. {AGENT_META[s.agent].label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Step cards */}
      <ol className="mt-5 flex flex-col gap-3">
        {steps.map((step, i) => (
          <StepCard
            key={`${caseId}-${step.agent}`}
            step={step}
            index={i}
            isActive={i === active}
            isReached={i <= active}
            onClick={() => {
              setPlaying(false)
              setActive(i)
            }}
          />
        ))}
      </ol>
    </section>
  )
}

interface StepCardProps {
  step: TraceStep
  index: number
  isActive: boolean
  isReached: boolean
  onClick: () => void
}

function StepCard({ step, index, isActive, isReached, onClick }: StepCardProps) {
  const Icon = AGENT_ICONS[step.agent]
  const meta = AGENT_META[step.agent]
  const tone = bandTone(confidenceBand(step.confidence))
  const toneClasses = TONE_CLASSES[tone]

  return (
    <li>
      <div
        className={`overflow-hidden rounded-lg border transition-all ${
          isActive
            ? "border-primary bg-card"
            : isReached
              ? "border-border bg-card"
              : "border-border/60 bg-card/40 opacity-55"
        }`}
      >
        <button
          onClick={onClick}
          aria-expanded={isActive}
          className="flex w-full items-center gap-3 px-4 py-3 text-left"
        >
          <span
            className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
              isReached ? "bg-muted text-primary" : "bg-muted/50 text-muted-foreground"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-muted-foreground">step {index + 1}</span>
              <span className="text-sm font-medium">{meta.label}</span>
            </span>
          </span>
          <span className={`font-mono text-xs font-medium ${toneClasses.text}`}>
            {step.confidence.toFixed(2)}
          </span>
        </button>

        {isActive && (
          <div className="cr-step-in border-t border-border px-4 py-4">
            <div className="grid grid-cols-1 gap-4">
              <Field label="input">
                <p className="text-xs leading-relaxed text-muted-foreground">{step.input_summary}</p>
              </Field>

              <Field label="reasoning">
                <div className="rounded-md border border-border bg-muted/40 p-3">
                  <p className="font-mono text-[12px] leading-relaxed text-foreground/90">
                    {step.reasoning}
                  </p>
                </div>
              </Field>

              <Field label="output">
                <p className="break-words font-mono text-[11px] leading-relaxed text-accent">
                  {step.output_summary}
                </p>
              </Field>

              <div className="pt-1">
                <ConfidenceBar value={step.confidence} />
              </div>
            </div>
          </div>
        )}
      </div>
    </li>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  )
}
