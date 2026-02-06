'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Navigation } from '@/components/navigation'
import { EvaluationForm } from '@/components/evaluation-form'
import { MetricsPanel } from '@/components/metrics-panel'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart3, Settings, History, ArrowLeft } from 'lucide-react'

function generateMockResponse(modelId: string, prompt: string) {
  const responses: Record<string, string> = {
    gpt4: `Based on your query about "${prompt}", here's a comprehensive analysis. Machine learning fundamentals are built on statistical principles and optimization techniques. The key concepts include supervised learning, where models learn from labeled data, and unsupervised learning, which discovers patterns in unlabeled data. Deep learning represents a subset of machine learning that uses artificial neural networks with multiple layers.

The grounding of this response is strong because it directly addresses the core concept with clear definitions and relationships between ideas. Each statement is based on well-established computer science principles.`,
    gpt35: `Regarding "${prompt}", machine learning is a field of artificial intelligence that enables systems to learn and improve. It involves training algorithms on data to make predictions or decisions. There are different types of machine learning approaches including supervised, unsupervised, and reinforcement learning.

The explanation covers the basics, though it could provide more depth on specific applications and methodologies.`,
    mistral: `For your question about "${prompt}", machine learning is the study of algorithms that can learn from and make predictions or decisions based on data. It's a core technique in artificial intelligence. Key areas include classification, regression, clustering, and reinforcement learning. Modern applications range from image recognition to natural language processing.

This response provides solid foundational knowledge while connecting to real-world applications effectively.`
  }

  return responses[modelId] || responses.gpt4
}

export default function DashboardPage() {
  const [prompt, setPrompt] = useState('')
  const [selectedModels, setSelectedModels] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [evaluationResults, setEvaluationResults] = useState<boolean>(false)

  const handleEvaluation = async (newPrompt: string, models: string[]) => {
    setPrompt(newPrompt)
    setSelectedModels(models)
    setIsLoading(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))

    setIsLoading(false)
    setEvaluationResults(true)
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-foreground">Evaluation Dashboard</h1>
          </div>
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
              Audit Logs
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
                {evaluationResults && selectedModels.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold text-foreground">Evaluation Results</h2>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEvaluationResults(false)}
                      >
                        Clear Results
                      </Button>
                    </div>

                    {/* Results Grid */}
                    <div className="grid gap-6 md:grid-cols-1">
                      {selectedModels.map((modelId) => {
                        const modelNames: Record<string, string> = {
                          gpt4: 'GPT-4',
                          gpt35: 'GPT-3.5 Turbo',
                          mistral: 'Mistral 7B'
                        }

                        const response = generateMockResponse(modelId, prompt)

                        return (
                          <MetricsPanel
                            key={modelId}
                            modelId={modelId}
                            modelName={modelNames[modelId]}
                            response={response}
                          />
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <Card className="border-border bg-card/50 p-12 text-center">
                    <BarChart3 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="mb-2 text-lg font-semibold text-muted-foreground">No Results Yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Enter a prompt and select models to see evaluation results
                    </p>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Guardrails Tab */}
          <TabsContent value="guardrails">
            <Card className="border-border bg-card p-8">
              <h2 className="mb-6 text-2xl font-bold text-card-foreground">Guardrails Configuration</h2>
              <p className="mb-6 text-muted-foreground">
                Configure rules to automatically validate LLM responses against your requirements.
              </p>

              <div className="space-y-4">
                {[
                  {
                    name: 'Require Citations',
                    description: 'Reject responses that don\'t include citations',
                    enabled: true
                  },
                  {
                    name: 'Block Unsafe Content',
                    description: 'Automatically block responses flagged as unsafe or sensitive',
                    enabled: true
                  },
                  {
                    name: 'Minimum Grounding Score',
                    description: 'Require grounding score above 80%',
                    enabled: true
                  },
                  {
                    name: 'Hallucination Threshold',
                    description: 'Block responses with hallucination risk higher than medium',
                    enabled: false
                  },
                  {
                    name: 'Consistency Check',
                    description: 'Validate answer consistency above 85%',
                    enabled: false
                  }
                ].map((rule) => (
                  <div
                    key={rule.name}
                    className="flex items-start justify-between rounded-lg border border-border bg-secondary p-4"
                  >
                    <div>
                      <p className="font-semibold text-card-foreground">{rule.name}</p>
                      <p className="text-sm text-muted-foreground">{rule.description}</p>
                    </div>
                    <div className={`h-6 w-11 rounded-full transition-colors ${rule.enabled ? 'bg-primary' : 'bg-muted'}`}>
                      <div
                        className={`h-5 w-5 rounded-full bg-white transition-transform ${
                          rule.enabled ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <Button className="mt-6" size="lg">
                Save Configuration
              </Button>
            </Card>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs">
            <Card className="border-border bg-card p-8">
              <h2 className="mb-6 text-2xl font-bold text-card-foreground">Audit Logs</h2>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Timestamp</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Model</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Score</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { timestamp: '2024-02-06 14:32', model: 'GPT-4', score: '92%', status: 'PASS' },
                      { timestamp: '2024-02-06 14:28', model: 'GPT-3.5', score: '85%', status: 'PASS' },
                      { timestamp: '2024-02-06 14:25', model: 'Mistral', score: '88%', status: 'PASS' },
                      { timestamp: '2024-02-06 14:20', model: 'GPT-4', score: '78%', status: 'FAIL' },
                      { timestamp: '2024-02-06 14:15', model: 'GPT-3.5', score: '91%', status: 'PASS' }
                    ].map((entry, idx) => (
                      <tr key={idx} className="border-b border-border hover:bg-secondary/50">
                        <td className="px-4 py-3 text-foreground">{entry.timestamp}</td>
                        <td className="px-4 py-3 text-foreground">{entry.model}</td>
                        <td className="px-4 py-3 text-foreground font-semibold">{entry.score}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                              entry.status === 'PASS'
                                ? 'bg-green-500/10 text-green-400'
                                : 'bg-red-500/10 text-red-400'
                            }`}
                          >
                            {entry.status === 'PASS' ? '✓' : '✗'} {entry.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
