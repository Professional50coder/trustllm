# TrustLLM - Architecture Diagrams

Visual representations of the system architecture, data flow, and component relationships.

---

## 1. High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    TrustLLM Platform                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │  Landing     │  │  Evaluation  │  │  Guardrails  │            │
│  │  Page        │  │  Dashboard   │  │  Config      │            │
│  │  (Marketing) │  │  (Main UI)   │  │  (Settings)  │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
│                           │                                       │
│        ┌──────────────────┼──────────────────┐                   │
│        │                  │                  │                   │
│        ▼                  ▼                  ▼                   │
│   ┌─────────┐       ┌──────────┐      ┌────────────┐            │
│   │  Input  │       │ Results  │      │ Audit      │            │
│   │  Form   │───────│ Display  │      │ History    │            │
│   │         │       │ (Metrics)│      │            │            │
│   └─────────┘       └──────────┘      └────────────┘            │
│        │                  ▲                  │                   │
│        └──────────────────┼──────────────────┘                   │
│                           │                                       │
│                    ┌──────▼──────┐                               │
│                    │  Evaluation │                               │
│                    │  Engine     │                               │
│                    │  (Logic)    │                               │
│                    └─────────────┘                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Tree

```
App (Root)
├── Layout (Metadata, Fonts)
│
├── Page (/) - Landing Page
│   ├── Navigation
│   ├── Hero Section
│   ├── Features Grid
│   ├── How It Works
│   ├── Architecture Diagram
│   ├── CTA Section
│   └── Footer
│
├── Dashboard (/dashboard) - Main Application
│   ├── Navigation
│   ├── StatsGrid
│   │   ├── TotalEvaluations Card
│   │   ├── PassedGuardrails Card
│   │   └── FailedGuardrails Card
│   │
│   ├── Tabs
│   │   ├── Playground Tab
│   │   │   ├── EvaluationForm
│   │   │   │   ├── PromptTextarea
│   │   │   │   ├── ModelSelection
│   │   │   │   ├── CostWarning
│   │   │   │   ├── EstimatedMetrics
│   │   │   │   └── SubmitButton
│   │   │   │
│   │   │   └── ResultsContainer
│   │   │       ├── MetricsPanel (GPT-4)
│   │   │       ├── MetricsPanel (GPT-3.5)
│   │   │       ├── MetricsPanel (Mistral)
│   │   │       └── MetricsPanel (Claude)
│   │   │
│   │   ├── Guardrails Tab
│   │   │   ├── InfoCard
│   │   │   ├── QualityGuardrails
│   │   │   │   ├── GuardrailRule (Grounding)
│   │   │   │   └── GuardrailRule (Consistency)
│   │   │   ├── SafetyGuardrails
│   │   │   │   ├── GuardrailRule (Unsafe Content)
│   │   │   │   ├── GuardrailRule (Hallucination)
│   │   │   │   └── GuardrailRule (Citations)
│   │   │   └── ActionButtons
│   │   │
│   │   └── History Tab
│   │       ├── StatsGrid
│   │       │   ├── TotalCard
│   │       │   ├── AverageCard
│   │       │   ├── PassRateCard
│   │       │   └── ModelsTestedCard
│   │       │
│   │       └── HistoryTable
│   │           ├── TableHead
│   │           └── TableBody (Rows)
│   │
│   └── (Navigation)
│
├── Guardrails (/guardrails) - Full Page Config
│   ├── Navigation
│   ├── GuardrailsList
│   └── SaveButton
│
└── AuditLogs (/audit-logs) - Full Page History
    ├── Navigation
    ├── FilterBar
    ├── StatsGrid
    └── LogsTable
```

---

## 3. Data Flow: Evaluation Lifecycle

