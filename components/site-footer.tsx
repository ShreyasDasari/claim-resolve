import { Github } from "lucide-react"

export function SiteFooter() {
  return (
    <footer className="bg-background">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 font-mono text-sm font-medium">
            <span className="inline-block h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
            claim-resolve
          </div>
          <a
            href="https://github.com/ShreyasDasari/claim-resolve"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <Github className="h-4 w-4" />
            github.com/ShreyasDasari/claim-resolve
          </a>
        </div>

        <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
          Built by Shreyas Dasari as a portfolio project in cross-carrier entity resolution and explainable AI for
          P&amp;C insurance data engineering.
        </p>
        <p className="mt-3 font-mono text-xs text-muted-foreground">
          Python · dbt Core · Snowflake · LangGraph · Gemini · Groq · Snowflake Cortex
        </p>
      </div>
    </footer>
  )
}
