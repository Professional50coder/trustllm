'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Navigation } from '@/components/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { History, ArrowLeft, Download, Search, Filter } from 'lucide-react'

interface AuditLogEntry {
  id: string
  timestamp: string
  prompt: string
  model: string
  groundingScore: number
  hallucination: string
  toxicity: string
  guardrailStatus: 'PASS' | 'FAIL'
  reviewStatus: 'pending' | 'approved' | 'rejected'
}

const mockLogs: AuditLogEntry[] = [
  {
    id: '1',
    timestamp: '2024-02-06 14:45:32',
    prompt: 'Explain machine learning fundamentals',
    model: 'GPT-4',
    groundingScore: 92,
    hallucination: 'Low',
    toxicity: 'Safe',
    guardrailStatus: 'PASS',
    reviewStatus: 'approved'
  },
  {
    id: '2',
    timestamp: '2024-02-06 14:42:15',
    prompt: 'What are the benefits of AI?',
    model: 'GPT-3.5 Turbo',
    groundingScore: 85,
    hallucination: 'Medium',
    toxicity: 'Safe',
    guardrailStatus: 'PASS',
    reviewStatus: 'approved'
  },
  {
    id: '3',
    timestamp: '2024-02-06 14:38:48',
    prompt: 'Analyze the following data...',
    model: 'Mistral 7B',
    groundingScore: 88,
    hallucination: 'Low',
    toxicity: 'Flagged',
    guardrailStatus: 'FAIL',
    reviewStatus: 'pending'
  },
  {
    id: '4',
    timestamp: '2024-02-06 14:35:22',
    prompt: 'Compare different LLM models',
    model: 'GPT-4',
    groundingScore: 95,
    hallucination: 'Low',
    toxicity: 'Safe',
    guardrailStatus: 'PASS',
    reviewStatus: 'approved'
  },
  {
    id: '5',
    timestamp: '2024-02-06 14:32:05',
    prompt: 'Explain quantum computing',
    model: 'GPT-3.5 Turbo',
    groundingScore: 78,
    hallucination: 'High',
    toxicity: 'Safe',
    guardrailStatus: 'FAIL',
    reviewStatus: 'rejected'
  },
  {
    id: '6',
    timestamp: '2024-02-06 14:28:41',
    prompt: 'What is the future of AI?',
    model: 'Mistral 7B',
    groundingScore: 82,
    hallucination: 'Medium',
    toxicity: 'Safe',
    guardrailStatus: 'PASS',
    reviewStatus: 'approved'
  },
  {
    id: '7',
    timestamp: '2024-02-06 14:25:19',
    prompt: 'Describe supervised learning',
    model: 'GPT-4',
    groundingScore: 90,
    hallucination: 'Low',
    toxicity: 'Safe',
    guardrailStatus: 'PASS',
    reviewStatus: 'pending'
  },
  {
    id: '8',
    timestamp: '2024-02-06 14:22:03',
    prompt: 'Explain neural networks',
    model: 'GPT-3.5 Turbo',
    groundingScore: 87,
    hallucination: 'Low',
    toxicity: 'Safe',
    guardrailStatus: 'PASS',
    reviewStatus: 'approved'
  }
]

