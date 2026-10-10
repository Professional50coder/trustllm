/**
 * Generates docs/sample-report.md by running the real scoring code over the
 * mock responses with a fixed seed. Usage: npm run report [-- <seed> <runs>]
 */
import { writeFileSync } from 'node:fs'
import { generateMockResponse } from '../lib/mock-responses'
import { MODEL_BASELINES, evaluateResponse, seededRng, type ModelId } from '../lib/scoring'

const seed = Number(process.argv[2] ?? 2024)
const runs = Number(process.argv[3] ?? 1000)
const prompt = 'Explain the main types of machine learning'
const names: Record<ModelId, string> = {
  gpt4: 'GPT-4',
  gpt35: 'GPT-3.5 Turbo',
  mistral: 'Mistral 7B',
  claude3: 'Claude 3 Opus',
}
const ids = Object.keys(MODEL_BASELINES) as ModelId[]
const mark = (b: boolean) => (b ? 'pass' : 'FAIL')

const rng = seededRng(seed)
let out = `# Sample evaluation report\n\n`
out += `Produced by \`npm run report\` (seed ${seed}). Scores are simulated: they come from per-model baselines, response length, a keyword check and a seeded random source, not from a real model or fact check.\n\n`
out += `Prompt: \`${prompt}\`\n\n## Single run\n\n`
out += `| Model | Overall | Decision | Grounding | Halluc. risk (level) | Confidence | Consistency | Toxicity | Words |\n|---|---|---|---|---|---|---|---|---|\n`
const detail: string[] = []
for (const id of ids) {
  const e = evaluateResponse(id, generateMockResponse(id, prompt), rng)
  const m = e.metrics
  out += `| ${names[id]} | ${m.overallScore} | ${e.passed ? 'PASS' : 'FAIL'} | ${m.groundingScore} | ${m.hallucinationRisk}% (${m.hallucinationLevel}) | ${m.confidence} | ${m.consistencyScore} | ${m.toxicity} | ${m.answerLength} |\n`
  detail.push(`- ${names[id]}: ${e.checks.map((c) => `${c.name} ${mark(c.passed)}`).join('; ')}`)
}
out += `\nGuardrail checks:\n\n${detail.join('\n')}\n`

out += `\n## Pass rate over ${runs} seeded runs per model\n\n`
out += `| Model | Pass rate | Mean overall | Mean grounding | Toxicity not Low |\n|---|---|---|---|---|\n`
for (const id of ids) {
  const text = generateMockResponse(id, prompt)
  let pass = 0
  let overall = 0
  let grounding = 0
  let tox = 0
  for (let i = 0; i < runs; i++) {
    const e = evaluateResponse(id, text, rng)
    if (e.passed) pass++
    overall += e.metrics.overallScore
    grounding += e.metrics.groundingScore
    if (e.metrics.toxicity !== 'Low') tox++
  }
  const pct = (n: number) => `${((100 * n) / runs).toFixed(1)}%`
  out += `| ${names[id]} | ${pct(pass)} | ${(overall / runs).toFixed(1)} | ${(grounding / runs).toFixed(1)} | ${pct(tox)} |\n`
}
out += `\nNote: the PASS decision does not include toxicity; the toxicity guardrail is shown separately in the checks above.\n`

writeFileSync(new URL('../docs/sample-report.md', import.meta.url), out)
console.log(out)
