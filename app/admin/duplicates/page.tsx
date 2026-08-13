'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { Loader2, MapPin, Calendar, Users, MessageSquare, ThumbsUp, AlertCircle, Link2, Activity, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/page-header'

interface DuplicatePair {
  issue_id: number
  issue_title: string
  issue_category: string
  issue_status: string
  issue_latitude: number
  issue_longitude: number
  issue_address: string
  issue_created_at: string
  issue_reporter_id: number
  issue_reporter_name: string
  issue_votes: number
  issue_comments: number
  
  original_issue_id: number
  original_title: string
  original_category: string
  original_status: string
  original_latitude: number
  original_longitude: number
  original_address: string
  original_created_at: string
  original_reporter_id: number
  original_reporter_name: string
  original_votes: number
  original_comments: number
  
  similarity_score: number
  duplicate_status: string
  distance_meters: number
}

export default function AdminDuplicatesPage() {
  const [duplicates, setDuplicates] = useState<DuplicatePair[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [adminComment, setAdminComment] = useState<string>('')
  const [selectedPair, setSelectedPair] = useState<DuplicatePair | null>(null)
  const [activeTab, setActiveTab] = useState<'pending' | 'overview'>('pending')
  const [stats, setStats] = useState<any>(null)
  const [groups, setGroups] = useState<any[]>([])
  const [recentAudit, setRecentAudit] = useState<any[]>([])
  const { toast } = useToast()
  const router = useRouter()

  const fetchDuplicates = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory)
      }
      
      const response = await fetch(`/api/admin/duplicates?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch duplicates')
      }
      
      const data = await response.json()
      setDuplicates(data.items || [])
    } catch (error) {
      console.error('Error fetching duplicates:', error)
      toast({
        title: 'Error',
        description: 'Failed to load duplicate issues',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDuplicates()
  }, [selectedCategory])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/duplicates/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
        setGroups(data.groups || [])
        setRecentAudit(data.recentAudit || [])
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const handleAction = async (
    action: 'merge' | 'ignore' | 'separate',
    pair: DuplicatePair
  ) => {
    try {
      setActionLoading(pair.issue_id)

      const endpoint = `/api/admin/duplicates/${action}`
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          original_issue_id: pair.original_issue_id,
          duplicate_issue_id: pair.issue_id,
          admin_comment: adminComment || undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `Failed to ${action} issues`)
      }

      toast({
        title: 'Success',
        description: `Issues ${action}d successfully`,
      })

      // Refresh the list
      fetchDuplicates()
      setAdminComment('')
      setSelectedPair(null)
    } catch (error) {
      console.error(`Error ${action}ing issues:`, error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : `Failed to ${action} issues`,
        variant: 'destructive',
      })
    } finally {
      setActionLoading(null)
    }
  }

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`
    }
    return `${(meters / 1000).toFixed(2)}km`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getSimilarityColor = (score: number) => {
    if (score >= 0.9) return 'text-red-600'
    if (score >= 0.8) return 'text-orange-600'
    return 'text-yellow-600'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Admin Dashboard
        </Link>
        <PageHeader
          title="Duplicate Issue Management"
          description="Review, manage, and track duplicate issue reports"
          icon={Link2}
        />
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total_linked || 0}</div>
              <p className="text-sm text-muted-foreground">Linked Issues</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{stats.confirmed_duplicates || 0}</div>
              <p className="text-sm text-muted-foreground">Confirmed Duplicates</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-orange-600">{stats.pending_review || 0}</div>
              <p className="text-sm text-muted-foreground">Pending Review</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-gray-600">{stats.total_ignored || 0}</div>
              <p className="text-sm text-muted-foreground">Ignored Pairs</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'pending' ? 'border-blue-600 text-blue-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending Review ({duplicates.length})
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          onClick={() => setActiveTab('overview')}
        >
          Linked Groups & Audit
        </button>
      </div>

      {activeTab === 'pending' && (
        <>
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="ROADS">Roads</SelectItem>
              <SelectItem value="LIGHTING">Lighting</SelectItem>
              <SelectItem value="SANITATION">Sanitation</SelectItem>
              <SelectItem value="PARKS">Parks</SelectItem>
              <SelectItem value="UTILITIES">Utilities</SelectItem>
              <SelectItem value="SAFETY">Safety</SelectItem>
              <SelectItem value="ENVIRONMENT">Environment</SelectItem>
            </SelectContent>
          </Select>

          <Badge variant="secondary">
            {duplicates.length} pending review{duplicates.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      {duplicates.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No pending duplicate reviews</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {duplicates.map((pair) => (
            <Card key={pair.issue_id} className="overflow-hidden">
              <CardHeader className="bg-muted/50">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">Potential Duplicate Detected</CardTitle>
                    <CardDescription>
                      Similarity Score: <span className={`font-bold ${getSimilarityColor(pair.similarity_score)}`}>
                        {(pair.similarity_score * 100).toFixed(0)}%
                      </span>
                      {' • '}
                      Distance: {formatDistance(pair.distance_meters)}
                    </CardDescription>
                  </div>
                  <Badge>{pair.issue_category}</Badge>
                </div>
              </CardHeader>
              
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Original Issue */}
                  <div className="border rounded-lg p-4 bg-blue-50/50">
                    <div className="flex justify-between items-start mb-3">
                      <Badge variant="outline" className="bg-blue-100">Original Issue</Badge>
                      <span className="text-sm text-muted-foreground">#{pair.original_issue_id}</span>
                    </div>
                    
                    <h3 className="font-semibold mb-2">{pair.original_title}</h3>
                    
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span className="truncate">{pair.original_address}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(pair.original_created_at)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>{pair.original_reporter_name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <ThumbsUp className="h-4 w-4" />
                          <span>{pair.original_votes}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-4 w-4" />
                          <span>{pair.original_comments}</span>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="link"
                      className="mt-3 p-0 h-auto"
                      onClick={() => router.push(`/issues/${pair.original_issue_id}`)}
                    >
                      View full issue →
                    </Button>
                  </div>

                  {/* Duplicate Issue */}
                  <div className="border rounded-lg p-4 bg-orange-50/50">
                    <div className="flex justify-between items-start mb-3">
                      <Badge variant="outline" className="bg-orange-100">Possible Duplicate</Badge>
                      <span className="text-sm text-muted-foreground">#{pair.issue_id}</span>
                    </div>
                    
                    <h3 className="font-semibold mb-2">{pair.issue_title}</h3>
                    
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span className="truncate">{pair.issue_address}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(pair.issue_created_at)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>{pair.issue_reporter_name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <ThumbsUp className="h-4 w-4" />
                          <span>{pair.issue_votes}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-4 w-4" />
                          <span>{pair.issue_comments}</span>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="link"
                      className="mt-3 p-0 h-auto"
                      onClick={() => router.push(`/issues/${pair.issue_id}`)}
                    >
                      View full issue →
                    </Button>
                  </div>
                </div>

                <div className="mt-6">
                  <label className="text-sm font-medium mb-2 block">
                    Admin Comment (Optional)
                  </label>
                  <Textarea
                    placeholder="Add a note about your decision..."
                    value={selectedPair?.issue_id === pair.issue_id ? adminComment : ''}
                    onChange={(e) => {
                      setAdminComment(e.target.value)
                      setSelectedPair(pair)
                    }}
                    rows={2}
                  />
                </div>
              </CardContent>

              <CardFooter className="flex justify-end gap-3 bg-muted/30">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      disabled={actionLoading === pair.issue_id}
                      onClick={() => setSelectedPair(pair)}
                    >
                      {actionLoading === pair.issue_id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Merge Issues'
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Merge Issues</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will merge issue #{pair.issue_id} into #{pair.original_issue_id}.
                        Votes and comments will be transferred. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleAction('merge', pair)}>
                        Confirm Merge
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <Button
                  variant="outline"
                  disabled={actionLoading === pair.issue_id}
                  onClick={() => {
                    setSelectedPair(pair)
                    handleAction('separate', pair)
                  }}
                >
                  Keep Separate
                </Button>

                <Button
                  variant="secondary"
                  disabled={actionLoading === pair.issue_id}
                  onClick={() => {
                    setSelectedPair(pair)
                    handleAction('ignore', pair)
                  }}
                >
                  Ignore
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
        </>
      )}

      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Linked Issue Groups */}
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Linked Issue Groups
            </h2>
            {groups.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No linked issue groups found yet.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {groups.map((group: any) => (
                  <Card key={group.root_id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge>{group.category}</Badge>
                            <Badge variant="outline">{group.status}</Badge>
                          </div>
                          <h3 
                            className="font-semibold hover:text-blue-600 cursor-pointer"
                            onClick={() => router.push(`/issues/${group.root_id}`)}
                          >
                            #{group.root_id}: {group.root_title}
                          </h3>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {group.address}
                            </span>
                            <span>by {group.reporter_name}</span>
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <div className="flex items-center gap-1 text-sm font-medium">
                            <Link2 className="h-4 w-4 text-orange-600" />
                            <span className="text-orange-600">{group.linked_count} linked</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <ThumbsUp className="h-3 w-3" />
                            <span>{group.combined_votes} combined votes</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Recent Audit Log */}
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </h2>
            {recentAudit.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No audit activity yet.
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    {recentAudit.map((entry: any) => (
                      <div key={entry.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          entry.action_type.includes('MERGE') ? 'bg-red-500' :
                          entry.action_type.includes('CONFIRM') ? 'bg-green-500' :
                          entry.action_type.includes('IGNORE') ? 'bg-gray-500' :
                          'bg-blue-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {entry.action_type.replace(/_/g, ' ')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Issue #{entry.issue_id}{entry.issue_title ? `: ${entry.issue_title}` : ''}
                            {entry.action_by_name && ` • by ${entry.action_by_name}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(entry.created_at).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric', 
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