```
START
  │
  ├─► User visits Dashboard
  │
  ├─► Renders EvaluationForm
  │   ├─ Input state initialized
  │   ├─ Model selection with defaults
  │   └─ Real-time validation enabled
  │
  ├─► User Types Prompt
  │   ├─ handlePromptChange() called
  │   ├─ Update prompt state
  │   ├─ Update charCount
  │   ├─ Re-render form
  │   └─ Show validation feedback
  │
  ├─► User Selects Models
  │   ├─ handleModelToggle() called
  │   ├─ Update selectedModels state
  │   ├─ Calculate cost
  │   ├─ Set showCostWarning if needed
  │   └─ Re-render form with feedback
  │
  ├─► User Clicks "Run Evaluation"
  │   ├─ Validate: prompt ≥10 chars ✓
  │   ├─ Validate: models ≥1 ✓
  │   ├─ Call onSubmit(prompt, models)
  │   └─ handleEvaluation() in Dashboard
  │
  ├─► Evaluation Starts
  │   ├─ setIsLoading(true)
  │   ├─ Update prompt state
  │   ├─ Update selectedModels state
  │   ├─ Show spinner in UI
  │   └─ Log: "Starting evaluation"
  │
  ├─► Simulate API Call
  │   ├─ Calculate delay: models.length × 500ms
  │   ├─ setTimeout with calculated delay
  │   ├─ User sees: "Evaluating... (~Xs)"
  │   └─ Cannot interact with form during this time
  │
  ├─► Generate Results
  │   └─ For each model:
  │       ├─ generateMockResponse(modelId, prompt)
  │       │   ├─ Get model-specific template
  │       │   ├─ Insert prompt context
  │       │   └─ Return formatted response
  │       │
  │       └─ Create EvaluationResult
  │           ├─ modelId
  │           ├─ modelName
  │           ├─ response (text)
  │           ├─ timestamp
  │           └─ status: 'complete'
  │
  ├─► Update History
  │   ├─ newResults array created
  │   ├─ setEvaluationHistory([...newResults, ...previous])
  │   ├─ Keep last 10 evaluations
  │   └─ currentResults useMemo recalculates
  │
  ├─► Show Results
  │   ├─ setIsLoading(false)
  │   ├─ currentResults is non-empty
  │   ├─ Render MetricsPanel for each result
  │   │
  │   └─ For each MetricsPanel:
  │       ├─ generateMockMetrics(modelId, response)
  │       │   ├─ Get model baselines
  │       │   ├─ Calculate grounding score
  │       │   ├─ Calculate hallucination risk
  │       │   ├─ Calculate confidence
  │       │   ├─ Calculate consistency
  │       │   ├─ Calculate toxicity
  │       │   └─ Calculate overallScore (weighted average)
  │       │
  │       └─ Display in UI
  │           ├─ Show model name
  │           ├─ Show overall score badge
  │           ├─ Display response preview
  │           ├─ Show metric bars with colors
  │           ├─ Show risk badges (Low/Med/High)
  │           └─ Show guardrail checklist
  │
  ├─► User Can Now:
  │   ├─ Change form → re-run evaluation
  │   ├─ Switch to Guardrails tab
  │   ├─ Switch to History tab
  │   ├─ See evaluation added to history
  │   └─ See stats updated
  │
  └─► CONTINUE or END
```

---

## 4. State Management Flow

