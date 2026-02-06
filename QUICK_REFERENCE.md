# TrustLLM - Quick Reference Guide

## File Structure & Purpose

```
/app
  /dashboard
    page.tsx          - Main evaluation dashboard with tabs
  /guardrails
    page.tsx          - Guardrails configuration page
  /audit-logs
    page.tsx          - Evaluation history and logging
  /page.tsx           - Landing page
  layout.tsx          - Root layout with metadata

/components
  evaluation-form.tsx - Input form for prompts and models
  metrics-panel.tsx   - Display card for evaluation results
  navigation.tsx      - Header navigation
  /ui                 - Shadcn/ui components

/lib
  evaluation-logic.ts - Documentation of evaluation system
  utils.ts            - Utility functions (cn, etc.)

/public
  - Static assets

SYSTEM_ARCHITECTURE.md  - Complete system guide
QUICK_REFERENCE.md      - This file
```

---

## Component Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   TrustLLM Platform                          │
└─────────────────────────────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
    ┌────────┐        ┌────────┐       ┌─────────┐
    │Landing │        │Dashboard      │Guardrails
    │  Page  │        │ (Main UI)    │ Config
    │(Info)  │        │              │
    └────────┘        └────────┘       └─────────┘
                           │
         ┌─────────────────┼──────────────────┐
         │                 │                  │
         ▼                 ▼                  ▼
    ┌─────────┐      ┌──────────┐      ┌────────┐
    │Eval Form│      │Metrics   │      │History
    │(Input)  │──────│Panel     │      │Logs
    │         │      │(Results) │      │
    └─────────┘      └──────────┘      └────────┘
         │                 ▲
         │                 │
         └─────────────────┘
         (handleEvaluation)
```

---

## Key State Flow

### Dashboard State Management
```javascript
// INPUT STATE
const [prompt, setPrompt] = useState('')                    // User's typed prompt
const [selectedModels, setSelectedModels] = useState([])    // Which models to evaluate

// OUTPUT STATE
const [evaluationHistory, setEvaluationHistory] = useState([])  // All past evaluations

// UI STATE
const [isLoading, setIsLoading] = useState(false)           // Show loading spinner
const [guardrailsEnabled, setGuardrailsEnabled] = useState() // Guardrail settings

// DERIVED STATE (Memoized for performance)
const currentResults = useMemo(() => {
  return evaluationHistory.filter(r => r.status === 'complete')
}, [evaluationHistory])

const evaluationStats = useMemo(() => {
  return { total: currentResults.length, passed: ..., failed: ... }
}, [currentResults])
```

---

## Data Types

### EvaluationResult
```javascript
interface EvaluationResult {
  modelId: string           // 'gpt4', 'gpt35', 'mistral', 'claude3'
  modelName: string         // 'GPT-4', 'GPT-3.5 Turbo', etc.
  response: string          // The LLM's response text
  timestamp: Date           // When evaluation ran
  status: 'pending' | 'complete' | 'error'  // Current state
}
```

### MetricsPanel Props
```javascript
interface MetricsPanelProps {
  modelId: string      // Model identifier
  modelName: string    // Display name
  response: string     // Response text to analyze
}
```

### Guardrail Config
```javascript
interface GuardrailsConfig {
  minGroundingScore: number           // Threshold: 0-100
  maxHallucination: 'low' | 'medium'  // Acceptable risk level
  requireCitations: boolean           // Mandatory citations
  blockUnsafe: boolean                // Content filtering
}
```

---

## Evaluation Flow (Detailed)

### Step 1: User Submits
```javascript
// User clicks "Run Evaluation" button
// EvaluationForm.handleSubmit is called

