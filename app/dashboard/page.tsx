'use client'

import { useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { Navigation } from '@/components/navigation'
import { EvaluationForm } from '@/components/evaluation-form'
import { MetricsPanel } from '@/components/metrics-panel'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart3, Settings, History, ArrowLeft, Save } from 'lucide-react'

/**
 * WHY: Model response templates with varying quality levels
 * Each model has a characteristic response style:
 * - GPT-4: Very comprehensive with strong grounding, includes evidence
 * - GPT-3.5: Good but sometimes lacks depth
 * - Mistral: Balanced, practical focus
 * - Claude: Thoughtful, structured approach
 * 
 * This simulates how different models respond differently to the same prompt
 */
function generateMockResponse(modelId: string, prompt: string): string {
  const templates: Record<string, (prompt: string) => string> = {
    // WHY: GPT-4 template includes reasoning markers and structured format
    // Higher quality responses tend to have clear structure and explicit reasoning
    gpt4: (p) => `# Analysis: ${p}

## Overview
Based on your query about "${p}", here's a comprehensive analysis grounded in established research and best practices.

## Core Concepts
Machine learning fundamentals are built on statistical principles and optimization techniques. The key concepts include:
- **Supervised Learning**: Models learn from labeled data with known outcomes
- **Unsupervised Learning**: Discovers patterns in unlabeled data through algorithms like clustering
- **Deep Learning**: Uses artificial neural networks with multiple layers for complex pattern recognition

## Evidence & Grounding
These definitions are based on foundational computer science principles published in peer-reviewed venues. Each concept builds on established mathematical frameworks in optimization and probability theory.

## Practical Applications
From computer vision to natural language processing, these techniques power modern AI systems. The grounding of this response is strong because each statement directly addresses your core question with clear definitions and verifiable relationships between ideas.

## Conclusion
Understanding these fundamentals is essential for any modern data practitioner working with machine learning systems.`,

    // WHY: GPT-3.5 template is shorter, more direct, but sometimes less detailed
    gpt35: (p) => `## Response to: ${p}

Machine learning is a field of artificial intelligence that enables systems to learn and improve from experience. It involves training algorithms on data to make predictions or decisions.

### Types of Machine Learning
- **Supervised Learning**: Uses labeled training data
- **Unsupervised Learning**: Finds patterns in unlabeled data
- **Reinforcement Learning**: Learns through rewards and penalties

These are the main approaches, though there are many variations and hybrid methods in practice. The explanation covers the basics, though it could provide more depth on specific applications and methodologies depending on your use case.`,

    // WHY: Mistral template balances practical application focus
    // Known for being direct and cost-effective while maintaining quality
    mistral: (p) => `## Question: ${p}

Machine learning is the study of algorithms that can learn from and make predictions or decisions based on data. It's a core technique in artificial intelligence.

Key areas include:
- Classification: Predicting categories
- Regression: Predicting continuous values
- Clustering: Grouping similar data
- Reinforcement Learning: Learning through interaction

Modern applications range from image recognition to natural language processing, with implementations in healthcare, finance, and autonomous systems. This response provides solid foundational knowledge while connecting to real-world applications effectively.`,

    // WHY: Claude template includes explicit uncertainty and nuance
    claude3: (p) => `## Thoughtful Analysis: ${p}

When considering "${p}", I'd like to offer a structured perspective on machine learning.

### Foundational Understanding
Machine learning represents a paradigm where systems improve through data rather than explicit programming. This involves using statistical methods and optimization algorithms.

### Key Learning Paradigms
The field typically distinguishes between supervised approaches (learning from labeled examples), unsupervised approaches (discovering patterns), and reinforcement learning (learning through rewards).

### Important Nuances
It's worth noting that these categories often overlap in practice, and modern systems frequently combine multiple approaches. The choice of approach depends significantly on your specific problem domain and data characteristics.

### Grounding Consideration
This response is grounded in widely-accepted definitions from the machine learning research community, though specific implementations may vary based on context and requirements.`
  }

  return templates[modelId]?.(prompt) || templates.gpt4(prompt)
}

/**
 * WHY: Type definitions for evaluation results
 * Provides type safety and clear data contract for evaluation results
 * Helps catch errors at compile time rather than runtime
 */
interface EvaluationResult {
  modelId: string
  modelName: string
  response: string
  timestamp: Date
  status: 'pending' | 'complete' | 'error'
}

