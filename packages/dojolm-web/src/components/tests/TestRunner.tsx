/**
 * File: TestRunner.tsx
 * Purpose: Test runner component with progress and results
 * Index:
 * - TestRunner component (line 20)
 * - TestSummary component (line 105)
 * - TestResultsTable component (line 158)
 * - TestProgressBar component (line 217)
 */

'use client'

import { useState } from 'react'
import { TestSuiteResult, TestResult as TestResultType } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn, formatDuration } from '@/lib/utils'
import { Play, Loader2, CheckCircle2, XCircle, SkipForward, Trash2 } from 'lucide-react'

interface TestRunnerProps {
  onRunTests: (filter?: string, verbose?: boolean) => Promise<TestSuiteResult>
  className?: string
}

export function TestRunner({ onRunTests, className }: TestRunnerProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<TestSuiteResult | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [verbose, setVerbose] = useState(false)

  const handleRunTests = async () => {
    setIsLoading(true)
    try {
      const testResults = await onRunTests(filter === 'all' ? undefined : filter, verbose)
      setResults(testResults)
    } catch (error) {
      console.error('Tests failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearResults = () => {
    setResults(null)
  }

  return (
    <div className={cn('space-y-6', className)}>
      <Card>
        <CardHeader>
          <CardTitle>Test Runner</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Tests" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tests</SelectItem>
                <SelectItem value="typecheck">Type Check Only</SelectItem>
                <SelectItem value="regression">Regression Tests</SelectItem>
                <SelectItem value="regression,false-positive">Core Tests</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={handleRunTests}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 motion-safe:animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run Tests
                </>
              )}
            </Button>

            <Button
              onClick={handleClearResults}
              variant="secondary"
              disabled={isLoading}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Clear
            </Button>
          </div>

          {isLoading && (
            <TestProgressBar progress={0} message="Initializing test suite..." />
          )}

          {results && (
            <>
              <TestSummary summary={results.summary} />
              <TestResultsTable results={results.results} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

interface TestProgressBarProps {
  progress: number
  message: string
}

function TestProgressBar({ progress, message }: TestProgressBarProps) {
  return (
    <div className="space-y-2">
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary motion-safe:transition-all duration-[var(--transition-slow)]"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

interface TestSummaryProps {
  summary: TestSuiteResult['summary']
}

function TestSummary({ summary }: TestSummaryProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold">{summary.total}</div>
          <div className="text-xs text-muted-foreground mt-1">Total</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-green-500">{summary.passed}</div>
          <div className="text-xs text-muted-foreground mt-1">Passed</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-red-500">{summary.failed}</div>
          <div className="text-xs text-muted-foreground mt-1">Failed</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-muted-foreground">{summary.skipped}</div>
          <div className="text-xs text-muted-foreground mt-1">Skipped</div>
        </CardContent>
      </Card>
    </div>
  )
}

interface TestResultsTableProps {
  results: TestResultType[]
}

function TestResultsTable({ results }: TestResultsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Test Results</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Test</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Duration</TableHead>
              <TableHead>Output</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((result, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {result.required && <Badge variant="outline" className="text-xs">Required</Badge>}
                    {result.name}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      result.status === 'pass'
                        ? 'text-green-500 border-green-500/20 bg-green-500/10'
                        : result.status === 'fail'
                        ? 'text-red-500 border-red-500/20 bg-red-500/10'
                        : 'text-muted-foreground'
                    }
                  >
                    {result.status === 'pass' && <CheckCircle2 className="h-3 w-3 mr-1 inline" />}
                    {result.status === 'fail' && <XCircle className="h-3 w-3 mr-1 inline" />}
                    {result.status === 'skip' && <SkipForward className="h-3 w-3 mr-1 inline" />}
                    {result.status.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono text-sm text-muted-foreground">
                  {formatDuration(result.duration_ms)}
                </TableCell>
                <TableCell>
                  {result.output ? (
                    <code className="text-xs bg-muted px-2 py-1 rounded block max-w-md truncate">
                      {result.output}
                    </code>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