```
Dashboard Component State

┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  INPUT STATE (Form)                                          │
│  ├─ prompt: string                                           │
│  └─ selectedModels: string[]                                 │
│       │                                                      │
│       │ [User types / selects]                              │
│       │                                                      │
│       ▼                                                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │        EvaluationForm Component                     │    │
│  │  - Validates input                                 │    │
│  │  - Shows cost warning                              │    │
│  │  - Shows estimated metrics                         │    │
│  └─────────────────────────────────────────────────────┘    │
│       │                                                      │
│       │ [User clicks Run Evaluation]                        │
│       │                                                      │
│       ▼                                                      │
│  OUTPUT STATE (Results)                                      │
│  ├─ evaluationHistory: EvaluationResult[]                    │
│  ├─ isLoading: boolean                                       │
│  └─ currentResults = useMemo()                               │
│       │                                                      │
│       │ [Metrics calculated]                                │
│       │                                                      │
│       ▼                                                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │    MetricsPanel Components (one per model)          │    │
│  │  - Display metrics                                  │    │
│  │  - Show guardrail status                            │    │
│  │  - Render response preview                          │    │
│  └─────────────────────────────────────────────────────┘    │
│       │                                                      │
│  CONFIG STATE (Guardrails)                                   │
│  ├─ guardrailsEnabled:                                       │
│  │   ├─ minGroundingScore: number                           │
│  │   ├─ maxHallucination: 'low' | 'medium'                  │
│  │   ├─ requireCitations: boolean                           │
│  │   └─ blockUnsafe: boolean                                │
│  │       │                                                  │
│  │       │ [User toggles guardrails]                       │
│  │       │                                                  │
│  │       ▼                                                  │
│  │   ┌─────────────────────────────────────────────┐        │
│  │   │    Guardrails Tab                          │        │
│  │   │  - Show rule toggles                       │        │
│  │   │  - Show impact levels                      │        │
│  │   │  - Apply to future evaluations             │        │
│  │   └─────────────────────────────────────────────┘        │
│  │       │                                                  │
│  │       ▼                                                  │
│  │   Next evaluation uses updated guardrails                │
│  │                                                           │
│  └─ evaluationStats = useMemo()                             │
│       ├─ total: number                                      │
│       ├─ passed: number                                     │
│       └─ failed: number                                     │
│           │                                                 │
│           │ [Displayed in History tab]                     │
│           │                                                 │
│           ▼                                                 │
│       ┌─────────────────────────────────────────────┐       │
│       │   History Tab                               │       │
│       │  - Show stats grid                          │       │
│       │  - Show evaluations table                   │       │
│       │  - Show pagination controls                │       │
│       └─────────────────────────────────────────────┘       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Metrics Calculation Flow

```
Response Text Input
        │
        ├─► Grounding Score
        │   ├─ Analyze structure
        │   │  ├─ Check for citations (0-40 points)
        │   │  └─ Count structured elements
        │   │
        │   ├─ Semantic analysis
        │   │  ├─ Topic relevance (0-30 points)
        │   │  └─ Concept explanation (0-20 points)
        │   │
        │   ├─ Length adjustment
        │   │  └─ Bonus for well-structured long text (-10 to +10)
        │   │
        │   └─ Apply model baseline
        │       └─ GPT-4: +0.92 | GPT-3.5: +0.85 | etc.
        │
        ├─► Hallucination Risk
        │   ├─ Extract claims
        │   │  └─ Identify factual statements
        │   │
        │   ├─ Verify against knowledge base
        │   │  ├─ True ✓
        │   │  ├─ False ✗
        │   │  └─ Unknown ?
        │   │
        │   ├─ Detect contradictions
        │   │  └─ Internal consistency check
        │   │
        │   └─ Inverse calculation
        │       └─ Higher grounding = lower hallucination risk
        │
        ├─► Confidence Score
        │   ├─ Detect hedging language
        │   │  └─ "possibly", "maybe", "might"
        │   │
        │   ├─ Check for uncertainty markers
        │   │  └─ "I'm not sure", "might be", "unclear"
        │   │
        │   ├─ Analyze decisive language
        │   │  └─ "Clearly", "definitely", "always"
        │   │
        │   └─ Combine signals
        │       └─ Model baseline ± adjustments
        │
        ├─► Consistency Score
        │   ├─ Check topic coherence
        │   │  └─ All sentences on topic?
        │   │
        │   ├─ Verify logical flow
        │   │  └─ Ideas build on each other?
        │   │
        │   ├─ Detect contradictions
        │   │  └─ No conflicting statements?
        │   │
        │   └─ Check for conclusion
        │       ├─ Keywords: "in conclusion", "in summary"
        │       └─ Bonus +5% if conclusion present
        │
        └─► Toxicity Analysis
            ├─ Keyword filtering
            │  └─ Match against profanity/slur list
            │
            ├─ Semantic analysis
            │  └─ Detect subtle toxicity (sarcasm, etc.)
            │
            ├─ Context analysis
            │  └─ Distinguish quoting vs. endorsing
            │
            └─ Output: Low/Medium/High

        All metrics
            │
            ▼
        Calculate Overall Score
            ├─ (grounding × 0.4)
            ├─ (consistency × 0.3)  
            ├─ (confidence × 0.2)
            └─ (safety × 0.1)
            │
            ▼
        Final Score (0-100)
            │
            ├─ 90-100: Excellent ✓✓
            ├─ 80-90:  Good ✓
            ├─ 70-80:  Acceptable ~
            ├─ 60-70:  Poor ✗
            └─ <60:    Unacceptable ✗✗