export default function DashboardPage() {
  // WHY: Separate state for prompt, models, and results
  // This allows users to modify form while keeping previous results visible
  const [prompt, setPrompt] = useState('')
  const [selectedModels, setSelectedModels] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [evaluationResults, setEvaluationResults] = useState(false) // Added state
  
  // WHY: Track evaluation history for audit and comparison purposes
  // In production, this would be persisted to a database
  const [evaluationHistory, setEvaluationHistory] = useState<EvaluationResult[]>([])
  
  // WHY: Guard rail configuration state
  // Allows dynamic updates to guardrails without page reload
  const [guardrailsEnabled, setGuardrailsEnabled] = useState({
    requireCitations: true,
    blockUnsafe: true,
    minGroundingScore: 80,
    maxHallucination: 'medium' as const
  })

  // WHY: Model name mapping centralized for easy maintenance
  const modelNames: Record<string, string> = {
    gpt4: 'GPT-4',
    gpt35: 'GPT-3.5 Turbo',
    mistral: 'Mistral 7B',
    claude3: 'Claude 3 Opus'
  }

  /**
   * WHY: Memoized callback for evaluation submission
   * Prevents unnecessary re-renders and recreations of the callback
   * Handles the entire evaluation workflow with proper error handling
   */
  const handleEvaluation = useCallback(async (newPrompt: string, models: string[]) => {
    console.log('[v0] Starting evaluation:', { prompt: newPrompt, models })
    
    setPrompt(newPrompt)
    setSelectedModels(models)
    setIsLoading(true)
    setEvaluationResults(true) // Added to set evaluation results state

    try {
      // WHY: Simulate API call with realistic delay based on model count
      // More models = more time needed (parallel API calls in real system)
      const estimatedDelay = Math.min(models.length * 500, 2000)
      await new Promise((resolve) => setTimeout(resolve, estimatedDelay))

      // WHY: Generate results for each model
      // In production, this would come from actual LLM API calls
      const newResults: EvaluationResult[] = models.map((modelId) => ({
        modelId,
        modelName: modelNames[modelId] || modelId,
        response: generateMockResponse(modelId, newPrompt),
        timestamp: new Date(),
        status: 'complete' as const
      }))

      console.log('[v0] Evaluation complete:', { resultCount: newResults.length })

      // WHY: Update history and keep latest results at the top
      // Allows users to see previous evaluations
      setEvaluationHistory((prev) => [...newResults, ...prev.slice(0, 9)])
    } catch (error) {
      console.error('[v0] Evaluation error:', error)
    } finally {
      setIsLoading(false)
    }
  }, [modelNames])

  // WHY: Memoize results to prevent unnecessary re-renders of MetricsPanel
  // Only recalculates when evaluationHistory changes
  const currentResults = useMemo(
    () => evaluationHistory.filter((r) => r.status === 'complete'),
    [evaluationHistory]
  )

  // WHY: Calculate pass/fail statistics for guardrails
  // Shows how many evaluations passed all guardrail checks
  const evaluationStats = useMemo(() => {
    return {
      total: currentResults.length,
      passed: Math.floor(currentResults.length * 0.8), // Simulated pass rate
      failed: Math.ceil(currentResults.length * 0.2)
    }
  }, [currentResults])

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header with Stats */}
        <div className="mb-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <h1 className="text-3xl font-bold text-foreground">Evaluation Dashboard</h1>
            </div>
          </div>

          {/* WHY: Show evaluation statistics at the top for quick overview
              Helps users understand platform usage and guardrail effectiveness */}
          {currentResults.length > 0 && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">Total Evaluations</p>
                <p className="text-3xl font-bold text-foreground mt-2">{evaluationStats.total}</p>
              </Card>
              <Card className="border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">Passed Guardrails</p>
                <p className="text-3xl font-bold text-green-400 mt-2">{evaluationStats.passed}</p>
              </Card>
              <Card className="border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">Failed Guardrails</p>
                <p className="text-3xl font-bold text-red-400 mt-2">{evaluationStats.failed}</p>
              </Card>
            </div>
          )}
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="playground" className="space-y-6">
          <TabsList className="bg-secondary">
            <TabsTrigger value="playground" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Playground
            </TabsTrigger>
            <TabsTrigger value="guardrails" className="gap-2">
              <Settings className="h-4 w-4" />
              Guardrails
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Playground Tab */}
          <TabsContent value="playground" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left: Form */}
              <div className="lg:col-span-1">
                <EvaluationForm
                  onSubmit={handleEvaluation}
                  isLoading={isLoading}
                />
              </div>

              {/* Right: Results */}
              <div className="space-y-6 lg:col-span-2">
                {/* WHY: Show results if we have any from current evaluation
                    Users can immediately see how their prompt performs across models */}
                {currentResults.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-bold text-foreground">Evaluation Results</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                          {currentResults.length} model{currentResults.length !== 1 ? 's' : ''} evaluated
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEvaluationHistory([])}
                      >
                        Clear All
                      </Button>
                    </div>

                    {/* WHY: Render metrics panels in order of evaluation
                        Better models or earlier results shown first for comparison */}
                    <div className="grid gap-6 md:grid-cols-1">
                      {currentResults.map((result) => (
                        <MetricsPanel
                          key={`${result.modelId}-${result.timestamp.getTime()}`}
                          modelId={result.modelId}
                          modelName={result.modelName}
                          response={result.response}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <Card className="border-border bg-card/50 p-12 text-center">
                    <BarChart3 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="mb-2 text-lg font-semibold text-muted-foreground">
                      No Results Yet
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      Enter a prompt on the left and select models to compare their responses and evaluation metrics
                    </p>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Guardrails Tab - Enhanced with detailed explanations */}
          <TabsContent value="guardrails" className="space-y-6">
            <div className="space-y-6">
              {/* Info Card */}
              <Card className="border-border bg-primary/10 border-primary/30 p-6">
                <h3 className="font-semibold text-foreground mb-2">What are Guardrails?</h3>
                <p className="text-sm text-muted-foreground">
                  Guardrails are automated rules that validate LLM responses before they reach users. They ensure responses meet your quality, safety, and compliance standards. When a response fails a guardrail, it's either blocked or flagged for review.
                </p>
              </Card>

              {/* WHY: Group guardrails by category for better organization
                  Users can understand different types of guardrails and their purposes */}
              <Card className="border-border bg-card p-6">
                <h2 className="mb-6 text-2xl font-bold text-card-foreground">Response Quality Guardrails</h2>
                <p className="mb-6 text-sm text-muted-foreground">
                  Ensure responses meet minimum quality standards
                </p>

                <div className="space-y-4">
                  {[
                    {
                      name: 'Minimum Grounding Score',
                      description: 'Reject responses that score below 80% on grounding metrics',
                      enabled: guardrailsEnabled.minGroundingScore >= 80,
                      metric: '80%',
                      impactLevel: 'High' as const
                    },
                    {
                      name: 'Consistency Check',
                      description: 'Validate answer consistency above 85% to ensure logical coherence',
                      enabled: true,
                      metric: '85%',
                      impactLevel: 'Medium' as const
                    }
                  ].map((rule) => (
                    <div
                      key={rule.name}
                      className="flex items-start justify-between rounded-lg border border-border bg-secondary p-4"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-card-foreground">{rule.name}</p>
                          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                            {rule.metric}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{rule.description}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Impact: <span className={`font-semibold ${rule.impactLevel === 'High' ? 'text-red-400' : 'text-yellow-400'}`}>
                            {rule.impactLevel}
                          </span>
                        </p>
                      </div>
                      <div className={`h-6 w-11 rounded-full transition-colors flex-shrink-0 ${rule.enabled ? 'bg-green-500' : 'bg-muted'}`}>
                        <div
                          className={`h-5 w-5 rounded-full bg-white transition-transform ${
                            rule.enabled ? 'translate-x-5' : 'translate-x-0.5'
                          }`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Safety Guardrails */}
              <Card className="border-border bg-card p-6">
                <h2 className="mb-6 text-2xl font-bold text-card-foreground">Safety & Compliance Guardrails</h2>
                <p className="mb-6 text-sm text-muted-foreground">
                  Protect users and ensure regulatory compliance
                </p>

                <div className="space-y-4">
                  {[
                    {
                      name: 'Block Unsafe Content',
                      description: 'Automatically reject responses flagged as unsafe, harmful, or unethical',
                      enabled: guardrailsEnabled.blockUnsafe,
                      riskLevel: 'Critical' as const
                    },
                    {
                      name: 'Hallucination Blocker',
                      description: `Block responses with hallucination risk higher than ${guardrailsEnabled.maxHallucination}`,
                      enabled: true,
                      riskLevel: 'High' as const
                    },
                    {
                      name: 'Require Citations',
                      description: 'Ensure responses include verifiable citations for claims made',
                      enabled: guardrailsEnabled.requireCitations,
                      riskLevel: 'High' as const
                    }
                  ].map((rule) => (
                    <div
                      key={rule.name}
                      className="flex items-start justify-between rounded-lg border border-border bg-secondary p-4"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-card-foreground">{rule.name}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            rule.riskLevel === 'Critical' 
                              ? 'bg-red-500/20 text-red-300'
                              : 'bg-yellow-500/20 text-yellow-300'
                          }`}>
                            {rule.riskLevel}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{rule.description}</p>
                      </div>
                      <div className={`h-6 w-11 rounded-full transition-colors flex-shrink-0 ${rule.enabled ? 'bg-green-500' : 'bg-muted'}`}>
                        <div
                          className={`h-5 w-5 rounded-full bg-white transition-transform ${
                            rule.enabled ? 'translate-x-5' : 'translate-x-0.5'
                          }`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Save Configuration */}
              <div className="flex gap-3">
                <Button size="lg" className="gap-2">
                  <Save className="h-4 w-4" />
                  Save Configuration
                </Button>
                <Button variant="outline" size="lg">
                  Reset to Defaults
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* History Tab - Shows evaluation history with filtering */}
          <TabsContent value="logs" className="space-y-6">
            {/* WHY: Show history with filtering and analytics
                Helps users track evaluations over time and identify patterns */}
            {evaluationHistory.length > 0 ? (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid gap-4 md:grid-cols-4">
                  <Card className="border-border bg-card p-4">
                    <p className="text-xs text-muted-foreground">Total Evaluations</p>
                    <p className="text-3xl font-bold text-foreground mt-2">{evaluationHistory.length}</p>
                  </Card>
                  <Card className="border-border bg-card p-4">
                    <p className="text-xs text-muted-foreground">Average Score</p>
                    <p className="text-3xl font-bold text-accent mt-2">
                      {Math.round(evaluationStats.total > 0 ? (evaluationStats.passed / evaluationStats.total) * 100 : 0)}%
                    </p>
                  </Card>
                  <Card className="border-border bg-card p-4">
                    <p className="text-xs text-muted-foreground">Pass Rate</p>
                    <p className="text-3xl font-bold text-green-400 mt-2">
                      {Math.round(evaluationStats.total > 0 ? (evaluationStats.passed / evaluationStats.total) * 100 : 0)}%
                    </p>
                  </Card>
                  <Card className="border-border bg-card p-4">
                    <p className="text-xs text-muted-foreground">Models Tested</p>
                    <p className="text-3xl font-bold text-foreground mt-2">
                      {new Set(evaluationHistory.map(r => r.modelId)).size}
                    </p>
                  </Card>
                </div>

                {/* Evaluation History Table */}
                <Card className="border-border bg-card p-6">
                  <h2 className="mb-6 text-2xl font-bold text-card-foreground">Evaluation History</h2>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Model</th>
                          <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Time</th>
                          <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Response Length</th>
                          <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Status</th>
                          <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* WHY: Display most recent evaluations first for immediate visibility */}
                        {evaluationHistory.slice(0, 10).map((result, idx) => {
                          const responseLength = result.response.split(/\s+/).length
                          const isRecent = idx < 3

                          return (
                            <tr 
                              key={idx} 
                              className={`border-b border-border transition-colors ${
                                isRecent 
                                  ? 'bg-green-500/5 hover:bg-green-500/10' 
                                  : 'hover:bg-secondary/50'
                              }`}
                            >
                              <td className="px-4 py-3 text-foreground font-medium">{result.modelName}</td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {result.timestamp.toLocaleTimeString()}
                              </td>
                              <td className="px-4 py-3 text-foreground">
                                {responseLength} words
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold bg-green-500/10 text-green-400">
                                  ✓ Complete
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <Button variant="ghost" size="sm">
                                  View
                                </Button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {evaluationHistory.length > 10 && (
                    <div className="mt-4 text-center">
                      <Button variant="outline">
                        Load More ({evaluationHistory.length - 10} more)
                      </Button>
                    </div>
                  )}
                </Card>
              </div>
            ) : (
              <Card className="border-border bg-card/50 p-12 text-center">
                <History className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold text-muted-foreground">
                  No Evaluation History
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  Run evaluations in the Playground tab to see your history here. All evaluations are logged for compliance and analysis.
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
