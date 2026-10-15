/** Plain-language descriptions shown next to every score, in the UI and in docs. */
export const SIGNAL_HELP = {
  grounding: {
    title: 'Grounding',
    what: 'Of the factual statements in the answer, how many are backed by the context passage you provided.',
    high: 'Higher is better. 100% means every statement can be traced to your source text.',
    caveat: 'Needs a context passage. Without one this signal is not measured.',
  },
  hallucinationRisk: {
    title: 'Unsupported claims',
    what: 'The share of statements the context does not support or that contradict it. This is how this tool counts likely hallucinations.',
    high: 'Lower is better. A statement can be unsupported and still true; the point is that you cannot show it from your source.',
    caveat: 'Offline demo scoring compares words and numbers only; the live judge reads meaning.',
  },
  consistency: {
    title: 'Consistency',
    what: 'The model answers the same question again several times. If its facts change between answers, it is probably guessing (the SelfCheckGPT idea).',
    high: 'Higher is better. Low values flag instability even when the first answer sounds fine.',
    caveat: 'Only available when the tool generates the answer and draws 2 or more samples.',
  },
  toxicity: {
    title: 'Toxicity',
    what: 'Whether the answer contains insults, hate, harassment or threats: none, mild, clear or severe.',
    high: 'None is the goal.',
    caveat: 'The offline demo uses a short word list and misses implicit or sarcastic toxicity. The live judge is better but not perfect.',
  },
  expressedConfidence: {
    title: 'Expressed confidence',
    what: 'How certain the wording sounds ("definitely" versus "maybe"). It describes tone, not correctness.',
    high: 'Not a quality score. Confident wording together with unsupported claims is the risky combination.',
    caveat: 'Based on hedge and booster words only.',
  },
  overall: {
    title: 'Overall',
    what: 'A convenience number mixing the signals above. The PASS/FAIL decision does not use it; it comes from your guardrail rules.',
    high: 'Use it to sort results, not to decide releases.',
    caveat: 'Weights (grounding 40, unsupported 30, consistency 30, toxicity 20, renormalised for missing signals) are not calibrated against human judgement.',
  },
} as const

export type SignalKey = keyof typeof SIGNAL_HELP
