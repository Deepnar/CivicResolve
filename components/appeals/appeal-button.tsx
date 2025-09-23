'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'
import { AppealSubmissionModal } from './appeal-submission-modal'

interface AppealButtonProps {
  issueId: number
  issueTitle: string
  issueStatus: string
  isOriginalReporter: boolean
  hasActiveAppeal: boolean
  onAppealSubmitted: () => void
  className?: string
}

export function AppealButton({
  issueId,
  issueTitle,
  issueStatus,
  isOriginalReporter,
  hasActiveAppeal,
  onAppealSubmitted,
  className
}: AppealButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Only show appeal button if:
  // 1. User is the original reporter
  // 2. Issue status is REJECTED or RESOLVED
  // 3. No active appeal exists
  const shouldShowButton = 
    isOriginalReporter && 
    (issueStatus === 'REJECTED' || issueStatus === 'RESOLVED') && 
    !hasActiveAppeal

  if (!shouldShowButton) {
    return null
  }

  const handleAppealSuccess = () => {
    onAppealSubmitted()
  }

  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        variant="outline"
        size="sm"
        className={`border-amber-200 text-amber-700 hover:bg-amber-50 ${className}`}
      >
        <AlertTriangle className="h-4 w-4 mr-2" />
        Appeal Decision
      </Button>

      <AppealSubmissionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        issueId={issueId}
        issueTitle={issueTitle}
        onSubmitSuccess={handleAppealSuccess}
      />
    </>
  )
}