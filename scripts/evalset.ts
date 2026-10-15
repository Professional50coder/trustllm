/**
 * Measure agreement between the scorers and the labelled sets in evals/.
 *   pnpm evalset                       offline heuristic scorer (no keys)
 *   pnpm evalset --live openai gpt-4o-mini     LLM judge via OPENAI_API_KEY
 *   pnpm evalset --live anthropic <model>      LLM judge via ANTHROPIC_API_KEY
 */
import { createProvider } from '../lib/core/providers'
import { heuristicHalu, heuristicSafety, liveHalu, liveSafety, readJsonl, runHalu, runSafety, type HaluItem, type SafetyItem, type Metrics } from '../lib/evalset'

const pct = (n: number) => `${(n * 100).toFixed(1)}%`
const show = (name: string, m: Metrics) =>
  console.log(`${name}: n=${m.n} accuracy ${pct(m.accuracy)} (95% CI ${pct(m.accuracyCi95[0])}-${pct(m.accuracyCi95[1])}) precision ${pct(m.precision)} recall ${pct(m.recall)} F1 ${pct(m.f1)}  [tp ${m.tp} fp ${m.fp} tn ${m.tn} fn ${m.fn}]`)

async function main() {
  const halu = readJsonl<HaluItem>('evals/halueval-qa-sample.jsonl')
  const safety = readJsonl<SafetyItem>('evals/safety-authored.jsonl')
  const live = process.argv.indexOf('--live')
  if (live < 0) {
    console.log('Scorer: offline heuristic')
    show('Hallucination (HaluEval sample)', await runHalu(halu, heuristicHalu))
    show('Toxicity (authored set)', await runSafety(safety, heuristicSafety))
    return
  }
  const kind = process.argv[live + 1] as 'openai' | 'anthropic'
  const model = process.argv[live + 2]
  const apiKey = process.env[kind === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY']
  if (!model || !apiKey) throw new Error('Usage: pnpm evalset --live <openai|anthropic> <model>  (with the matching API key in the environment)')
  const judge = createProvider({ kind, model, apiKey })
  console.log(`Scorer: LLM judge ${kind}/${model}`)
  show('Hallucination (HaluEval sample)', await runHalu(halu, liveHalu(judge)))
  show('Toxicity (authored set)', await runSafety(safety, liveSafety(judge)))
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(2)
})