```

---

## 6. Guardrails Evaluation Flow

```
Metrics Generated
    │
    ├─► For each enabled guardrail:
    │   │
    │   ├─ Guardrail: Minimum Grounding Score (80%)
    │   │  └─ metrics.groundingScore >= 80 ?
    │   │     ├─ YES → ✓ PASS
    │   │     └─ NO  → ✗ FAIL
    │   │
    │   ├─ Guardrail: Hallucination Threshold (Low)
    │   │  └─ metrics.hallucinationLevel == 'Low' ?
    │   │     ├─ YES → ✓ PASS
    │   │     └─ NO  → ✗ FAIL
    │   │
    │   ├─ Guardrail: Block Unsafe Content
    │   │  └─ metrics.toxicity == 'Low' ?
    │   │     ├─ YES → ✓ PASS
    │   │     └─ NO  → ✗ FAIL
    │   │
    │   ├─ Guardrail: Consistency Check (85%)
    │   │  └─ metrics.consistency >= 85 ?
    │   │     ├─ YES → ✓ PASS
    │   │     └─ NO  → ✗ FAIL
    │   │
    │   └─ Guardrail: Require Citations
    │      └─ responseText.includes('[') ?
    │         ├─ YES → ✓ PASS
    │         └─ NO  → ✗ FAIL
    │
    ├─► Check all guardrails
    │   │
    │   ├─ All passed?
    │   │  └─ ✓ PASS: Response is deployment-ready
    │   │
    │   └─ Any failed?
    │      └─ ✗ FAIL: Response needs refinement
    │
    └─► Display in UI
        ├─ Green background if PASS
        └─ Red background if FAIL
```

---

## 7. Performance Optimization Flow

```
Component Renders
    │
    ├─► Without Optimization (Every render):
    │   ├─ Filter evaluationHistory
    │   ├─ Calculate stats
    │   ├─ Re-render all MetricsPanels
    │   └─ ❌ Slow for large histories
    │
    └─► With Optimization (Selective render):
        │
        ├─ useMemo(currentResults)
        │  ├─ Only recalculate if evaluationHistory changes
        │  └─ Otherwise return cached value
        │  └─ ✓ MetricsPanels don't re-render unnecessarily
        │
        ├─ useMemo(evaluationStats)
        │  ├─ Only recalculate if currentResults changes
        │  └─ Otherwise return cached value
        │  └─ ✓ Stats don't recalculate every render
        │
        ├─ useCallback(handleEvaluation)
        │  ├─ Function maintains same identity
        │  └─ ✓ EvaluationForm doesn't re-render
        │
        └─ Result:
           ├─ Input form doesn't flicker
           ├─ Results display quickly
           ├─ Stats update efficiently
           └─ ✓ Fast and responsive UI
```

---

## 8. Responsive Layout

```
DESKTOP (lg: 1024px+)
┌──────────────────────────────────────────────────────────┐
│  Navigation                                               │
├──────────────────────────────────────────────────────────┤
│  Stats Grid (3 columns)                                   │
├──────────────────────────────────────────────────────────┤
│ Tabs: [Playground] [Guardrails] [History]                │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  Left (1/3)         │      Right (2/3)                    │
│  ┌────────────────┐ │  ┌─────────────────────────────┐   │
│  │                │ │  │  Metrics Panel 1            │   │
│  │  Eval Form     │ │  │  - Grounding Score          │   │
│  │  - Prompt      │ │  │  - Hallucination            │   │
│  │  - Models      │ │  │  - Confidence               │   │
│  │  - Submit      │ │  │  - Guardrails               │   │
│  │                │ │  └─────────────────────────────┘   │
│  └────────────────┘ │  ┌─────────────────────────────┐   │
│                     │  │  Metrics Panel 2            │   │
│                     │  └─────────────────────────────┘   │
│                     │  ┌─────────────────────────────┐   │
│                     │  │  Metrics Panel 3            │   │
│                     │  └─────────────────────────────┘   │
│                     │                                     │
└──────────────────────────────────────────────────────────┘

TABLET (md: 768px - 1024px)
┌──────────────────────────────────────────┐
│  Navigation                               │
├──────────────────────────────────────────┤
│  Stats Grid (2 columns)                   │
├──────────────────────────────────────────┤
│ Tabs: [Playground] [Guardrails] [History]│
├──────────────────────────────────────────┤
│                                           │
│  Full Width                               │
│  ┌──────────────────────────────────────┐│
│  │  Eval Form                            ││
│  │  - Prompt, Models, Submit             ││
│  └──────────────────────────────────────┘│
│                                           │
│  ┌──────────────────────────────────────┐│
│  │  Metrics Panel 1 (Full width)         ││
│  └──────────────────────────────────────┘│
│  ┌──────────────────────────────────────┐│
│  │  Metrics Panel 2 (Full width)         ││
│  └──────────────────────────────────────┘│
│                                           │
└──────────────────────────────────────────┘

