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
export function generateMockResponse(modelId: string, prompt: string): string {
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
