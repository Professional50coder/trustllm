'use client'

import React from "react"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Zap } from 'lucide-react'

interface EvaluationFormProps {
  onSubmit: (prompt: string, models: string[]) => void
  isLoading: boolean
}

const availableModels = [
  { id: 'gpt4', name: 'GPT-4', provider: 'OpenAI' },
  { id: 'gpt35', name: 'GPT-3.5', provider: 'OpenAI' },
  { id: 'mistral', name: 'Mistral', provider: 'Mistral AI' }
]

export function EvaluationForm({ onSubmit, isLoading }: EvaluationFormProps) {
  const [prompt, setPrompt] = useState('')
  const [selectedModels, setSelectedModels] = useState<string[]>(['gpt4', 'gpt35'])

  const handleModelToggle = (modelId: string) => {
    setSelectedModels((prev) =>
      prev.includes(modelId)
        ? prev.filter((m) => m !== modelId)
        : [...prev, modelId]
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (prompt.trim() && selectedModels.length > 0) {
      onSubmit(prompt, selectedModels)
    }
  }

  return (
    <Card className="border-border bg-card p-6">
      <h2 className="mb-6 text-xl font-bold text-card-foreground">LLM Evaluation Playground</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Prompt Input */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-card-foreground">Prompt</label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your prompt here..."
            className="min-h-32 resize-none bg-secondary text-foreground border-border"
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">
            Enter the prompt you want to evaluate across multiple LLMs.
          </p>
        </div>

        {/* Model Selection */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-card-foreground">Models to Evaluate</label>
          <div className="grid gap-3">
            {availableModels.map((model) => (
              <div
                key={model.id}
                onClick={() => !isLoading && handleModelToggle(model.id)}
                className={`cursor-pointer rounded-lg border-2 p-3 transition-all ${
                  selectedModels.includes(model.id)
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-secondary'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`h-4 w-4 rounded border ${
                      selectedModels.includes(model.id)
                        ? 'border-primary bg-primary'
                        : 'border-border bg-secondary'
                    }`}
                  />
                  <div>
                    <p className="font-medium text-card-foreground">{model.name}</p>
                    <p className="text-xs text-muted-foreground">{model.provider}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          size="lg"
          className="w-full gap-2"
          disabled={isLoading || !prompt.trim() || selectedModels.length === 0}
        >
          {isLoading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              Evaluating...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              Run Evaluation
            </>
          )}
        </Button>
      </form>
    </Card>
  )
}
