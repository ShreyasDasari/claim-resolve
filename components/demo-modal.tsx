"use client"

import { useEffect, useState } from "react"
import { Play, X } from "lucide-react"

export function DemoModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    if (open) {
      document.addEventListener("keydown", onKey)
      document.body.style.overflow = "hidden"
    }
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card px-5 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary/50"
      >
        <Play className="h-4 w-4" />
        Watch Working Demo
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="claim-resolve working demo"
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative flex h-full max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                claim-resolve · working demo
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Close demo"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <iframe
              src="/demo/claim-resolve-demo.html"
              title="claim-resolve working demo"
              className="h-full w-full flex-1 bg-[#08090c]"
            />
          </div>
        </div>
      )}
    </>
  )
}
