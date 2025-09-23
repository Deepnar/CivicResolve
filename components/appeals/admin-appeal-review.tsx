'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  MessageSquare, 
  User,
  Loader2,
  Clock
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { Appeal } from '@/lib/types'

interface AdminAppealReviewProps {
  appeal: Appeal
  onReviewComplete: () => void
  className?: string
}

export function AdminAppealReview({ 
  appeal, 
  onReviewComplete, 
  className 
}: AdminAppealReviewProps) {
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canReview = ['PENDING', 'UNDER_REVIEW'].includes(appeal.status)

  const handleDecision = async (decision: 'ACCEPTED' | 'DENIED') => {
    if (!comment.trim()) {
      setError('Please provide a comment explaining your decision')
      return
    }

    if (comment.length > 2000) {
      setError('Comment must be less than 2000 characters')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/appeals/${appeal.id}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          decision,
          comment: comment.trim()
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to submit review')
      }

      // Reset form and notify parent
      setComment('')
      onReviewComplete()
      
    } catch (err) {
      console.error('Error submitting review:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending Review
          </Badge>
        )
      case 'UNDER_REVIEW':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Under Review
          </Badge>
        )
      case 'ACCEPTED':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Accepted
          </Badge>
        )
      case 'DENIED':
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Denied
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Appeal Review
          </div>
          {getStatusBadge(appeal.status)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Appeal Details */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4" />
            <span className="font-medium">
              {appeal.reporter_name || 'Citizen'}
            </span>
            <span className="text-muted-foreground">
              submitted {formatDistanceToNow(new Date(appeal.created_at), { addSuffix: true })}
            </span>
          </div>
          
          <div className="bg-muted/50 p-4 rounded-md border-l-4 border-amber-500">
            <h4 className="font-medium text-sm mb-2">Reason for Appeal:</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {appeal.reason}
            </p>
          </div>
        </div>

        {/* Existing Review (if any) */}
        {appeal.reviewer_comment && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <MessageSquare className="h-4 w-4" />
              <span className="font-medium">Previous Review</span>
              {appeal.updated_at && (
                <span className="text-muted-foreground text-xs">
                  {formatDistanceToNow(new Date(appeal.updated_at), { addSuffix: true })}
                </span>
              )}
            </div>
            <div className={`p-3 rounded-md border-l-4 ${
              appeal.status === 'ACCEPTED' 
                ? 'bg-green-50 border-green-500' 
                : 'bg-red-50 border-red-500'
            }`}>
              <p className="text-sm leading-relaxed">
                {appeal.reviewer_comment}
              </p>
            </div>
          </div>
        )}

        {/* Review Form */}
        {canReview && (
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium">Review Decision</h4>
            
            <div className="space-y-2">
              <label htmlFor="review-comment" className="text-sm font-medium">
                Review Comment <span className="text-red-500">*</span>
              </label>
              <Textarea
                id="review-comment"
                placeholder="Explain your decision. If accepting, describe next steps. If denying, explain why the original decision stands."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                className="resize-none"
                disabled={isSubmitting}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Provide clear reasoning for your decision</span>
                <span>{comment.length}/2000</span>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() => handleDecision('ACCEPTED')}
                disabled={!comment.trim() || isSubmitting}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Accept Appeal
              </Button>
              <Button
                onClick={() => handleDecision('DENIED')}
                disabled={!comment.trim() || isSubmitting}
                variant="destructive"
                className="flex-1"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                Deny Appeal
              </Button>
            </div>
          </div>
        )}

        {/* Non-reviewable status message */}
        {!canReview && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This appeal has already been reviewed and cannot be modified.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}