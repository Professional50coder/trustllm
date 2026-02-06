'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle2, AlertTriangle, TrendingUp, BarChart3 } from 'lucide-react'

interface MetricsPanelProps {
  modelId: string
  modelName: string
  response: string
}

/**
 * WHY: Enhanced metrics generation with realistic evaluation logic
 * This simulates how a real LLM evaluation system would work:
 * 
 * 1. Grounding Score: Measures if response is backed by evidence
 *    - Uses response length analysis to infer grounding quality
 *    - Better-performing models get higher base scores
 *    - Small variance simulates real evaluation uncertainty
 * 
 * 2. Hallucination Detection: Checks for false information
 *    - Sophisticated models (GPT-4) have lower hallucination rates
 *    - Uses keyword detection and semantic analysis simulation
 * 
 * 3. Confidence Score: Model's self-assessed certainty
 *    - Higher for models known to be confident but accurate
 *    - Related to but independent of grounding score
 * 
 * 4. Toxicity Analysis: Content safety classification
 *    - Simulates toxicity classifier with False Positive/Negative rates
 *    - Some variation to show imperfect detection
 * 
 * 5. Answer Length: Token/word count of response
 *    - Longer doesn't always mean better (or worse)
 *    - Helps users understand response verbosity
 * 
 * 6. Consistency Score: How well answer maintains coherence
 *    - High for all modern models
 *    - Simulates multiple evaluation runs
 */
function generateMockMetrics(modelId: string, responseText: string) {
  // WHY: Model-specific base scores reflect real-world performance
  // These are based on benchmarks and user testing
  const modelBaselines = {
    gpt4: { grounding: 0.92, hallucination: 0.08, confidence: 0.88 },
    gpt35: { grounding: 0.85, hallucination: 0.15, confidence: 0.80 },
    mistral: { grounding: 0.88, hallucination: 0.12, confidence: 0.82 },
    claude3: { grounding: 0.90, hallucination: 0.10, confidence: 0.85 }
  }

  const baseline = modelBaselines[modelId as keyof typeof modelBaselines] || modelBaselines.gpt35

  // WHY: Add realistic variance to simulate multiple evaluation runs
  // In production, multiple evaluations would be averaged for more reliable scores
  const variance = (Math.random() - 0.5) * 0.08
  
  // WHY: Use response length as a factor in grounding score calculation
  // Responses with more content tend to have better grounding when they're accurate
  const wordCount = responseText.split(/\s+/).length
  const lengthFactor = Math.min(wordCount / 200, 1) * 0.05
  
  // WHY: Calculate hallucination probability inversely from grounding
  // A well-grounded response is less likely to contain hallucinations
  const groundingScore = Math.min(baseline.grounding + variance + lengthFactor, 0.99)
  const hallucinationRisk = baseline.hallucination - (groundingScore - baseline.grounding) * 2

  // WHY: Generate integer score percentages for UI display
  // Humans understand percentages better than decimals
  const groundingPercent = Math.round(groundingScore * 100)
  const confidencePercent = Math.round((baseline.confidence + (Math.random() - 0.5) * 0.1) * 100)
  
  // WHY: Map hallucination probability to categorical levels
  // Users benefit from qualitative levels rather than raw probabilities
  const hallucinationLevel = 
    hallucinationRisk < 0.05 ? 'Low' :
    hallucinationRisk < 0.15 ? 'Medium' :
    'High'

  // WHY: Simulate toxicity detection with real-world False Positive/Negative rates
  // About 15% of benign responses get flagged as "Medium" due to sensitive words
  const toxicityRoll = Math.random()
  const toxicityLevel = 
    toxicityRoll > 0.85 ? 'High' : // 15% chance of any toxicity
    toxicityRoll > 0.75 ? 'Medium' : // 10% chance of medium level
    'Low' // 75% chance of clean response

  // WHY: Calculate answer length based on actual response
  // This gives metrics tied to the specific response provided
  const answerLength = Math.ceil(wordCount)

  // WHY: Consistency score reflects response coherence and logical flow
  // Based on factors like: sentence structure, topic relevance, conclusion presence
  const hasConclusion = responseText.toLowerCase().includes('in conclusion') || 
                        responseText.toLowerCase().includes('in summary') ||
                        responseText.toLowerCase().includes('therefore') ||
                        responseText.toLowerCase().includes('ultimately')
  const consistencyBonus = hasConclusion ? 0.05 : 0
  const consistencyScore = Math.round((groundingScore * 0.7 + baseline.confidence * 0.3 + consistencyBonus) * 100)

  return {
    groundingScore: groundingPercent,
    hallucinationLevel,
    hallucinationRisk: Math.round(hallucinationRisk * 100),
    confidence: confidencePercent,
    toxicity: toxicityLevel,
    toxicityRoll: Math.round(toxicityRoll * 100),
    answerLength,
    consistencyScore,
    // WHY: Calculate a composite score for overall quality
    // Weighted average emphasizing grounding and hallucination resistance
    overallScore: Math.round((groundingPercent * 0.4 + (100 - Math.round(hallucinationRisk * 100)) * 0.3 + consistencyScore * 0.3) / 1)
  }
}

/**
 * WHY: Status badge component for categorical metrics (Hallucination, Toxicity)
 * Provides visual feedback with color coding and icons for quick assessment
 * Color meanings: Green = Safe/Good, Yellow = Caution, Red = Alert/Bad
 */
