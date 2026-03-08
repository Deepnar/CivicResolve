'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle, MapPin, Calendar, ThumbsUp, Link2, CheckCircle2 } from 'lucide-react'

interface PossibleDuplicate {
  issueId: number
  title: string
  description: string
  address: string
  distanceMeters: number
  similarityScore: number
  category: string
  createdAt: string
  reporterName: string
  votes_count: number
  linked_count?: number
}

interface DuplicateConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  possibleDuplicates: PossibleDuplicate[]
  onConfirm: (acknowledgement: 'SAME_ISSUE' | 'DIFFERENT_ISSUE', selectedIssueId?: number) => void
  onCancel: () => void
}

export function DuplicateConfirmationDialog({
  open,
  onOpenChange,
  possibleDuplicates,
  onConfirm,
  onCancel,
}: DuplicateConfirmationDialogProps) {
  const [selectedOption, setSelectedOption] = useState<'SAME_ISSUE' | 'DIFFERENT_ISSUE' | null>(null)
  const [selectedIssueId, setSelectedIssueId] = useState<number | null>(null)

  // Reset selection when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedOption(null)
      setSelectedIssueId(null)
    }
  }, [open])

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${Math.round(meters)}m away`
    }
    return `${(meters / 1000).toFixed(2)}km away`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const handleConfirm = () => {
    if (selectedOption === 'SAME_ISSUE' && selectedIssueId) {
      onConfirm('SAME_ISSUE', selectedIssueId)
    } else if (selectedOption === 'DIFFERENT_ISSUE') {
      onConfirm('DIFFERENT_ISSUE')
    }
  }

  const canSubmit = selectedOption === 'DIFFERENT_ISSUE' || (selectedOption === 'SAME_ISSUE' && selectedIssueId !== null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-orange-600 mt-1 flex-shrink-0" />
            <div>
              <DialogTitle className="text-xl">Similar Issues Found</DialogTitle>
              <DialogDescription className="mt-2">
                We found {possibleDuplicates.length} similar issue{possibleDuplicates.length !== 1 ? 's' : ''} nearby.
                Please review and select an option below.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Step 1: Choose option */}
        <div className="bg-muted/50 p-4 rounded-lg">
          <Label className="text-base font-semibold mb-3 block">
            Is your report about:
          </Label>
          
          <RadioGroup
            value={selectedOption || ''}
            onValueChange={(value) => {
              setSelectedOption(value as 'SAME_ISSUE' | 'DIFFERENT_ISSUE')
              if (value === 'DIFFERENT_ISSUE') {
                setSelectedIssueId(null)
              }
            }}
          >
            <div className="space-y-3">
              <div className={`flex items-start space-x-3 p-3 rounded-lg border-2 hover:bg-background transition-colors ${selectedOption === 'SAME_ISSUE' ? 'border-orange-400 bg-orange-50/50' : ''}`}>
                <RadioGroupItem value="SAME_ISSUE" id="same" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="same" className="text-base font-medium cursor-pointer">
                    The same issue as one listed below
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Select which issue below matches yours. Your report will be linked to it, and votes will be combined.
                  </p>
                </div>
              </div>

              <div className={`flex items-start space-x-3 p-3 rounded-lg border-2 hover:bg-background transition-colors ${selectedOption === 'DIFFERENT_ISSUE' ? 'border-green-400 bg-green-50/50' : ''}`}>
                <RadioGroupItem value="DIFFERENT_ISSUE" id="different" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="different" className="text-base font-medium cursor-pointer">
                    A different issue nearby
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    This is a separate problem. Your issue will be created independently.
                  </p>
                </div>
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* Step 2: If same issue, select which one */}
        {selectedOption === 'SAME_ISSUE' && (
          <div className="space-y-3">
            <Label className="text-base font-semibold block">
              Select the matching issue:
            </Label>
            {possibleDuplicates.map((duplicate) => (
              <Card 
                key={duplicate.issueId} 
                className={`border-2 cursor-pointer transition-all hover:shadow-md ${
                  selectedIssueId === duplicate.issueId 
                    ? 'border-orange-500 bg-orange-50/30 ring-2 ring-orange-200' 
                    : 'hover:border-gray-300'
                }`}
                onClick={() => setSelectedIssueId(duplicate.issueId)}
              >
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <Badge>{duplicate.category}</Badge>
                      {selectedIssueId === duplicate.issueId && (
                        <CheckCircle2 className="h-5 w-5 text-orange-600" />
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Issue #{duplicate.issueId}
                    </div>
                  </div>

                  <h3 className="font-semibold text-lg mb-2">{duplicate.title}</h3>
                  
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {duplicate.description}
                  </p>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span className="truncate">{duplicate.address}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Reported {formatDate(duplicate.createdAt)}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <ThumbsUp className="h-4 w-4" />
                          <span>{duplicate.votes_count} votes</span>
                        </div>
                        {(duplicate.linked_count ?? 0) > 0 && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Link2 className="h-4 w-4" />
                            <span>{duplicate.linked_count} linked</span>
                          </div>
                        )}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium text-orange-600">
                          {formatDistance(duplicate.distanceMeters)}
                        </span>
                        {' \u2022 '}
                        <span className="text-muted-foreground">
                          {(duplicate.similarityScore * 100).toFixed(0)}% similar
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <Button
                      variant="link"
                      className="p-0 h-auto text-blue-600"
                      onClick={(e) => {
                        e.stopPropagation()
                        window.open(`/issues/${duplicate.issueId}`, '_blank')
                      }}
                    >
                      View full details &rarr;
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Show issues preview when "Different Issue" is selected */}
        {selectedOption === 'DIFFERENT_ISSUE' && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              These similar issues will remain separate from your new report:
            </p>
            {possibleDuplicates.map((duplicate) => (
              <Card key={duplicate.issueId} className="border opacity-60">
                <CardContent className="py-3 px-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{duplicate.category}</Badge>
                      <span className="font-medium text-sm">{duplicate.title}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">#{duplicate.issueId}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <DialogFooter className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canSubmit}
          >
            {selectedOption === 'SAME_ISSUE' 
              ? `Link to Issue #${selectedIssueId || '...'}` 
              : 'Submit as New Issue'
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
