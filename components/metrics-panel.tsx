'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { generateMetrics, isPass } from '@/lib/scoring'
import { AlertCircle, CheckCircle2, AlertTriangle, TrendingUp, BarChart3 } from 'lucide-react'

interface MetricsPanelProps {
  modelId: string
  modelName: string
  response: string
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
  const meets = value >= threshold
  
  const colorClasses = {
    primary: 'bg-primary',
    accent: 'bg-accent',
    green: 'bg-green-500'
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase text-muted-foreground">{label}</span>
        <span className={`text-2xl font-bold ${meets ? 'text-green-400' : value >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
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
        {meets ? '✓ Passes threshold' : '✗ Below threshold'}
      </p>
    </div>
  )
}

export function MetricsPanel({ modelId, modelName, response }: MetricsPanelProps) {
  const metrics = generateMetrics(modelId, response)

  // WHY: Determine overall pass/fail status based on composite score
  // This simulates guardrail evaluation logic
  const isOverallPass = isPass(metrics)

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
