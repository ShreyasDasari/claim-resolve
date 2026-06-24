import { SiteHeader } from "@/components/site-header"
import { Hero } from "@/components/hero"
import { ProblemSection } from "@/components/problem-section"
import { Architecture } from "@/components/architecture"
import { Credibility } from "@/components/credibility"
import { TechStack } from "@/components/tech-stack"
import { Honesty } from "@/components/honesty"
import { SiteFooter } from "@/components/site-footer"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <Hero />
        <ProblemSection />
        <Architecture />
        <Credibility />
        <TechStack />
        <Honesty />
      </main>
      <SiteFooter />
    </div>
  )
}
