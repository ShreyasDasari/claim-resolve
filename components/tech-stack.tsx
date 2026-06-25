const stack = ["Python", "dbt Core", "Snowflake", "LangGraph", "Gemini", "Groq", "Snowflake Cortex"]

export function TechStack() {
  return (
    <section id="stack" className="border-b border-border">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-center font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Built on a free, open tech stack
        </p>
        <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-3">
          {stack.map((item) => (
            <li
              key={item}
              className="rounded-md border border-border px-4 py-2 font-mono text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
