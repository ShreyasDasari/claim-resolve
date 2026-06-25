export type AgentName = "schema_mapping" | "entity_resolution" | "conflict_resolver"

export type CaseType = "clean_match" | "ambiguous_match_resolved" | "flagged_for_review"

export interface SourceRecord {
  carrier: string
  raw_fields: Record<string, string | number | boolean | null>
}

export interface TraceStep {
  agent: AgentName
  input_summary: string
  reasoning: string
  output_summary: string
  confidence: number
}

export interface FinalResult {
  matched: boolean
  canonical_entity: Record<string, unknown>
  confidence: number
  flagged_for_review: boolean
}

export interface ResolutionCase {
  case_id: string
  case_type: CaseType
  source_records: SourceRecord[]
  steps: TraceStep[]
  final_result: FinalResult
}

export interface TraceExport {
  run_id: string
  generated_at: string
  cases: ResolutionCase[]
}

export interface CortexQuery {
  question: string
  sql: string
  result_columns: string[]
  result_rows: (string | number)[][]
}

/* ---------- Governance thresholds ---------- */
// < 0.15 reject · 0.15–0.75 escalate · >= 0.75 confident match
export const REJECT_THRESHOLD = 0.15
export const CONFIDENT_THRESHOLD = 0.75

export type ConfidenceBand = "reject" | "escalate" | "confident"

export function confidenceBand(confidence: number): ConfidenceBand {
  if (confidence < REJECT_THRESHOLD) return "reject"
  if (confidence < CONFIDENT_THRESHOLD) return "escalate"
  return "confident"
}

/* ---------- Display metadata ---------- */
export const CASE_META: Record<
  CaseType,
  { label: string; tone: "success" | "warning" | "danger" }
> = {
  clean_match: { label: "Clean Match", tone: "success" },
  ambiguous_match_resolved: { label: "Resolved Ambiguity", tone: "warning" },
  flagged_for_review: { label: "Flagged for Review", tone: "danger" },
}

export const AGENT_META: Record<AgentName, { label: string; order: number }> = {
  schema_mapping: { label: "Schema-Mapping", order: 1 },
  entity_resolution: { label: "Entity-Resolution", order: 2 },
  conflict_resolver: { label: "Conflict-Resolver", order: 3 },
}

export const TONE_CLASSES: Record<
  "success" | "warning" | "danger",
  { text: string; bg: string; border: string; bar: string; dot: string }
> = {
  success: {
    text: "text-[var(--success)]",
    bg: "bg-[color-mix(in_oklch,var(--success)_14%,transparent)]",
    border: "border-[color-mix(in_oklch,var(--success)_45%,transparent)]",
    bar: "bg-[var(--success)]",
    dot: "bg-[var(--success)]",
  },
  warning: {
    text: "text-[var(--warning)]",
    bg: "bg-[color-mix(in_oklch,var(--warning)_14%,transparent)]",
    border: "border-[color-mix(in_oklch,var(--warning)_45%,transparent)]",
    bar: "bg-[var(--warning)]",
    dot: "bg-[var(--warning)]",
  },
  danger: {
    text: "text-[var(--danger)]",
    bg: "bg-[color-mix(in_oklch,var(--danger)_14%,transparent)]",
    border: "border-[color-mix(in_oklch,var(--danger)_45%,transparent)]",
    bar: "bg-[var(--danger)]",
    dot: "bg-[var(--danger)]",
  },
}

export function bandTone(band: ConfidenceBand): "success" | "warning" | "danger" {
  if (band === "confident") return "success"
  if (band === "escalate") return "warning"
  return "danger"
}

export function formatCarrier(carrier: string): string {
  return carrier
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

export function formatFieldName(field: string): string {
  return field
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function claimantName(c: ResolutionCase): string {
  const entity = c.final_result.canonical_entity as Record<string, unknown>
  const first = entity.first_name as string | undefined
  const last = entity.last_name as string | undefined
  if (first || last) return [first, last].filter(Boolean).join(" ")

  // Fall back to the first source record's name-ish field
  const raw = c.source_records[0]?.raw_fields ?? {}
  if (typeof raw.claimant_name === "string") return raw.claimant_name
  if (typeof raw.policyholder_full_name === "string") {
    const parts = raw.policyholder_full_name.split(",").map((s) => s.trim())
    return parts.length === 2 ? `${parts[1]} ${parts[0]}` : raw.policyholder_full_name
  }
  return "Unknown claimant"
}

/* ---------- Precomputed Cortex queries (replayed, not live) ---------- */
export const CORTEX_QUERIES: CortexQuery[] = [
  {
    question: "Show me claimants appearing across more than one carrier.",
    sql: `SELECT canonical_entity_id,
       first_name,
       last_name,
       COUNT(DISTINCT carrier) AS carrier_count
FROM resolved_entities re
JOIN entity_sources es
  ON es.canonical_entity_id = re.canonical_entity_id
GROUP BY 1, 2, 3
HAVING COUNT(DISTINCT carrier) > 1
ORDER BY carrier_count DESC;`,
    result_columns: ["first_name", "last_name", "carrier_count"],
    result_rows: [
      ["Margaret", "Chen", 2],
      ["Jonathan", "Meyer", 2],
    ],
  },
  {
    question: "How many resolutions were escalated for human review this run?",
    sql: `SELECT COUNT(*) AS escalated
FROM resolution_cases
WHERE run_id = 'run_df8a148b83f1'
  AND flagged_for_review = TRUE;`,
    result_columns: ["escalated"],
    result_rows: [[1]],
  },
  {
    question: "What is the average match confidence, broken down by outcome?",
    sql: `SELECT case_type,
       ROUND(AVG(confidence), 2) AS avg_confidence,
       COUNT(*) AS cases
FROM resolution_cases
WHERE run_id = 'run_df8a148b83f1'
GROUP BY case_type
ORDER BY avg_confidence DESC;`,
    result_columns: ["case_type", "avg_confidence", "cases"],
    result_rows: [
      ["clean_match", 0.9, 1],
      ["ambiguous_match_resolved", 0.8, 1],
      ["flagged_for_review", 0.2, 1],
    ],
  },
]