export default function AuditLogsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterModel, setFilterModel] = useState<string | null>('all')
  const [filterStatus, setFilterStatus] = useState<string | null>('all')

  const filteredLogs = mockLogs.filter((log) => {
    const matchesSearch = log.prompt.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesModel = filterModel === 'all' || log.model === filterModel
    const matchesStatus = filterStatus === 'all' || log.guardrailStatus === filterStatus
    return matchesSearch && matchesModel && matchesStatus
  })

  const getHallucinationColor = (level: string) => {
    switch (level) {
      case 'Low':
        return 'text-green-400 bg-green-500/10'
      case 'Medium':
        return 'text-yellow-400 bg-yellow-500/10'
      case 'High':
        return 'text-red-400 bg-red-500/10'
      default:
        return 'text-gray-400 bg-gray-500/10'
    }
  }

  const getToxicityColor = (level: string) => {
    switch (level) {
      case 'Safe':
        return 'text-green-400 bg-green-500/10'
      case 'Flagged':
        return 'text-red-400 bg-red-500/10'
      default:
        return 'text-gray-400 bg-gray-500/10'
    }
  }

  const passCount = filteredLogs.filter((l) => l.guardrailStatus === 'PASS').length
  const failCount = filteredLogs.filter((l) => l.guardrailStatus === 'FAIL').length
  const passRate = filteredLogs.length > 0 ? Math.round((passCount / filteredLogs.length) * 100) : 0

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-foreground">Audit Logs</h1>
          </div>
          <p className="text-muted-foreground">
            Complete history of all LLM evaluations with guardrail decisions and compliance records
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card className="border-border bg-card p-6">
            <p className="text-sm text-muted-foreground mb-2">Total Evaluations</p>
            <p className="text-3xl font-bold text-foreground">{filteredLogs.length}</p>
          </Card>
          <Card className="border-border bg-card p-6">
            <p className="text-sm text-muted-foreground mb-2">Pass Rate</p>
            <p className="text-3xl font-bold text-green-400">{passRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">{passCount} passed, {failCount} failed</p>
          </Card>
          <Card className="border-border bg-card p-6">
            <p className="text-sm text-muted-foreground mb-2">Pending Review</p>
            <p className="text-3xl font-bold text-yellow-400">
              {filteredLogs.filter((l) => l.reviewStatus === 'pending').length}
            </p>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-border bg-card p-6 mb-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-card-foreground mb-2">
                <Search className="inline h-4 w-4 mr-2" />
                Search Prompts
              </label>
              <Input
                placeholder="Search evaluation history..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-secondary border-border text-foreground"
              />
            </div>

            <div className="flex-1">
              <label className="block text-sm font-semibold text-card-foreground mb-2">
                <Filter className="inline h-4 w-4 mr-2" />
                Model
              </label>
              <Select value={filterModel} onValueChange={(v) => setFilterModel(v)}>
                <SelectTrigger className="bg-secondary border-border text-foreground">
                  <SelectValue placeholder="All Models" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="all">All Models</SelectItem>
                  <SelectItem value="GPT-4">GPT-4</SelectItem>
                  <SelectItem value="GPT-3.5 Turbo">GPT-3.5 Turbo</SelectItem>
                  <SelectItem value="Mistral 7B">Mistral 7B</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-semibold text-card-foreground mb-2">
                <Filter className="inline h-4 w-4 mr-2" />
                Status
              </label>
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v)}>
                <SelectTrigger className="bg-secondary border-border text-foreground">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="PASS">Pass</SelectItem>
                  <SelectItem value="FAIL">Fail</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" className="gap-2 bg-transparent">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </Card>

        {/* Logs Table */}
        <Card className="border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Timestamp</th>
                  <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Prompt</th>
                  <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Model</th>
                  <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Grounding</th>
                  <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Hallucination</th>
                  <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Toxicity</th>
                  <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Guardrail</th>
                  <th className="px-6 py-4 text-left font-semibold text-muted-foreground">Review</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                    <td className="px-6 py-4 text-foreground text-xs whitespace-nowrap">{log.timestamp}</td>
                    <td className="px-6 py-4 text-foreground max-w-xs truncate" title={log.prompt}>
                      {log.prompt}
                    </td>
                    <td className="px-6 py-4 text-foreground font-medium">{log.model}</td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-primary">{log.groundingScore}%</span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge 
                        className={`${getHallucinationColor(log.hallucination)} border-0`}
                        variant="secondary"
                      >
                        {log.hallucination}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge 
                        className={`${getToxicityColor(log.toxicity)} border-0`}
                        variant="secondary"
                      >
                        {log.toxicity}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        className={`${
                          log.guardrailStatus === 'PASS'
                            ? 'bg-green-500/10 text-green-400 border-0'
                            : 'bg-red-500/10 text-red-400 border-0'
                        }`}
                        variant="secondary"
                      >
                        {log.guardrailStatus === 'PASS' ? '✓' : '✗'} {log.guardrailStatus}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        className={`${
                          log.reviewStatus === 'approved'
                            ? 'bg-green-500/10 text-green-400 border-0'
                            : log.reviewStatus === 'rejected'
                              ? 'bg-red-500/10 text-red-400 border-0'
                              : 'bg-yellow-500/10 text-yellow-400 border-0'
                        }`}
                        variant="secondary"
                      >
                        {log.reviewStatus === 'approved' ? '✓' : log.reviewStatus === 'rejected' ? '✗' : '◐'}
                        {' '}
                        {log.reviewStatus.charAt(0).toUpperCase() + log.reviewStatus.slice(1)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredLogs.length === 0 && (
            <div className="px-6 py-12 text-center">
              <History className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No logs found matching your filters</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
