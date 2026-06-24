import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center text-foreground">
      <p className="font-mono text-sm text-primary">claim-resolve</p>
      <h1 className="mt-4 text-balance text-4xl font-semibold tracking-tight md:text-5xl">{title}</h1>
      <p className="mt-4 max-w-md text-pretty leading-relaxed text-muted-foreground">{description}</p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm transition-colors hover:border-primary/50"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to home
      </Link>
    </div>
  )
}
