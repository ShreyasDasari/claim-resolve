import Link from "next/link"
import { Github } from "lucide-react"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 font-mono text-sm font-medium tracking-tight">
          <span className="inline-block h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
          claim-resolve
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#problem" className="transition-colors hover:text-foreground">
            Problem
          </a>
          <a href="#architecture" className="transition-colors hover:text-foreground">
            Architecture
          </a>
          <a href="#pipeline" className="transition-colors hover:text-foreground">
            Pipeline
          </a>
          <a href="#stack" className="transition-colors hover:text-foreground">
            Stack
          </a>
        </nav>

        <a
          href="https://github.com/ShreyasDasari/claim-resolve"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
        >
          <Github className="h-4 w-4" />
          <span className="hidden sm:inline">GitHub</span>
        </a>
      </div>
    </header>
  )
}
