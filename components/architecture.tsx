import { Database, DownloadCloud, Layers, GitBranch, FileJson, LayoutDashboard, ArrowRight } from "lucide-react"

const stages = [
  {
    icon: Database,
    title: "Synthetic Carrier Data",
    caption: "Three carriers, mismatched schemas, generated with Faker",
  },
  {
    icon: DownloadCloud,
    title: "Ingestion",
    caption: "Simulates Qlik Replicate change-data capture",
  },
  {
    icon: Layers,
    title: "dbt + Snowflake",
    caption: "Deterministic grouping and staging models",
  },
  {
    icon: GitBranch,
    title: "LangGraph Pipeline",
    caption: "Schema-Mapping → Entity-Resolution → Conflict-Resolver",
  },
  {
    icon: FileJson,
    title: "Trace Export",
    caption: "Every decision serialized for audit",
  },
  {
    icon: LayoutDashboard,
    title: "Dashboard",
    caption: "Inspect resolutions and reasoning",
  },
]

export function Architecture() {
  return (
    <section id="architecture" className="border-b border-border">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="max-w-2xl">
          <p className="font-mono text-sm text-primary">How it works</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            A deterministic core, an explainable agent layer.
          </h2>
          <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
            Cheap, reliable grouping happens in SQL. The expensive, judgment-heavy work is handed to a small graph of
            specialized agents, each with a single responsibility.
          </p>
        </div>

        <div id="pipeline" className="mt-12 flex flex-col gap-4 lg:flex-row lg:items-stretch">
          {stages.map((stage, i) => (
            <div key={stage.title} className="flex flex-1 flex-col items-stretch gap-4 lg:flex-row">
              <div className="flex h-full flex-1 flex-col rounded-lg border border-border bg-card p-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-primary">
                  <stage.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-sm font-medium">{stage.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{stage.caption}</p>
              </div>
              {i < stages.length - 1 && (
                <div className="flex items-center justify-center text-muted-foreground">
                  <ArrowRight className="h-4 w-4 rotate-90 lg:rotate-0" aria-hidden="true" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
