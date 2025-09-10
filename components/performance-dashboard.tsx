'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { RefreshCw, Activity, HardDrive, Clock, Zap } from 'lucide-react'

interface PerformanceStats {
  count: number
  average: number
  min: number
  max: number
}

interface PerformanceData {
  timestamp: string
  memory: {
    used: number
    total: number
    percentage: number
    usedMB: number
    totalMB: number
  }
  performance: Record<string, PerformanceStats>
  aggregated: {
    totalOperations: number
    averageResponseTime: number
    slowestOperation: {
      operation: string
      duration: number
    } | null
  }
  system: {
    nodeVersion: string
    platform: string
    arch: string
    uptime: number
    pid: number
  }
}

export function PerformanceDashboard() {
  const [data, setData] = useState<PerformanceData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchMetrics = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/performance')
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      setData(result)
      setLastUpdated(new Date())
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch performance metrics')
      console.error('Error fetching performance metrics:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000)
    return () => clearInterval(interval)
  }, [])

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    return `${hours}h ${minutes}m ${secs}s`
  }

  const formatDuration = (ms: number) => {
    if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`
    if (ms < 1000) return `${ms.toFixed(2)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  if (error) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Activity className="h-5 w-5" />
            Performance Metrics - Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchMetrics} disabled={loading}>
              {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8" />
            Performance Dashboard
          </h1>
          {lastUpdated && (
            <p className="text-sm text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <Button onClick={fetchMetrics} disabled={loading}>
          {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Refresh
        </Button>
      </div>

      {!data && loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : data ? (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.memory.percentage.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  {data.memory.usedMB}MB / {data.memory.totalMB}MB
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Operations</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.aggregated.totalOperations}</div>
                <p className="text-xs text-muted-foreground">Since server start</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatDuration(data.aggregated.averageResponseTime)}
                </div>
                <p className="text-xs text-muted-foreground">Across all operations</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Uptime</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatUptime(data.system.uptime)}</div>
                <p className="text-xs text-muted-foreground">Node.js {data.system.nodeVersion}</p>
              </CardContent>
            </Card>
          </div>

          {/* Performance Details */}
          <Card>
            <CardHeader>
              <CardTitle>Operation Performance</CardTitle>
              <CardDescription>Detailed performance metrics for each operation</CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(data.performance).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No performance data available yet.</p>
                  <p className="text-sm">Make some API calls to see metrics here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(data.performance).map(([operation, stats]) => (
                    <div key={operation} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">{operation}</Badge>
                        <span className="text-sm text-muted-foreground">{stats.count} calls</span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-green-600">Min:</span> {formatDuration(stats.min)}
                        </div>
                        <div>
                          <span className="font-medium text-blue-600">Avg:</span> {formatDuration(stats.average)}
                        </div>
                        <div>
                          <span className="font-medium text-red-600">Max:</span> {formatDuration(stats.max)}
                        </div>
                      </div>
                      <Separator />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Information */}
          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Platform:</span> {data.system.platform}
                </div>
                <div>
                  <span className="font-medium">Architecture:</span> {data.system.arch}
                </div>
                <div>
                  <span className="font-medium">Process ID:</span> {data.system.pid}
                </div>
              </div>
            </CardContent>
          </Card>

          {data.aggregated.slowestOperation && (
            <Card>
              <CardHeader>
                <CardTitle className="text-orange-600">Slowest Operation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{data.aggregated.slowestOperation.operation}</Badge>
                  <span className="font-mono text-lg font-bold text-orange-600">
                    {formatDuration(data.aggregated.slowestOperation.duration)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : null}
    </div>
  )
}