handleSubmit(e: FormEvent) {
  e.preventDefault()
  // Validate: prompt length ≥ 10 chars
  // Validate: ≥ 1 model selected
  onSubmit(prompt, selectedModels)  // Call parent callback
}
```

### Step 2: Dashboard Receives
```javascript
// Dashboard.handleEvaluation is called
const handleEvaluation = async (newPrompt: string, models: string[]) => {
  setPrompt(newPrompt)                    // Update current prompt
  setSelectedModels(models)               // Update selected models
  setIsLoading(true)                      // Show spinner

  // Simulate API call
  await new Promise(resolve => 
    setTimeout(resolve, estimatedDelay)   // Wait: models.length * 500ms
  )

  // Generate results for each model
  const newResults = models.map(modelId => ({
    modelId,
    modelName: modelNames[modelId],
    response: generateMockResponse(modelId, newPrompt),  // Get response
    timestamp: new Date(),
    status: 'complete'
  }))

  setEvaluationHistory(prev => [...newResults, ...prev.slice(0, 9)])
  setIsLoading(false)                     // Hide spinner
}
```

### Step 3: Metrics Calculation
```javascript
// For each EvaluationResult, MetricsPanel calculates metrics
function generateMockMetrics(modelId: string, responseText: string) {
  // 1. Get model-specific baselines
  const baseline = modelBaselines[modelId]
  
  // 2. Calculate grounding score
  // - Analyze response structure
  // - Check topic relevance
  // - Apply model confidence adjustment
  const groundingScore = calculateGrounding(responseText, baseline)
  
  // 3. Detect hallucinations
  const hallucinationRisk = calculateHallucination(responseText, baseline)
  
  // 4. Extract confidence signal
  const confidence = calculateConfidence(responseText, baseline)
  
  // 5. Check consistency
  const consistency = calculateConsistency(responseText)
  
  // 6. Analyze safety
  const toxicity = calculateToxicity(responseText)
  
  // 7. Calculate composite score
  const overallScore = 
    (groundingScore * 0.4) +
    (consistency * 0.3) +
    (confidence * 0.2) +
    (toxicity * 0.1)
  
  return { groundingScore, hallucination, confidence, ... }
}
```

### Step 4: Guardrail Evaluation
```javascript
// MetricsPanel checks guardrails
const isOverallPass = 
  metrics.overallScore >= 80 &&
  metrics.hallucinationLevel !== 'High'

// Show as PASS (green) or FAIL (red)
// List specific guardrails passed/failed
```

### Step 5: Display Results
```javascript
// Results are rendered in MetricsPanel components
// Each model gets its own card
// Cards show:
// - Model name and ID
// - Pass/Fail badge
// - Metrics with progress bars
// - Guardrail checklist
// - Response preview (truncated)
```

---

## How Metrics Are Calculated

### Grounding Score Formula
```
factors = [
  citations_present(0-40),
  semantic_relevance(0-30),
  concept_explanation(0-20),
  length_adjustment(-10 to +10)
]
groundingScore = sum(factors) / 100
```

### Hallucination Calculation
```
1. Extract factual claims from response
2. Check each claim against knowledge base
3. Count contradictions
hallucination_risk = (contradictions / total_claims)
```

### Overall Score Weighting
```
overall = (grounding × 0.4) + (consistency × 0.3) + (confidence × 0.2) + (safety × 0.1)
```

---

## User Interactions

### Playground Tab
1. **User Types Prompt** → Form updates character count
2. **User Selects Models** → Cost warning shows if >$0.05
3. **User Clicks "Run Evaluation"** → API call, show loading spinner
4. **Results Display** → Show metrics for each model

### Guardrails Tab
1. **User Sees Rule List** → Grouped by category (Quality/Safety)
2. **User Toggles Rule** → Adjust thresholds for their use case
3. **User Clicks "Save"** → Guardrails apply to future evaluations

### History Tab
1. **Evaluations Accumulate** → Show as table, most recent first
2. **Stats Display** → Total, pass rate, pass count
3. **User Clicks "View"** → (Future) Show full evaluation details

---

## Color Coding System

| Color | Meaning | Context |
|-------|---------|---------|
| Blue (Primary) | Positive/Active | Grounding score, model selection |
| Green | Success/Pass | Guardrail pass, safety indicator |
| Yellow | Warning/Caution | Medium hallucination, medium toxicity |
| Red | Failure/Alert | Guardrail fail, high risk |
| Gray | Neutral/Disabled | Unselected models, disabled rules |

---

## Performance Tips

### What's Optimized?
```javascript
// Memoized calculations - only recalculate when deps change
const currentResults = useMemo(() => filterResults(), [evaluationHistory])
const evaluationStats = useMemo(() => calcStats(), [currentResults])