MOBILE (sm: < 768px)
┌───────────────┐
│ Navigation    │
├───────────────┤
│ Stats Grid    │
│ (1 column)    │
├───────────────┤
│ Tabs (scroll) │
├───────────────┤
│               │
│ Eval Form     │
│ (Full width)  │
│               │
├───────────────┤
│               │
│ Metrics Panel │
│ (Full width)  │
│               │
├───────────────┤
│               │
│ Metrics Panel │
│ (Full width)  │
│               │
└───────────────┘
```

---

## 9. User Journey Map

```
LANDING PAGE
    │
    ├─ User reads features
    ├─ User understands benefits
    └─ User clicks "Try the Playground"
        │
        ▼
    EVALUATION DASHBOARD
        │
        ├─ Form is ready to use
        ├─ User enters prompt
        └─ User selects models
            │
            ├─ System shows cost estimate
            ├─ System shows time estimate
            └─ User sees validation feedback
                │
                ▼
            USER CLICKS RUN EVALUATION
                │
                ├─ Loading spinner shows
                ├─ System processes evaluation
                └─ Results appear
                    │
                    ├─ User sees metrics for each model
                    ├─ User understands quality scores
                    ├─ User sees guardrail status
                    └─ User can compare models side-by-side
                        │
                        ├─ Good response? Deploy with confidence
                        ├─ Bad response? Adjust prompt & retry
                        └─ Unclear? Check guardrails tab
                            │
                            ▼
                        GUARDRAILS TAB
                            │
                            ├─ User sees all rules
                            ├─ User understands impact
                            ├─ User can toggle rules
                            └─ User can save configuration
                                │
                                ▼
                            HISTORY TAB
                                │
                                ├─ User sees all evaluations
                                ├─ User checks pass rate
                                ├─ User monitors trends
                                └─ User exports for compliance
```

---

## 10. Technology Stack Visualization

```
Frontend Layer
┌─────────────────────────────────────┐
│  Next.js 16 (App Router)            │
│  ├─ TypeScript                      │
│  ├─ React 19.2                      │
│  └─ React Hooks                     │
└─────────────────────────────────────┘
          │
          ▼
Styling Layer
┌─────────────────────────────────────┐
│  Tailwind CSS                       │
│  ├─ Design Tokens                   │
│  ├─ Dark Theme                      │
│  └─ Responsive Design               │
└─────────────────────────────────────┘
          │
          ▼
Component Library
┌─────────────────────────────────────┐
│  shadcn/ui                          │
│  ├─ Button                          │
│  ├─ Card                            │
│  ├─ Textarea                        │
│  ├─ Select                          │
│  ├─ Tabs                            │
│  ├─ Badge                           │
│  └─ Custom Components               │
└─────────────────────────────────────┘
          │
          ▼
Business Logic Layer
┌─────────────────────────────────────┐
│  Evaluation Engine                  │
│  ├─ Metrics Calculation             │
│  ├─ Guardrail Evaluation            │
│  ├─ Response Generation             │
│  └─ History Tracking                │
└─────────────────────────────────────┘
          │
          ▼
Data Layer (Mock)
┌─────────────────────────────────────┐
│  In-Memory State                    │
│  ├─ Evaluation History              │
│  ├─ Configuration                   │
│  └─ UI State                        │
│                                     │
│  (Future: Database)                 │
│  ├─ PostgreSQL / Firebase           │
│  ├─ Evaluation Records              │
│  └─ User Data                       │
└─────────────────────────────────────┘
```

---

## Summary

These diagrams show:

1. **High-Level Architecture**: How system components relate
2. **Component Tree**: React component hierarchy  
3. **Evaluation Flow**: Complete user workflow
4. **State Management**: How data flows through components
5. **Metrics Calculation**: How scoring works
6. **Guardrails**: How decisions are made
7. **Optimization**: Performance techniques
8. **Responsive Design**: How layout adapts
9. **User Journey**: End-to-end experience
10. **Technology Stack**: System layers and dependencies

Each diagram can be referred to when understanding specific aspects of the system.
