'use client'

import Link from 'next/link'
import { Navigation } from '@/components/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowRight, BarChart3, Lock, Zap } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section */}
      <section className="border-b border-border">
        <div className="container max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="space-y-6 text-center">
            <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Trust Your AI Before You Ship It
            </h1>
            <p className="text-balance text-lg text-muted-foreground sm:text-xl">
              Evaluate, monitor, and govern LLMs with confidence. Comprehensive evaluation metrics, guardrails, and audit trails for enterprise AI teams.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Link href="/dashboard">
                <Button size="lg" className="gap-2">
                  Try the Playground
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Button size="lg" variant="outline">
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-b border-border">
        <div className="container max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="space-y-2 text-center">
              <div className="text-3xl font-bold text-accent">10K+</div>
              <p className="text-sm text-muted-foreground">Evaluations per day</p>
            </div>
            <div className="space-y-2 text-center">
              <div className="text-3xl font-bold text-accent">99.9%</div>
              <p className="text-sm text-muted-foreground">Uptime SLA</p>
            </div>
            <div className="space-y-2 text-center">
              <div className="text-3xl font-bold text-accent">50+</div>
              <p className="text-sm text-muted-foreground">Enterprise clients</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="border-b border-border">
        <div className="container max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mb-16 space-y-4 text-center">
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              Comprehensive Evaluation Platform
            </h2>
            <p className="text-lg text-muted-foreground">
              Everything you need to evaluate, monitor, and govern LLMs in production
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Evaluation Playground */}
            <Card className="border-border bg-card p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 font-bold text-card-foreground">Evaluation Playground</h3>
              <p className="text-sm text-muted-foreground">
                Compare multiple LLMs side-by-side with real-time evaluation metrics and detailed response analysis.
              </p>
            </Card>

            {/* Metrics & Scoring */}
            <Card className="border-border bg-card p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 font-bold text-card-foreground">Advanced Metrics</h3>
              <p className="text-sm text-muted-foreground">
                Grounding score, hallucination risk, toxicity detection, confidence scoring, and answer consistency analysis.
              </p>
            </Card>

            {/* Guardrails */}
            <Card className="border-border bg-card p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 font-bold text-card-foreground">Smart Guardrails</h3>
              <p className="text-sm text-muted-foreground">
                Configure rules for citations, safety content, grounding thresholds, and automatic response filtering.
              </p>
            </Card>

            {/* Audit Logs */}
            <Card className="border-border bg-card p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 font-bold text-card-foreground">Audit & Compliance</h3>
              <p className="text-sm text-muted-foreground">
                Complete audit trails with timestamps, model selections, scores, and guardrail decisions for compliance.
              </p>
            </Card>

            {/* Model Comparison */}
            <Card className="border-border bg-card p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 font-bold text-card-foreground">Model Comparison</h3>
              <p className="text-sm text-muted-foreground">
                Benchmark multiple LLM providers including GPT-4, GPT-3.5, Mistral, and custom models.
              </p>
            </Card>

            {/* Enterprise Ready */}
            <Card className="border-border bg-card p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 font-bold text-card-foreground">Enterprise Ready</h3>
              <p className="text-sm text-muted-foreground">
                SOC 2 compliant, role-based access control, API-first architecture, and 99.9% SLA.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="border-b border-border">
        <div className="container max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mb-16 space-y-4 text-center">
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground">
              Simple workflow for enterprise AI governance
            </p>
          </div>

          <div className="space-y-8">
            {[
              {
                step: '1',
                title: 'Input & Configure',
                description: 'Enter your prompt and select LLMs to evaluate. Configure guardrail rules for automated compliance checks.'
              },
              {
                step: '2',
                title: 'Evaluate & Analyze',
                description: 'Run evaluations to get detailed metrics on grounding, hallucination risk, toxicity, and answer consistency.'
              },
              {
                step: '3',
                title: 'Apply Guardrails',
                description: 'Automated guardrails validate responses against your rules. Pass/Fail decisions determine deployment eligibility.'
              },
              {
                step: '4',
                title: 'Audit & Deploy',
                description: 'Complete audit trail logs all evaluations. Approved responses can be safely deployed to production.'
              }
            ].map((item) => (
              <div key={item.step} className="flex gap-6">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                  {item.step}
                </div>
                <div>
                  <h3 className="mb-2 font-bold text-foreground text-lg">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture Section */}
      <section id="architecture" className="border-b border-border">
        <div className="container max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mb-16 space-y-4 text-center">
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              Platform Architecture
            </h2>
            <p className="text-lg text-muted-foreground">
              Scalable, secure, and enterprise-grade infrastructure
            </p>
          </div>

          <Card className="border-border bg-card p-8">
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                {[
                  { label: 'Client', icon: '🖥️' },
                  { label: 'API Gateway', icon: '🔐' },
                  { label: 'Evaluation Engine', icon: '⚙️' },
                  { label: 'Vector Store (FAISS)', icon: '📊' },
                  { label: 'Logging & Audit', icon: '📝' }
                ].map((item) => (
                  <div key={item.label} className="flex flex-col items-center gap-2 rounded-lg border border-border bg-secondary p-4">
                    <div className="text-2xl">{item.icon}</div>
                    <p className="text-xs font-semibold text-muted-foreground text-center">{item.label}</p>
                  </div>
                ))}
              </div>
              <p className="text-center text-sm text-muted-foreground mt-6">
                All LLM responses flow through our evaluation engine for real-time analysis, guardrail validation, and comprehensive audit logging.
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-b border-border">
        <div className="container max-w-7xl px-4 py-20 sm:px-6 lg:px-8 text-center">
          <h2 className="mb-6 text-3xl font-bold text-foreground">
            Ready to Evaluate Your LLMs?
          </h2>
          <p className="mb-8 text-lg text-muted-foreground max-w-2xl mx-auto">
            Get started with TrustLLM today and ensure your AI outputs meet enterprise standards before deployment.
          </p>
          <Link href="/dashboard">
            <Button size="lg" className="gap-2">
              Try the Playground Now
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50">
        <div className="container max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <h4 className="font-bold text-foreground mb-4">TrustLLM</h4>
              <p className="text-sm text-muted-foreground">
                Enterprise LLM evaluation and governance platform.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#features" className="hover:text-foreground transition-colors">Features</Link></li>
                <li><Link href="#pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
                <li><Link href="#docs" className="hover:text-foreground transition-colors">Documentation</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#about" className="hover:text-foreground transition-colors">About</Link></li>
                <li><Link href="#contact" className="hover:text-foreground transition-colors">Contact</Link></li>
                <li><Link href="#careers" className="hover:text-foreground transition-colors">Careers</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#privacy" className="hover:text-foreground transition-colors">Privacy</Link></li>
                <li><Link href="#terms" className="hover:text-foreground transition-colors">Terms</Link></li>
                <li><Link href="#security" className="hover:text-foreground transition-colors">Security</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-sm text-muted-foreground">
              © 2024 TrustLLM. All rights reserved.
            </p>
            <p className="text-sm text-muted-foreground">
              Enterprise AI evaluation platform
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
