"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"
import type { TraceExport, ResolutionCase } from "@/lib/trace"
import { CaseSelector } from "./case-selector"
import { SourceRecords } from "./source-records"
import { TracePlayer } from "./trace-player"
import { FinalResult } from "./final-result"
import { CortexSection } from "./cortex-section"
import { GovernanceLegend } from "./governance-legend"

type Tab = "trace" | "cortex"

export function DashboardClient() {
  const [data, setData] = useState<TraceExport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string>("")
  const [tab, setTab] = useState<Tab>("trace")

  useEffect(() => {
    let cancelled = false
    fetch("/data/trace_export.json")
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load trace (${r.status})`)
        return r.json()
      })
      .then((json: TraceExport) => {
        if (cancelled) return
        setData(json)
        setSelectedId(json.cases[0]?.case_id ?? "")
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const selected: ResolutionCase | undefined = useMemo(
    () => data?.cases.find((c) => c.case_id === selectedId),
    [data, selectedId],
  )

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-3">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 font-mono text-sm font-semibold tracking-tight text-foreground"
            >
              <span className="text-primary">claim</span>-resolve
            </Link>
            <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">
              3-agent pipeline · LangGraph · dbt + Snowflake · Cortex
            </span>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {error && (
          <div className="rounded-lg border border-[color-mix(in_oklch,var(--danger)_45%,transparent)] bg-[color-mix(in_oklch,var(--danger)_12%,transparent)] p-4 text-sm text-[var(--danger)]">
            Could not load the trace export: {error}
          </div>
        )}

        {!data && !error && (
          <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span className="font-mono text-sm">Loading captured trace…</span>
          </div>
        )}

        {data && selected && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
            {/* Sidebar */}
            <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
              <div>
                <h1 className="text-lg font-semibold tracking-tight">Resolution trace</h1>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                  run {data.run_id}
                </p>
              </div>
              <CaseSelector cases={data.cases} selectedId={selectedId} onSelect={setSelectedId} />
              <GovernanceLegend />
            </aside>

            {/* Main panel */}
            <div className="min-w-0">
              {/* Tabs */}
              <div
                className="mb-6 inline-flex rounded-lg border border-border bg-card p-1"
                role="tablist"
                aria-label="Dashboard views"
              >
                <button
                  role="tab"
                  aria-selected={tab === "trace"}
                  onClick={() => setTab("trace")}
                  className={`rounded-md px-3 py-1.5 font-mono text-xs transition-colors ${
                    tab === "trace"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Reasoning trace
                </button>
                <button
                  role="tab"
                  aria-selected={tab === "cortex"}
                  onClick={() => setTab("cortex")}
                  className={`rounded-md px-3 py-1.5 font-mono text-xs transition-colors ${
                    tab === "cortex"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Cortex queries
                </button>
              </div>

              {tab === "trace" ? (
                <div className="flex flex-col gap-8">
                  <SourceRecords records={selected.source_records} />
                  <TracePlayer steps={selected.steps} caseId={selected.case_id} />
                  <FinalResult result={selected.final_result} />
                </div>
              ) : (
                <CortexSection />
              )}
            </div>
          </div>
        )}

        {/* Footer note */}
        <p className="mt-12 border-t border-border pt-6 text-center font-mono text-[11px] text-muted-foreground">
          This dashboard replays a captured trace from a real pipeline run. It does not make live API
          calls.
        </p>
      </main>
    </div>
  )
}
