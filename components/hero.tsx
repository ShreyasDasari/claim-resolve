import Link from "next/link"
import { Github, ArrowRight, Play } from "lucide-react"
import { EntityGraph } from "@/components/entity-graph"

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      {/* subtle grid backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)",
        }}
      />

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 py-24 md:py-32 lg:grid-cols-[1fr_minmax(0,420px)]">
        <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 font-mono text-xs text-muted-foreground">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
          Multi-agent entity resolution for P&amp;C insurance
        </div>

        <h1 className="mt-6 max-w-4xl text-balance font-mono text-5xl font-semibold tracking-tight md:text-7xl">
          claim-resolve
        </h1>

        <p className="mt-6 max-w-2xl text-balance text-xl leading-relaxed text-foreground md:text-2xl">
          A multi-agent pipeline that reconciles claims across carriers, and shows exactly how and why it made each
          call.
        </p>

        <p className="mt-5 max-w-2xl text-pretty leading-relaxed text-muted-foreground">
          It tackles cross-carrier entity resolution, a real challenge in P&amp;C insurance data architecture, inspired
          by enterprise data initiatives at companies like Shelter Insurance. Built entirely on a free, open tech stack.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            View Dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/demo"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card px-5 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary/50"
          >
            <Play className="h-4 w-4" />
            Watch Working Demo
          </Link>
          <a
            href="https://github.com/ShreyasDasari/claim-resolve"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-2 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground sm:ml-2"
            aria-label="View claim-resolve on GitHub"
          >
            <Github className="h-4 w-4" />
            Source
          </a>
        </div>
        </div>

        {/* live entity-resolution graph */}
        <div className="hidden lg:block">
          <EntityGraph />
        </div>
      </div>
    </section>
  )
}
