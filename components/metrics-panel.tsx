'use client'

import React from "react"

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react'

interface MetricsPanelProps {
  modelId: string
  modelName: string
  response: string
}

function generateMockMetrics(modelId: string) {
  const baseScore = modelId === 'gpt4' ? 0.92 : modelId === 'gpt35' ? 0.85 : 0.88
  const variance = Math.random() * 0.08

  return {
    groundingScore: Math.round((baseScore + variance) * 100),
    hallucination: modelId === 'gpt4' ? 'Low' : modelId === 'gpt35' ? 'Medium' : 'Low',
    confidence: Math.round((baseScore * 100 + Math.random() * 10)),
    toxicity: Math.random() > 0.7 ? 'High' : Math.random() > 0.3 ? 'Medium' : 'Low',
    answerLength: Math.floor(Math.random() * 200) + 150,
    consistency: Math.round((baseScore * 100 + Math.random() * 5))
  }
}

function HallucinationBadge({ level }: { level: string }) {
  const variants: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
    'Low': {
      icon: <CheckCircle2 className="h-4 w-4" />,
      color: 'text-green-400',
      bg: 'bg-green-500/10 border-green-500/20'
    },
    'Medium': {
      icon: <AlertTriangle className="h-4 w-4" />,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10 border-yellow-500/20'
    },
    'High': {
      icon: <AlertCircle className="h-4 w-4" />,
      color: 'text-red-400',
      bg: 'bg-red-500/10 border-red-500/20'
    }
  }

  const variant = variants[level]

  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${variant.bg}`}>
      <span className={variant.color}>{variant.icon}</span>
      <span className="text-sm font-medium text-foreground">{level}</span>
    </div>
  )
}

export function MetricsPanel({ modelId, modelName, response }: MetricsPanelProps) {
  const metrics = generateMockMetrics(modelId)

  return (
    <Card className="border-border bg-card p-6">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-bold text-card-foreground">{modelName}</h3>
        <Badge variant="outline">{modelId.toUpperCase()}</Badge>
      </div>

      {/* Response Preview */}
      <div className="mb-6 space-y-2">
        <p className="text-xs font-semibold uppercase text-muted-foreground">Response</p>
        <div className="max-h-40 overflow-auto rounded-lg border border-border bg-secondary p-4">
          <p className="text-sm text-foreground leading-relaxed">{response}</p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Grounding Score */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Grounding Score</p>
          <div className="space-y-1">
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-primary">{metrics.groundingScore}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-secondary">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: `${metrics.groundingScore}%` }}
              />
            </div>
          </div>
        </div>

        {/* Confidence Score */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Confidence</p>
          <div className="space-y-1">
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-accent">{metrics.confidence}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-secondary">
              <div
                className="h-2 rounded-full bg-accent transition-all"
                style={{ width: `${metrics.confidence}%` }}
              />
            </div>
          </div>
        </div>

        {/* Hallucination Risk */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Hallucination Risk</p>
          <HallucinationBadge level={metrics.hallucination} />
        </div>

        {/* Toxicity */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Toxicity Risk</p>
          <HallucinationBadge level={metrics.toxicity} />
        </div>

        {/* Answer Length */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Answer Length</p>
          <p className="text-lg font-bold text-foreground">{metrics.answerLength} words</p>
        </div>

        {/* Consistency */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Consistency</p>
          <p className="text-lg font-bold text-foreground">{metrics.consistency}%</p>
        </div>
      </div>
    </Card>
  )
}