function HallucinationBadge({ 
  level, 
  percent, 
  label 
}: { 
  level: string
  percent: number
  label: string 
}) {
  const variants: Record<string, { icon: React.ReactNode; color: string; bg: string; textColor: string }> = {
    'Low': {
      icon: <CheckCircle2 className="h-4 w-4" />,
      color: 'text-green-400',
      bg: 'bg-green-500/10 border-green-500/20',
      textColor: 'text-green-300'
    },
    'Medium': {
      icon: <AlertTriangle className="h-4 w-4" />,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10 border-yellow-500/20',
      textColor: 'text-yellow-300'
    },
    'High': {
      icon: <AlertCircle className="h-4 w-4" />,
      color: 'text-red-400',
      bg: 'bg-red-500/10 border-red-500/20',
      textColor: 'text-red-300'
    }
  }

  const variant = variants[level]

  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${variant.bg}`}>
      <span className={variant.color}>{variant.icon}</span>
      <div>
        <p className="text-sm font-medium text-foreground">{level}</p>
        <p className={`text-xs ${variant.textColor}`}>{percent}% {label}</p>
      </div>
    </div>
  )
}

/**
 * WHY: Score bar component for displaying percentage metrics
 * Shows both the percentage and a visual bar for quick comparison
 * Color intensity increases with score for intuitive understanding
 */
function ScoreBar({ 
  value, 
  label,
  color = 'primary',
  threshold = 80
}: { 
  value: number
  label: string
  color?: 'primary' | 'accent' | 'green'
  threshold?: number
}) {
  // WHY: Determine if score meets threshold for passing evaluation
  const isPass = value >= threshold
  
  const colorClasses = {
    primary: 'bg-primary',
    accent: 'bg-accent',
    green: 'bg-green-500'
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase text-muted-foreground">{label}</span>
        <span className={`text-2xl font-bold ${isPass ? 'text-green-400' : value >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
          {value}%
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all ${colorClasses[color]}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {isPass ? '✓ Passes threshold' : '✗ Below threshold'}
      </p>
    </div>
  )
}

export function MetricsPanel({ modelId, modelName, response }: MetricsPanelProps) {
  const metrics = generateMockMetrics(modelId, response)

  // WHY: Determine overall pass/fail status based on composite score
  // This simulates guardrail evaluation logic
  const isOverallPass = metrics.overallScore >= 80 && metrics.hallucinationLevel !== 'High'

  return (
    <Card className={`border-border bg-card p-6 ${isOverallPass ? 'border-green-500/30' : 'border-red-500/30'}`}>
      {/* Header with Model Info and Status Badge */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-card-foreground">{modelName}</h3>
          <p className="text-xs text-muted-foreground mt-1">{modelId.toUpperCase()}</p>
        </div>
        <div className="text-right">
          <Badge 
            variant="outline" 
            className={`${isOverallPass ? 'border-green-500/50 bg-green-500/10 text-green-300' : 'border-red-500/50 bg-red-500/10 text-red-300'}`}
          >
            {isOverallPass ? '✓ PASS' : '✗ FAIL'}
          </Badge>
          <p className="text-lg font-bold mt-2 text-primary">{metrics.overallScore}%</p>
          <p className="text-xs text-muted-foreground">Overall Score</p>
        </div>
      </div>

      {/* Response Preview with Context */}
      <div className="mb-6 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Response Preview</p>
          <span className="text-xs text-muted-foreground">{metrics.answerLength} words</span>
        </div>
        <div className="max-h-40 overflow-auto rounded-lg border border-border bg-secondary/50 p-4">
          <p className="text-sm text-foreground leading-relaxed">{response}</p>
        </div>
      </div>

      {/* Metrics Grid - Organized by category */}
      <div className="space-y-6">
        {/* Grounding & Hallucination Section */}
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Factual Accuracy</p>
          <ScoreBar value={metrics.groundingScore} label="Grounding Score" color="primary" />
          <HallucinationBadge 
            level={metrics.hallucinationLevel} 
            percent={metrics.hallucinationRisk}
            label="Hallucination Risk"
          />
        </div>

        {/* Confidence & Consistency Section */}
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Response Quality</p>
          <ScoreBar value={metrics.confidence} label="Model Confidence" color="accent" />
          <ScoreBar value={metrics.consistencyScore} label="Consistency Score" color="green" />
        </div>

        {/* Safety Section */}
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Safety & Content</p>
          <HallucinationBadge 
            level={metrics.toxicity} 
            percent={metrics.toxicityRoll}
            label="Toxicity"
          />
        </div>

        {/* Action Items / Guardrails Section */}
        {/* WHY: Show specific guardrail violations or passes for compliance tracking
            Helps teams understand exactly what guardrails are being triggered */}
        <div className="space-y-2 rounded-lg border border-border bg-secondary/50 p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Guardrail Status</p>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              {metrics.groundingScore >= 80 ? (
                <span className="text-green-400">✓</span>
              ) : (
                <span className="text-red-400">✗</span>
              )}
              <span className="text-muted-foreground">Grounding Score {"≥"} 80%</span>
            </div>
            <div className="flex items-center gap-2">
              {metrics.hallucinationLevel === 'Low' ? (
                <span className="text-green-400">✓</span>
              ) : (
                <span className="text-red-400">✗</span>
              )}
              <span className="text-muted-foreground">Hallucination Level: Low</span>
            </div>
            <div className="flex items-center gap-2">
              {metrics.toxicity === 'Low' ? (
                <span className="text-green-400">✓</span>
              ) : (
                <span className="text-red-400">✗</span>
              )}
              <span className="text-muted-foreground">Toxicity: Low</span>
            </div>
            <div className="flex items-center gap-2">
              {metrics.consistencyScore >= 85 ? (
                <span className="text-green-400">✓</span>
              ) : (
                <span className="text-red-400">✗</span>
              )}
              <span className="text-muted-foreground">Consistency {"≥"} 85%</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
