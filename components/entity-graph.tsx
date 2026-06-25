"use client"

import { useEffect, useMemo, useRef, useState } from "react"

type Carrier = "a" | "b" | "c"

type Node = {
  id: number
  x: number
  y: number
  carrier: Carrier
  drift: "a" | "b" | "c"
  dur: number
  delay: number
}

// Three subtle carrier colors. Cyan (accent) is reserved for confident-match links/glow.
const CARRIER_COLOR: Record<Carrier, string> = {
  a: "var(--accent)", // cyan
  b: "var(--primary)", // blue
  c: "oklch(0.7 0.02 250)", // neutral slate
}

const ACCENT = "var(--accent)"
const AMBER = "oklch(0.78 0.13 75)"

const VIEW_W = 380
const VIEW_H = 440

const NODES: Node[] = [
  { id: 0, x: 70, y: 72, carrier: "a", drift: "a", dur: 7.5, delay: 0 },
  { id: 1, x: 184, y: 52, carrier: "b", drift: "b", dur: 9, delay: 1.1 },
  { id: 2, x: 300, y: 92, carrier: "c", drift: "c", dur: 8.2, delay: 0.5 },
  { id: 3, x: 50, y: 184, carrier: "c", drift: "c", dur: 9.4, delay: 1.8 },
  { id: 4, x: 162, y: 158, carrier: "a", drift: "b", dur: 7.8, delay: 0.8 },
  { id: 5, x: 292, y: 202, carrier: "b", drift: "a", dur: 8.6, delay: 2.1 },
  { id: 6, x: 110, y: 282, carrier: "b", drift: "c", dur: 9.1, delay: 0.3 },
  { id: 7, x: 224, y: 268, carrier: "c", drift: "a", dur: 7.6, delay: 1.4 },
  { id: 8, x: 322, y: 312, carrier: "a", drift: "b", dur: 8.9, delay: 2.4 },
  { id: 9, x: 92, y: 382, carrier: "a", drift: "a", dur: 8.3, delay: 0.9 },
  { id: 10, x: 212, y: 392, carrier: "c", drift: "c", dur: 9.6, delay: 1.6 },
  { id: 11, x: 312, y: 400, carrier: "b", drift: "b", dur: 7.9, delay: 0.6 },
]

// Cross-carrier "same entity" matches, revealed one at a time.
const MATCH_PAIRS: [number, number][] = [
  [4, 1],
  [7, 4],
  [5, 10],
  [3, 0],
  [8, 2],
  [6, 11],
]

type Connection = { key: string; from: number; to: number; len: number; phase: "drawing" | "settled" }

function dist(a: Node, b: Node) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function EntityGraph() {
  const [reduced, setReduced] = useState(false)
  const [connections, setConnections] = useState<Connection[]>([])
  const [flagged, setFlagged] = useState<number | null>(null)
  const pairIndex = useRef(0)

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduced(mq.matches)
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  // Static state for reduced motion: show all matches faintly settled.
  useEffect(() => {
    if (reduced) {
      setConnections(
        MATCH_PAIRS.map(([from, to], i) => ({
          key: `static-${i}`,
          from,
          to,
          len: dist(NODES[from], NODES[to]),
          phase: "settled" as const,
        })),
      )
      setFlagged(7)
      return
    }
  }, [reduced])

  // Periodically draw a new match connection.
  useEffect(() => {
    if (reduced) return
    const interval = setInterval(() => {
      const [from, to] = MATCH_PAIRS[pairIndex.current % MATCH_PAIRS.length]
      pairIndex.current += 1
      const key = `c-${Date.now()}`
      const len = dist(NODES[from], NODES[to])
      setConnections((prev) => {
        // Replace an existing settled copy of the same pair, cap total faint lines.
        const withoutDupe = prev.filter((c) => !(c.from === from && c.to === to))
        const next = [...withoutDupe, { key, from, to, len, phase: "drawing" as const }]
        return next.slice(-MATCH_PAIRS.length)
      })
      window.setTimeout(() => {
        setConnections((prev) => prev.map((c) => (c.key === key ? { ...c, phase: "settled" } : c)))
      }, 1000)
    }, 2600)
    return () => clearInterval(interval)
  }, [reduced])

  // Periodically flag a node for review.
  useEffect(() => {
    if (reduced) return
    const interval = setInterval(() => {
      setFlagged(Math.floor(Math.random() * NODES.length))
      window.setTimeout(() => setFlagged(null), 1500)
    }, 5200)
    return () => clearInterval(interval)
  }, [reduced])

  const connEls = useMemo(
    () =>
      connections.map((c) => {
        const a = NODES[c.from]
        const b = NODES[c.to]
        const drawing = c.phase === "drawing" && !reduced
        return (
          <line
            key={c.key}
            data-cr-line
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={ACCENT}
            strokeWidth={1.25}
            strokeLinecap="round"
            opacity={drawing ? 0.9 : 0.2}
            style={
              drawing
                ? ({
                    ["--cr-len" as string]: `${c.len}`,
                    strokeDasharray: c.len,
                    animation: "cr-draw 0.95s ease-out forwards",
                  } as React.CSSProperties)
                : undefined
            }
          />
        )
      }),
    [connections, reduced],
  )

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative mx-auto aspect-[380/440] w-full max-w-[400px]"
    >
      {/* soft radial wash to ground the composition */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 55% at 55% 45%, oklch(0.78 0.12 200 / 0.08), transparent 70%)",
        }}
      />
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="absolute inset-0 h-full w-full overflow-visible"
        fill="none"
      >
        {/* connections sit behind nodes */}
        <g>{connEls}</g>

        {/* glow pulse at the endpoints of freshly drawn connections */}
        {!reduced &&
          connections
            .filter((c) => c.phase === "drawing")
            .flatMap((c) => [NODES[c.from], NODES[c.to]])
            .map((n, i) => (
              <circle
                key={`glow-${n.id}-${i}`}
                data-cr-glow
                cx={n.x}
                cy={n.y}
                r={9}
                fill={ACCENT}
                style={{
                  transformBox: "fill-box",
                  transformOrigin: "center",
                  animation: "cr-glow 1s ease-out forwards",
                }}
              />
            ))}

        {/* nodes */}
        {NODES.map((n) => {
          const isFlagged = flagged === n.id
          return (
            <g
              key={n.id}
              data-cr-node
              style={
                reduced
                  ? undefined
                  : {
                      transformBox: "fill-box",
                      transformOrigin: "center",
                      animation: `cr-drift-${n.drift} ${n.dur}s ease-in-out ${n.delay}s infinite alternate`,
                    }
              }
            >
              {/* flagged-for-review pulse */}
              {isFlagged && (
                <circle
                  data-cr-flag
                  cx={n.x}
                  cy={n.y}
                  r={10}
                  fill={AMBER}
                  style={
                    reduced
                      ? { opacity: 0.5 }
                      : {
                          transformBox: "fill-box",
                          transformOrigin: "center",
                          animation: "cr-flag 1.5s ease-in-out forwards",
                        }
                  }
                />
              )}
              {/* node body with subtle glow */}
              <circle
                cx={n.x}
                cy={n.y}
                r={4.5}
                fill={isFlagged ? AMBER : CARRIER_COLOR[n.carrier]}
                style={{
                  filter: `drop-shadow(0 0 5px ${isFlagged ? AMBER : CARRIER_COLOR[n.carrier]})`,
                  opacity: 0.92,
                  transition: "fill 0.4s ease",
                }}
              />
            </g>
          )
        })}
      </svg>
    </div>
  )
}
