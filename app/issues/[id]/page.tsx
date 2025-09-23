"use client"

import { useState, useEffect, use } from "react"
import { motion } from "framer-motion"
import { formatDistanceToNow } from "date-fns"
import { ArrowLeft, MapPin, Calendar, MessageCircle, Send } from "lucide-react"
import Link from "next/link"
import { PageHeader } from "@/components/ui/page-header"
import { StatusBadge } from "@/components/ui/badge-status"
import { CategoryBadge } from "@/components/ui/badge-category"
import { PriorityIndicator } from "@/components/ui/priority-indicator"
import { VoteButton } from "@/components/ui/vote-button"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Navbar } from "@/components/navigation/navbar"
import { AppealButton, AppealStatusDisplay, AdminAppealReview } from "@/components/appeals"
import { useAuth } from "@/hooks/use-auth"
import { convertToIST } from "@/lib/date-utils"
import type { Issue, Comment, Appeal } from "@/lib/types"

interface IssueDetailPageProps {
  params: Promise<{ id: string }>
}

export default function IssueDetailPage({ params }: IssueDetailPageProps) {
  const resolvedParams = use(params)
  const { user } = useAuth()
  const [issue, setIssue] = useState<Issue | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newComment, setNewComment] = useState("")
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [hasVoted, setHasVoted] = useState(false)
  const [voteCount, setVoteCount] = useState(0)
  const [appeals, setAppeals] = useState<Appeal[]>([])
  const [appealsLoading, setAppealsLoading] = useState(false)

  useEffect(() => {
    const fetchIssue = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/issues/${resolvedParams.id}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Issue not found')
          } else {
            throw new Error('Failed to fetch issue')
          }
          return
        }
        
        const data = await response.json()
        setIssue(data.issue)
        setHasVoted(data.issue.hasVoted || false)
        setVoteCount(data.issue.votes_count || 0)
      } catch (err) {
        console.error('Error fetching issue:', err)
        setError('Failed to load issue')
      } finally {
        setLoading(false)
      }
    }

    fetchIssue()
  }, [resolvedParams.id])

  // Fetch appeals for this issue
  const fetchAppeals = async () => {
    if (!resolvedParams.id) return
    
    setAppealsLoading(true)
    try {
      const response = await fetch(`/api/issues/${resolvedParams.id}/appeals`)
      if (response.ok) {
        const data = await response.json()
        setAppeals(data.appeals || [])
      }
    } catch (err) {
      console.error('Error fetching appeals:', err)
    } finally {
      setAppealsLoading(false)
    }
  }

  useEffect(() => {
    fetchAppeals()
  }, [resolvedParams.id])

  const handleAppealSubmitted = () => {
    // Refresh issue and appeals data
    window.location.reload()
  }

  const handleAppealReviewed = () => {
    // Refresh issue and appeals data
    window.location.reload()
  }

  const handleSubmitComment = async () => {
    if (!newComment.trim() || isSubmittingComment || !user) return

    setIsSubmittingComment(true)
    try {
      const response = await fetch(`/api/issues/${resolvedParams.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin', // Include httpOnly cookies
        body: JSON.stringify({
          content: newComment,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit comment')
      }

      const data = await response.json()
      
      // Add the new comment to the issue
      if (issue) {
        setIssue({
          ...issue,
          comments: [...issue.comments, data.comment],
        })
      }
      
      setNewComment("")
    } catch (error) {
      console.error('Error submitting comment:', error)
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const handleVote = async () => {
    if (!user || !issue) return

    try {
      const response = await fetch(`/api/issues/${resolvedParams.id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin', // Include httpOnly cookies
      })

      if (!response.ok) {
        throw new Error('Failed to vote')
      }

      const data = await response.json()
      
      // Update local state with API response
      setHasVoted(data.hasVoted)
      setVoteCount(data.votesCount)
    } catch (error) {
      console.error('Error voting:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30">
        <Navbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <LoadingSpinner size="lg" text="Loading issue details..." />
        </div>
      </div>
    )
  }

  if (error || !issue) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30">
        <Navbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {error === 'Issue not found' ? 'Issue Not Found' : 'Error Loading Issue'}
            </h1>
            <p className="text-gray-600 mb-4">
              {error === 'Issue not found' 
                ? "The issue you're looking for doesn't exist." 
                : "There was a problem loading the issue details."
              }
            </p>
            <Button variant="outline" asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-6">
            <Button variant="ghost" asChild className="mb-4">
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>

            <PageHeader
              title={issue.title}
              description={`Issue #${issue.id} • Reported ${formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true })}`}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Issue Details Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CategoryBadge category={issue.category} />
                      <StatusBadge status={issue.status} />
                      <PriorityIndicator priority={issue.priority} />
                    </div>
                    <VoteButton 
                      voteCount={voteCount} 
                      onVote={handleVote}
                      isVoted={hasVoted}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-gray-700 leading-relaxed">{issue.description}</p>
                    
                    {issue.imageUrl && (
                      <div className="rounded-lg overflow-hidden">
                        <img 
                          src={issue.imageUrl} 
                          alt="Issue" 
                          className="w-full h-auto max-h-96 object-cover"
                        />
                      </div>
                    )}

                    {/* Resolution Photo */}
                    {issue.status === 'RESOLVED' && issue.resolutionImageUrl && (
                      <div className="rounded-lg overflow-hidden border-2 border-green-200 bg-green-50 p-4">
                        <div className="mb-2">
                          <h4 className="text-sm font-semibold text-green-800 mb-1">Resolution Proof</h4>
                          <p className="text-xs text-green-600">Photo showing the completed work</p>
                        </div>
                        <img 
                          src={issue.resolutionImageUrl} 
                          alt="Resolution proof" 
                          className="w-full h-auto max-h-64 object-cover rounded-md"
                        />
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>{issue.address}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Created {formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true })}</span>
                        </div>
                      </div>
                      
                      {/* Appeal Button for Citizens */}
                      {user && (
                        <AppealButton
                          issueId={parseInt(resolvedParams.id)}
                          issueTitle={issue.title}
                          issueStatus={issue.status}
                          isOriginalReporter={user.id.toString() === issue.reporterId.toString()}
                          hasActiveAppeal={appeals.some(appeal => ['PENDING', 'UNDER_REVIEW'].includes(appeal.status))}
                          onAppealSubmitted={handleAppealSubmitted}
                        />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Appeal Status Display */}
              {appeals && appeals.length > 0 && (
                <AppealStatusDisplay appeals={appeals} />
              )}

              {/* Admin Appeal Review */}
              {user && user.role === 'ORGANIZATION_ADMIN' && appeals && appeals.length > 0 && (
                <div className="space-y-4">
                  {appeals
                    .filter(appeal => ['PENDING', 'UNDER_REVIEW'].includes(appeal.status))
                    .map(appeal => (
                      <AdminAppealReview
                        key={appeal.id}
                        appeal={appeal}
                        onReviewComplete={handleAppealReviewed}
                      />
                    ))}
                </div>
              )}

              {/* Comments Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    Comments ({(issue as any).comments_count || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {issue.comments && issue.comments.length > 0 ? (
                      issue.comments
                        .filter((comment: any) => comment && comment.id && comment.author_name)
                        .map((comment: any) => (
                        <div key={comment.id} className="flex gap-3 p-4 rounded-lg bg-gray-50/80 backdrop-blur-sm">
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarFallback className="text-sm bg-blue-100 text-blue-700">
                              {comment.author_name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm text-gray-900">{comment.author_name}</span>
                              <span className="text-xs text-gray-500">
                                {formatDistanceToNow(convertToIST(comment.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed">{comment.content}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-8">No comments yet. Be the first to comment!</p>
                    )}

                    {/* Add Comment Form */}
                    {user ? (
                      <div className="border-t pt-4 mt-6">
                        <div className="flex gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-blue-100 text-blue-700">
                              {user.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 space-y-3">
                            <Textarea
                              placeholder="Add a comment..."
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              rows={3}
                            />
                            <div className="flex justify-end">
                              <Button
                                onClick={handleSubmitComment}
                                disabled={!newComment.trim() || isSubmittingComment}
                                size="sm"
                              >
                                {isSubmittingComment ? (
                                  <LoadingSpinner size="sm" className="mr-2" />
                                ) : (
                                  <Send className="h-4 w-4 mr-2" />
                                )}
                                {isSubmittingComment ? "Posting..." : "Post Comment"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4 border-t">
                        <p className="text-gray-500 mb-2">Sign in to add a comment</p>
                        <Button variant="outline" size="sm" asChild>
                          <Link href="/login">Sign In</Link>
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Reporter Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Reported By</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-gray-100 text-gray-700">
                        {issue.reporter.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{issue.reporter.name}</p>
                      <p className="text-sm text-gray-500">{issue.reporter.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Issue Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Issue Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Votes</span>
                    <span className="font-medium">{(issue as any).votes_count || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Comments</span>
                    <span className="font-medium">{(issue as any).comments_count || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Status</span>
                    <StatusBadge status={issue.status} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Priority</span>
                    <PriorityIndicator priority={issue.priority} variant="full" />
                  </div>
                </CardContent>
              </Card>

              {/* Location */}
              <Card>
                <CardHeader>
                  <CardTitle>Location</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-1 text-gray-500" />
                      <p className="text-sm">{issue.address}</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      {typeof issue.latitude === 'number' ? issue.latitude.toFixed(6) : issue.latitude}, {typeof issue.longitude === 'number' ? issue.longitude.toFixed(6) : issue.longitude}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
