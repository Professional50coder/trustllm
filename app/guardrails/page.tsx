'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Navigation } from '@/components/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Settings, ArrowLeft, Plus, Trash2, Save } from 'lucide-react'

interface GuardrailRule {
  id: string
  name: string
  description: string
  type: 'citation' | 'safety' | 'score' | 'toxicity' | 'custom'
  enabled: boolean
  config?: Record<string, any>
}

export default function GuardrailsPage() {
  const [rules, setRules] = useState<GuardrailRule[]>([
    {
      id: '1',
      name: 'Require Citations',
      description: 'All responses must include at least one citation or reference',
      type: 'citation',
      enabled: true,
      config: { minCitations: 1 }
    },
    {
      id: '2',
      name: 'Block Unsafe Content',
      description: 'Automatically reject responses containing unsafe or sensitive information',
      type: 'safety',
      enabled: true,
      config: { threshold: 'high' }
    },
    {
      id: '3',
      name: 'Minimum Grounding Score',
      description: 'Responses must maintain grounding score above specified threshold',
      type: 'score',
      enabled: true,
      config: { threshold: 80 }
    },
    {
      id: '4',
      name: 'Toxicity Threshold',
      description: 'Block responses with toxicity risk higher than medium',
      type: 'toxicity',
      enabled: false,
      config: { maxLevel: 'medium' }
    },
    {
      id: '5',
      name: 'Answer Consistency',
      description: 'Ensure answer consistency score is above 85%',
      type: 'custom',
      enabled: false,
      config: { minConsistency: 85 }
    }
  ])

  const [editingRule, setEditingRule] = useState<GuardrailRule | null>(null)

  const toggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, enabled: !r.enabled } : r
      )
    )
  }

  const deleteRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id))
  }

  const updateRule = (rule: GuardrailRule) => {
    setRules((prev) =>
      prev.map((r) => (r.id === rule.id ? rule : r))
    )
    setEditingRule(null)
  }

  const ruleTypeColors: Record<string, { bg: string; text: string }> = {
    citation: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
    safety: { bg: 'bg-red-500/10', text: 'text-red-400' },
    score: { bg: 'bg-green-500/10', text: 'text-green-400' },
    toxicity: { bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
    custom: { bg: 'bg-purple-500/10', text: 'text-purple-400' }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-foreground">Guardrails Configuration</h1>
          </div>
          <p className="text-muted-foreground">
            Define rules to automatically validate and filter LLM responses before deployment
          </p>
        </div>

        {/* Info Card */}
        <Card className="border-border bg-card/50 p-6 mb-8">
          <h3 className="font-semibold text-card-foreground mb-2">How Guardrails Work</h3>
          <p className="text-sm text-muted-foreground">
            Guardrails are automatically applied to evaluation results. Each response is validated against all enabled rules. 
            Responses that fail any rule are marked as FAIL and require manual review before deployment.
          </p>
        </Card>

        {/* Rules List */}
        <div className="space-y-4 mb-8">
          {rules.map((rule) => (
            <Card key={rule.id} className="border-border bg-card p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-card-foreground text-lg">{rule.name}</h3>
                    <Badge 
                      className={`${ruleTypeColors[rule.type].bg} ${ruleTypeColors[rule.type].text} border-0`}
                    >
                      {rule.type.charAt(0).toUpperCase() + rule.type.slice(1)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{rule.description}</p>

                  {/* Rule Config Display */}
                  {rule.config && (
                    <div className="rounded-lg bg-secondary/50 p-3 mb-4">
                      {rule.type === 'score' && (
                        <p className="text-xs text-muted-foreground">
                          Minimum threshold: <span className="font-semibold text-foreground">{rule.config.threshold}%</span>
                        </p>
                      )}
                      {rule.type === 'toxicity' && (
                        <p className="text-xs text-muted-foreground">
                          Maximum level: <span className="font-semibold text-foreground capitalize">{rule.config.maxLevel}</span>
                        </p>
                      )}
                      {rule.type === 'citation' && (
                        <p className="text-xs text-muted-foreground">
                          Minimum citations: <span className="font-semibold text-foreground">{rule.config.minCitations}</span>
                        </p>
                      )}
                      {rule.type === 'custom' && (
                        <p className="text-xs text-muted-foreground">
                          Minimum consistency: <span className="font-semibold text-foreground">{rule.config.minConsistency}%</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className={`h-6 w-11 rounded-full transition-colors flex-shrink-0 ${rule.enabled ? 'bg-primary' : 'bg-muted'}`}>
                    <button
                      onClick={() => toggleRule(rule.id)}
                      className={`h-5 w-5 rounded-full bg-white transition-transform ${
                        rule.enabled ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteRule(rule.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Add New Rule */}
        <Card className="border-border bg-card/50 p-6 mb-8">
          <h3 className="font-bold text-card-foreground mb-4 flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add New Guardrail Rule
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-card-foreground mb-2">
                Rule Name
              </label>
              <Input
                placeholder="e.g., Require Model Confidence Above 90%"
                className="bg-secondary border-border text-foreground"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-card-foreground mb-2">
                Description
              </label>
              <Textarea
                placeholder="Describe what this rule validates..."
                className="bg-secondary border-border text-foreground min-h-24 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-card-foreground mb-2">
                Rule Type
              </label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {['citation', 'safety', 'score', 'toxicity', 'custom'].map((type) => (
                  <button
                    key={type}
                    className="rounded-lg border border-border bg-secondary p-3 text-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <Button className="w-full gap-2">
              <Plus className="h-4 w-4" />
              Create Rule
            </Button>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button size="lg" className="gap-2">
            <Save className="h-4 w-4" />
            Save All Changes
          </Button>
          <Button size="lg" variant="outline">
            Discard Changes
          </Button>
        </div>
      </div>
    </div>
  )
}