// Memoized callback - maintains identity across renders
const handleEvaluation = useCallback(async (...) => {...}, [])
```

### What Could Be Further Optimized?
- Virtual scrolling for large history lists
- Web Workers for metric calculations
- Service Worker for offline mode
- Debouncing character count updates

---

## Common Tasks

### Adding a New Model
1. Add to `availableModels` array in `evaluation-form.tsx`
2. Add response template in `generateMockResponse()`
3. Add baselines in `generateMockMetrics()`
4. Add model name mapping in `dashboard/page.tsx`

### Adjusting Guardrails
1. Go to Guardrails Configuration tab
2. Toggle rules on/off
3. Click "Save Configuration"
4. New guardrails apply to next evaluation

### Checking Evaluation History
1. Click "History" tab on Dashboard
2. See table of all evaluations
3. Statistics at top show pass/fail rate
4. Click "View" to see full details

---

## Debugging

### Enable Logging
Currently has console.logs with `[v0]` prefix:
```javascript
console.log('[v0] Starting evaluation:', { prompt, models })
console.log('[v0] Evaluation complete:', { resultCount })
```

### Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Form disabled | `isLoading === true` | Wait for evaluation |
| Results not showing | `evaluationHistory` is empty | Run evaluation first |
| Wrong metrics | Model baselines off | Adjust in `generateMockMetrics` |
| Cost warning wrong | Cost calculation broken | Check `modelCostPerCall` values |

---

## Key Formulas

### Cost Calculation
```
totalCost = selectedModels.reduce((sum, modelId) => {
  return sum + modelById[modelId].costPerCall
}, 0)
```

### Estimated Time
```
estimatedTime = selectedModels.length * (Math.ceil(charCount / 50) + 2)
// Models × (base time + prompt-length time)
```

### Pass Rate Calculation
```
passRate = (passCount / totalCount) * 100
```

### Overall Score
```
score = (grounding×0.4) + (consistency×0.3) + (confidence×0.2) + (safety×0.1)
```

---

## Testing Checklist

- [ ] Prompt validation (min 10 chars)
- [ ] Model selection (min 1, max 4)
- [ ] Cost calculation shows correctly
- [ ] Loading state displays and clears
- [ ] Results show for each model
- [ ] Metrics display with correct colors
- [ ] Guardrail status accurate
- [ ] History accumulates
- [ ] Clearing results works
- [ ] Guardrail toggle works
- [ ] Stats calculate correctly

---

## Future Enhancements

1. **Real LLM API Integration**
   - Replace mock responses with actual API calls
   - Handle timeouts and failures

2. **Database Persistence**
   - Save evaluations to database
   - Enable cross-session history

3. **Advanced Filtering**
   - Filter history by model, date range, status
   - Export evaluations as CSV/JSON

4. **Team Collaboration**
   - Share evaluations with team
   - Compare results across users

5. **Custom Metrics**
   - Allow users to define custom evaluation metrics
   - Create evaluation templates

6. **Pricing Analytics**
   - Show cost trends
   - Budget tracking and alerts

---

## Questions?

Refer to `SYSTEM_ARCHITECTURE.md` for deeper explanations of:
- Why each component exists
- How metrics are calculated
- Guardrail logic
- Design decisions
- Production considerations
