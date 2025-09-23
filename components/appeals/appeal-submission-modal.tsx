'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertTriangle } from 'lucide-react'

interface AppealSubmissionModalProps {
  isOpen: boolean
  onClose: () => void
  issueId: number
  issueTitle: string
  onSubmitSuccess: () => void
}

export function AppealSubmissionModal({
  isOpen,
  onClose,
  issueId,
  issueTitle,
  onSubmitSuccess
}: AppealSubmissionModalProps) {
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!reason.trim()) {
      setError('Please provide a reason for your appeal')
      return
    }

    if (reason.length > 2000) {
      setError('Reason must be less than 2000 characters')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/issues/${issueId}/appeal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: reason.trim()
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to submit appeal')
      }

      // Reset form and close modal
      setReason('')
      onClose()
      onSubmitSuccess()
      
    } catch (err) {
      console.error('Error submitting appeal:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setReason('')
      setError(null)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Appeal Decision
          </DialogTitle>
          <DialogDescription>
            Submit an appeal for the decision on issue: <strong>{issueTitle}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="appeal-reason" className="text-sm font-medium">
              Reason for Appeal <span className="text-red-500">*</span>
            </label>
            <Textarea
              id="appeal-reason"
              placeholder="Please explain why you believe the decision should be reconsidered. Provide specific details about why the issue was incorrectly marked as resolved or rejected."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={6}
              className="resize-none"
              disabled={isSubmitting}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Be specific and provide evidence when possible</span>
              <span>{reason.length}/2000</span>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!reason.trim() || isSubmitting}
              className="min-w-[100px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                'Submit Appeal'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}