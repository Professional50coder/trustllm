'use client'

import React from 'react'
import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Zap, AlertCircle, Info } from 'lucide-react'

interface EvaluationFormProps {
  onSubmit: (prompt: string, models: string[]) => void
  isLoading: boolean
}

// WHY: Define model configurations centrally to allow easy additions/removals and maintain single source of truth
// Each model has metadata about its provider, tier (enterprise/standard), and relative cost for API calls
const availableModels = [
  { 
    id: 'gpt4', 
    name: 'GPT-4', 
    provider: 'OpenAI',
    tier: 'enterprise',
    costPerCall: 0.03,
    description: 'Most capable, best for complex reasoning'
  },
  { 
    id: 'gpt35', 
    name: 'GPT-3.5 Turbo', 
    provider: 'OpenAI',
    tier: 'standard',
    costPerCall: 0.001,
    description: 'Fast and cost-effective general purpose'
  },
  { 
    id: 'mistral', 
    name: 'Mistral 7B', 
    provider: 'Mistral AI',
    tier: 'standard',
    costPerCall: 0.0001,
    description: 'Open-source, excellent performance/cost ratio'
  },
  {
    id: 'claude3',
    name: 'Claude 3 Opus',
    provider: 'Anthropic',
    tier: 'enterprise',
    costPerCall: 0.015,
    description: 'Strong reasoning and instruction following'
  }
]

export function EvaluationForm({ onSubmit, isLoading }: EvaluationFormProps) {
  const [prompt, setPrompt] = useState('')
  const [selectedModels, setSelectedModels] = useState<string[]>(['gpt4', 'gpt35'])
  const [charCount, setCharCount] = useState(0)
  const [showCostWarning, setShowCostWarning] = useState(false)

  // WHY: Use memoized callback to avoid re-creating the function on every render
  // This prevents unnecessary re-renders of child components if this were passed down
  const handleModelToggle = useCallback((modelId: string) => {
    setSelectedModels((prev) => {
      const newSelection = prev.includes(modelId)
        ? prev.filter((m) => m !== modelId)
        : [...prev, modelId]
      
      // WHY: Calculate estimated cost and warn if it exceeds threshold ($0.05)
      // This helps users understand API cost implications before running expensive evaluations
      const totalCost = newSelection.reduce((acc, id) => {
        const model = availableModels.find((m) => m.id === id)
        return acc + (model?.costPerCall || 0)
      }, 0)
      
      setShowCostWarning(totalCost > 0.05)
      return newSelection
    })
  }, [])

  // WHY: Track character count in real-time for user feedback
  // Longer prompts often produce more detailed responses but may cost more and take longer
  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newPrompt = e.target.value
    setPrompt(newPrompt)
    setCharCount(newPrompt.length)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // WHY: Validate prompt content and model selection before calling parent callback
    // Prevents unnecessary API calls with empty prompts or no model selection
    if (prompt.trim().length >= 10 && selectedModels.length > 0) {
      onSubmit(prompt, selectedModels)
    }
  }

  // WHY: Calculate estimated evaluation time based on selected models and prompt length
  // Longer prompts and more models = longer evaluation time, helping set user expectations
  const estimatedTime = selectedModels.length * (Math.ceil(charCount / 50) + 2)
  const minModels = 1
  const maxModels = 4
  const isAtMaxModels = selectedModels.length >= maxModels

  return (
    <Card className="border-border bg-card p-6">
      <h2 className="mb-6 text-xl font-bold text-card-foreground">
        LLM Evaluation Playground
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Prompt Input Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-card-foreground">
              Prompt <span className="text-destructive">*</span>
            </label>
            <span className={`text-xs ${charCount < 10 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {charCount} / 2000 characters
            </span>
          </div>
          <Textarea
            value={prompt}
            onChange={handlePromptChange}
            placeholder="Describe what you want to evaluate. E.g., 'Explain quantum computing in simple terms'"
            className="min-h-32 resize-none bg-secondary text-foreground border-border"
            disabled={isLoading}
            maxLength={2000}
          />
          <p className="text-xs text-muted-foreground">
            ℹ️ Enter a detailed prompt for better evaluation results. Minimum 10 characters required.
          </p>
        </div>

        {/* Model Selection Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-card-foreground">
              Models to Evaluate <span className="text-destructive">*</span>
            </label>
            <span className="text-xs text-muted-foreground">
              {selectedModels.length} / {maxModels} selected
            </span>
          </div>

          {/* WHY: Display models in a scrollable grid with visual feedback for selection state
              This allows comparing many models while keeping the UI organized */}
          <div className="grid gap-2">
            {availableModels.map((model) => {
              const isSelected = selectedModels.includes(model.id)
              const isDisabled = !isSelected && isAtMaxModels
              
              return (
                <div
                  key={model.id}
                  onClick={() => !isLoading && !isDisabled && handleModelToggle(model.id)}
                  className={`cursor-pointer rounded-lg border-2 p-3 transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-secondary hover:border-primary/50'
                  } ${isLoading || isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <div
                      className={`mt-1 h-4 w-4 flex-shrink-0 rounded border transition-all ${
                        isSelected
                          ? 'border-primary bg-primary'
                          : 'border-border bg-secondary'
                      }`}
                    >
                      {isSelected && (
                        <div className="flex h-full w-full items-center justify-center text-xs text-primary-foreground">
                          ✓
                        </div>
                      )}
                    </div>
                    
                    {/* Model Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-card-foreground">{model.name}</p>
                        <span className="text-xs rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                          {model.tier}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{model.provider} • ${model.costPerCall.toFixed(4)}/call</p>
                      <p className="text-xs text-muted-foreground mt-1">{model.description}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Cost Warning Alert */}
        {showCostWarning && (
          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3 flex gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-100">
              <p className="font-semibold">High cost evaluation detected</p>
              <p className="text-xs text-yellow-200 mt-1">
                Selected models will cost approximately ${(selectedModels.reduce((acc, id) => {
                  const model = availableModels.find((m) => m.id === id)
                  return acc + (model?.costPerCall || 0)
                }, 0)).toFixed(4)} per evaluation
              </p>
            </div>
          </div>
        )}

        {/* Estimated Metrics */}
        {selectedModels.length > 0 && charCount >= 10 && (
          <div className="rounded-lg border border-border bg-secondary p-3">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Models</p>
                <p className="font-semibold text-foreground">{selectedModels.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Est. Time</p>
                <p className="font-semibold text-foreground">~{estimatedTime}s</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Prompt Length</p>
                <p className="font-semibold text-foreground">{Math.ceil(charCount / 10) * 10} chars</p>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button with Validation Feedback */}
        <Button
          type="submit"
          size="lg"
          className="w-full gap-2"
          disabled={isLoading || charCount < 10 || selectedModels.length === 0}
        >
          {isLoading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              Evaluating... ({estimatedTime}s)
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              Run Evaluation
            </>
          )}
        </Button>

        {/* Validation Messages */}
        {charCount < 10 && charCount > 0 && (
          <p className="text-xs text-destructive">Prompt must be at least 10 characters</p>
        )}
        {selectedModels.length === 0 && (
          <p className="text-xs text-destructive">Please select at least one model</p>
        )}
      </form>
    </Card>
  )
}
