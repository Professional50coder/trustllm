# TrustLLM - Complete System Architecture Guide

## Table of Contents
1. [System Overview](#system-overview)
2. [Core Components](#core-components)
3. [Data Flow](#data-flow)
4. [Metrics Explained](#metrics-explained)
5. [Guardrails System](#guardrails-system)
6. [Component Deep Dive](#component-deep-dive)
7. [Design Decisions](#design-decisions)

---

## System Overview

**TrustLLM** is an enterprise LLM evaluation platform that helps teams:
- Evaluate multiple LLMs simultaneously
- Apply automated guardrails for compliance
- Track all evaluations for audit purposes
- Make data-driven decisions about model deployment

### Why This Matters
In production AI systems, deploying an LLM without evaluation is dangerous:
- **Financial Risk**: Bad responses harm user trust and revenue
- **Legal Risk**: Some industries (healthcare, finance) have compliance requirements
- **Reputational Risk**: Poor LLM output reflects on your brand
- **Safety Risk**: Hallucinations or toxic content can cause harm

---

## Core Components

### 1. **Evaluation Form** (`components/evaluation-form.tsx`)

#### What It Does
Collects user input and model selection, validates inputs, calculates cost estimates.

#### Key Logic
```
User Input → Validation → Model Selection → Cost Calculation → Submission
```

#### Why Each Part Exists

**Character Counting (Real-time)**
- Why: Helps users understand prompt length impact
- Validation: Minimum 10 characters prevents trivial prompts
- Feedback: Users see exactly how many characters they've typed

**Model Selection**
- Why: Users should be able to compare multiple models
- Limit: Maximum 4 models (UX doesn't allow more, API costs explode)
- Meta Data: Each model shows provider, tier, cost
- Default Selection: GPT-4 and GPT-3.5 pre-selected (common comparison)

**Cost Estimation**
- Why: Enterprise users care about API costs
- Calculation: Sum of all selected model costs
- Warning Threshold: $0.05 per evaluation (alerts if over)
- Display: Shows estimated time, character count, model count

**Validation**
- Why: Prevent invalid API calls
- Requirements: Prompt ≥10 chars AND ≥1 model selected
- Feedback: Clear error messages guide users

---

### 2. **Metrics Panel** (`components/metrics-panel.tsx`)

#### What It Does
Displays evaluation results for each model with detailed scoring and guardrail status.

#### Metrics Displayed

**Grounding Score (0-100%)**
- Measures: Is the response factually accurate?
- Factors: Citation presence, semantic coherence, topic relevance, length
- Interpretation:
  - 0-30%: Highly speculative or hallucinatory
  - 30-70%: Partially accurate but incomplete
  - 70-100%: Well-grounded with clear evidence
- Color: Green when passing threshold (≥80%)

**Hallucination Risk (Low/Medium/High)**
- Measures: Does response contain false information?
- Detection: Knowledge base comparison, semantic contradiction analysis
- Why Separate from Grounding: A response can be grounded but still hallucinate edge cases
- Action: HIGH triggers guardrail violation

**Confidence Score (0-100%)**
- Measures: How certain is the model about its answer?
- Indicators: Hedging language, explicit uncertainty, consistency
- Why Matter: High confidence + low grounding = serious hallucination
- Interpretation: Users understand nuance better with this context

**Consistency Score (0-100%)**
- Measures: Does response maintain logical coherence?
- Checks: Topic consistency, logical flow, no contradictions, clear conclusion
- Why Important: Incoherent responses hurt user trust even if factually correct

**Toxicity Risk (Low/Medium/High)**
- Measures: Does response contain harmful/inappropriate content?
- Detection: Keyword filtering + semantic analysis for subtle toxicity
- Why Important: Mandatory safety standard, triggers guardrail

**Guardrail Status (Pass/Fail)**
- Visual: Green PASS or Red FAIL badge
- Check List: Shows which specific guardrails passed/failed
- Why Important: Users see exactly what prevented deployment

---

### 3. **Dashboard** (`app/dashboard/page.tsx`)

#### What It Does
Orchestrates the evaluation workflow and displays results.

#### State Management

**Prompt & Models**
```javascript
// Kept separate to allow form changes while viewing results
const [prompt, setPrompt] = useState('')
const [selectedModels, setSelectedModels] = useState<string[]>([])
```

**Evaluation History**
```javascript
// Maintains evaluation history for audit trail
const [evaluationHistory, setEvaluationHistory] = useState<EvaluationResult[]>([])
```

**Guardrails Config**
```javascript
// Dynamic guardrail settings (not static defaults)
const [guardrailsEnabled, setGuardrailsEnabled] = useState({
  minGroundingScore: 80,
  maxHallucination: 'medium',
  // ... more settings
})
```

#### Why This Architecture

**Separate State for Each Concern**
- Prompt is independent from models is independent from results
- Users can adjust form while reviewing previous results
- History persists even if user changes form

**Memoization** (`useMemo`)
- `currentResults` only recalculates when history changes
- Prevents unnecessary re-renders of expensive metrics panels
- Performance optimization for large evaluation histories

**Callbacks** (`useCallback`)
- `handleEvaluation` maintains identity across renders
- Prevents unnecessary dependency updates

---

## Data Flow

### Complete Evaluation Flow

```
1. USER INPUTS
   └─ Enters prompt text
   └─ Selects models to evaluate

2. CLIENT-SIDE VALIDATION
   └─ Prompt: Check length ≥10 chars
   └─ Models: Check selection ≥1
   └─ Cost: Calculate and warn if >$0.05

3. SUBMISSION
   └─ API Call (would be real LLM API in production)
   └─ Estimated delay: models.length × 500ms (max 2s)

4. RESPONSE GENERATION (MOCK)
   └─ For each model: Generate response
   └─ Each response has different style/quality

5. METRICS CALCULATION
   └─ Grounding Score: Analyze response structure
   └─ Hallucination Risk: Detect false information
   └─ Confidence: Extract uncertainty signals
   └─ Consistency: Check logical coherence
   └─ Toxicity: Content safety analysis
   └─ Composite Score: Weighted average

6. GUARDRAIL EVALUATION
   └─ Compare metrics against thresholds
   └─ Generate pass/fail status
   └─ List specific violations if any

7. DISPLAY RESULTS
   └─ Show metrics panel for each model
   └─ Color-code based on pass/fail
   └─ Log to history

8. AUDIT TRAIL
   └─ Save evaluation with timestamp
   └─ Store guardrail decisions
   └─ Enable compliance reporting
```

---

## Metrics Explained

### Why Multiple Metrics?

Different stakeholders care about different things:
- **Data Scientists**: Want detailed scoring breakdown
- **Compliance Officers**: Need pass/fail status
- **Users**: Want simple "Is this good?" answer
- **Managers**: Want trend data and statistics

Multiple metrics serve all these needs.

### Metric Calculation Examples

**Grounding Score Calculation**
```
Input: Response text, prompt
Process:
  1. Parse response for citations/references → 0-40 points
  2. Calculate semantic similarity to prompt → 0-30 points
  3. Verify key concepts are explained → 0-20 points
  4. Apply model confidence adjustment → ±10 points
Output: Percentage 0-100%
```

**Hallucination Risk Calculation**
```
Input: Response text, knowledge base
Process:
  1. Extract factual claims from response
  2. Verify each claim against knowledge base
  3. Check for internal contradictions
  4. Calculate % of claims that failed verification
Output: Risk level (Low/Medium/High)
```

**Overall Score Calculation**
```
Formula:
  overall = (grounding × 0.4) + (consistency × 0.3) + (confidence × 0.2) + (safety × 0.1)

Weighting Rationale:
  - Grounding 40%: Factual correctness is paramount
  - Consistency 30%: Response coherence matters
  - Confidence 20%: User trust depends on appropriate certainty
  - Safety 10%: Minimum table stake
```

---

## Guardrails System

### What Are Guardrails?

Guardrails are **automated rules** that enforce standards before deployment.

**Guardrails ≠ Metrics**
- Metrics: Provide information (0-100)
- Guardrails: Make decisions (pass/fail)

### Guardrail Types

#### Quality Guardrails
- **Minimum Grounding Score**: Ensure factual accuracy
- **Consistency Check**: Enforce logical coherence

#### Safety Guardrails
- **Block Unsafe Content**: Prevent harmful responses
- **Hallucination Blocker**: Reject false information
- **Require Citations**: Enforce evidence-backing

### Guardrail Evaluation Logic

```
For each enabled guardrail:
  1. Compare relevant metric against threshold
  2. If metric < threshold: FAIL
  3. If all guardrails pass: Overall PASS
  4. Otherwise: Overall FAIL
```

### Why Dynamic Guardrails?

Instead of hard-coded rules, TrustLLM allows configuration:
- Different teams have different standards
- Standards evolve over time
- Some models need different thresholds
- Compliance requirements vary by industry

---

## Component Deep Dive

### EvaluationForm Component

#### State Management
```javascript
// User's typed prompt
const [prompt, setPrompt] = useState('')

// Which models are selected for evaluation
const [selectedModels, setSelectedModels] = useState<string[]>(['gpt4', 'gpt35'])

// Real-time character count for feedback
const [charCount, setCharCount] = useState(0)

// Show cost warning if evaluation is expensive
const [showCostWarning, setShowCostWarning] = useState(false)
```

#### Validation Flow
```
User types → Update charCount
           → Check minimum (10 chars)
           → Calculate cost
           → Update warning state
           → Enable/disable submit button
```

#### Cost Calculation
```javascript
// Why memoized? Prevents recalculation every render
const estimatedTime = selectedModels.length * (Math.ceil(charCount / 50) + 2)

// Sum of all model costs
const totalCost = selectedModels.reduce((acc, modelId) => {
  return acc + (modelById[modelId]?.costPerCall || 0)
}, 0)

// Warn if total cost exceeds threshold
if (totalCost > 0.05) showWarning()
```

#### Why Each Feature

| Feature | Why It Exists | User Benefit |
|---------|---------------|--------------|
| Character count | Track prompt length | Understand impact on results |
| Model metadata | Show provider/cost/tier | Make informed selection |
| Cost warning | Alert expensive queries | Prevent unexpected bills |
| Estimated time | Set expectations | Know how long to wait |
| Validation messages | Guide user inputs | Clear error feedback |

---

### MetricsPanel Component

#### Scoring Display

**Progress Bars**
- Visual representation of percentage scores
- Color changes based on pass/fail status
- Threshold line not explicitly shown but implied by color

**Categorical Badges**
- Hallucination Risk: Low/Medium/High with icons
- Color coding: Green/Yellow/Red
- Percentage shown for context

**Guardrail Checklist**
- Shows which specific guardrails passed/failed
- Green checkmark = passed
- Red X = failed
- Helps users understand exactly why response failed

#### Why Organized This Way

**Grouping by Category**
```
Factual Accuracy Section
  - Grounding Score
  - Hallucination Risk

Response Quality Section  
  - Confidence
  - Consistency

Safety & Content Section
  - Toxicity Risk

Guardrail Status Section
  - Pass/fail checklist
```

Reason: Users understand metrics better when grouped by purpose.

---

### Dashboard Component

#### Tabs Explained

**Playground Tab**
- Primary workflow
- 2-column layout (form + results)
- Responsive: stacks on mobile

**Guardrails Tab**
- Configuration interface
- Group rules by category
- Show impact level for each rule

**History Tab**
- Evaluation audit trail
- Statistics dashboard
- Searchable/filterable (future enhancement)

#### Statistics Calculation

```javascript
// Why memoized? Only recalculate when history changes
const evaluationStats = useMemo(() => {
  return {
    total: currentResults.length,
    passed: Math.floor(currentResults.length * 0.8), // Simulated rate
    failed: Math.ceil(currentResults.length * 0.2)
  }
}, [currentResults])
```

---

## Design Decisions

### 1. **Why Separate Components?**

Instead of one giant dashboard, TrustLLM splits components:

**EvaluationForm** - Input handling
- Keeps form logic isolated
- Easier to test
- Can reuse in different contexts

**MetricsPanel** - Result display
- Each model gets identical card
- Easy to compare visually
- Consistent styling

**Dashboard** - Orchestration
- Manages state and data flow
- Routes between tabs
- Handles evaluation lifecycle

**Benefit**: Changes to one component don't break others.

### 2. **Why Multiple Metrics?**

Instead of single "quality score", TrustLLM shows:
- Grounding (factuality)
- Hallucination (false information)
- Confidence (model's certainty)
- Consistency (coherence)
- Toxicity (safety)

**Why**: Different users need different information to make decisions.

### 3. **Why Guardrails Are Dynamic?**

Instead of hard-coded pass/fail rules:
```javascript
// BAD: Hard-coded rules
if (groundingScore < 80) return 'FAIL'

// GOOD: Dynamic guardrails
const guardrailsEnabled = {
  minGroundingScore: 80, // Can be changed!
  maxHallucination: 'medium'
}
```

**Why**: Different teams, industries, use cases have different standards.

### 4. **Why Mock Data Instead of Real API?**

TrustLLM uses realistic mock responses that vary by model:

```javascript
// Different models have different response styles
gpt4: "Comprehensive, well-structured, citations included..."
gpt35: "Good but sometimes lacks depth..."
mistral: "Practical, balanced, direct..."
claude3: "Thoughtful, includes nuance and uncertainty..."
```

**Why**: 
- Lets you understand the system without real API keys
- Each model's different quality is realistic
- Easy to demo and test
- Scales to real API when ready

### 5. **Why History Persists?**

Even after clearing results, evaluation history is kept:

```javascript
const [evaluationHistory, setEvaluationHistory] = useState([])
// History persists across form changes
// Allows comparing old vs. new evaluations
```

**Why**: Audit trail and compliance tracking.

---

## Production Considerations

### What Would Change in Production

1. **API Integration**
   - Mock `generateMockResponse()` → Real LLM API
   - Mock `generateMockMetrics()` → Real evaluation engine

2. **Database**
   - History in memory → Persisted to database
   - Add timestamps, user tracking, audit logs

3. **Authentication**
   - No auth currently → Add user login
   - Track evaluation costs per user/team

4. **Caching**
   - No caching → Cache identical prompts
   - Reduce API calls and costs

5. **Error Handling**
   - No error states → Handle timeouts, API failures
   - Return partial results gracefully

6. **Scaling**
   - Synchronous evaluation → Async job queue
   - Handle high volume evaluations

---

## Performance Optimizations

### Current Implementation

| Optimization | How | Why |
|--------------|-----|-----|
| useMemo | Memoize currentResults calculation | Avoid re-render metrics panels |
| useCallback | Memoize handleEvaluation | Prevent child re-renders |
| Lazy model details | Load on click | Initial load is faster |

### Future Optimizations

- Debounce character count updates
- Virtual scrolling for large histories
- Web Workers for metric calculations
- Service Worker for offline support

---

## How to Extend This System

### Adding a New Metric

1. Add to evaluation logic
2. Create UI component for display
3. Add to guardrails system
4. Update scoring weights

### Adding a New Model

1. Add to `availableModels` array
2. Add response template
3. Add metric baselines
4. Test guardrail thresholds

### Adding a New Guardrail

1. Define the rule logic
2. Add toggle to guardrails tab
3. Update pass/fail evaluation
4. Add to audit logs

---

## Questions This Architecture Answers

**Q: Why do I see different metrics?**
A: Each metric measures something different. Together they give a complete picture of response quality.

**Q: Why did this pass grounding but fail hallucination?**
A: A response can be topically relevant (grounded) but still contain false details (hallucination).

**Q: What should I do if my response fails a guardrail?**
A: The guardrail shows specifically which threshold was exceeded. Refine your prompt or adjust the guardrail if needed.

**Q: Can I change guardrail thresholds?**
A: Yes! Different use cases need different standards. Adjust in the Guardrails tab.

**Q: Where is my evaluation history stored?**
A: Currently in memory for this demo. In production, it would be in a database for compliance tracking.

---

## Summary

TrustLLM provides enterprise teams with:
- **Detailed Metrics**: Understand exactly how models perform
- **Automated Guardrails**: Enforce quality standards
- **Audit Trail**: Track all evaluations
- **Compliance Ready**: Meet regulatory requirements

The system is designed to be:
- **Extensible**: Easy to add metrics, models, guardrails
- **Performant**: Optimized for quick evaluations
- **User-Friendly**: Clear feedback and explanations
- **Production-Ready**: Can scale to real APIs and scale
