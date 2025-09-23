'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Clock, CheckCircle, XCircle, AlertTriangle, User, MessageSquare } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { Appeal } from '@/lib/types'

interface AppealStatusDisplayProps {
  appeals: Appeal[]
  className?: string
}

const statusConfig = {
  PENDING: {
    icon: Clock,
    label: 'Pending Review',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    description: 'Appeal is waiting for review by organization admin'
  },
  UNDER_REVIEW: {
    icon: AlertTriangle,
    label: 'Under Review',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'Appeal is currently being reviewed'
  },
  ACCEPTED: {
    icon: CheckCircle,
    label: 'Accepted',
    color: 'bg-green-100 text-green-800 border-green-200',
    description: 'Appeal was accepted and issue has been reopened'
  },
  DENIED: {
    icon: XCircle,
    label: 'Denied',
    color: 'bg-red-100 text-red-800 border-red-200',
    description: 'Appeal was denied and original decision stands'
  }
}

export function AppealStatusDisplay({ appeals, className }: AppealStatusDisplayProps) {
  if (!appeals || appeals.length === 0) {
    return null
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5" />
            Appeal History
            <Badge variant="secondary">{appeals.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {appeals.map((appeal, index) => {
            const config = statusConfig[appeal.status]
            const Icon = config.icon
            
            return (
              <div key={appeal.id}>
                <div className="space-y-3">
                  {/* Appeal Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={config.color}>
                        <Icon className="h-3 w-3 mr-1" />
                        {config.label}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Appeal #{appeal.id}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(appeal.created_at), { addSuffix: true })}
                    </span>
                  </div>

                  {/* Appeal Reason */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4" />
                      <span className="font-medium">
                        {appeal.reporter_name || 'Citizen'}
                      </span>
                      <span className="text-muted-foreground">appealed:</span>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-md border-l-4 border-amber-500">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {appeal.reason}
                      </p>
                    </div>
                  </div>

                  {/* Reviewer Comment */}
                  {appeal.reviewer_comment && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <MessageSquare className="h-4 w-4" />
                        <span className="font-medium">
                          {appeal.reviewer_name || 'Admin'}
                        </span>
                        <span className="text-muted-foreground">responded:</span>
                        {appeal.updated_at && (
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(appeal.updated_at), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                      <div className={`p-3 rounded-md border-l-4 ${
                        appeal.status === 'ACCEPTED' 
                          ? 'bg-green-50 border-green-500' 
                          : appeal.status === 'DENIED'
                          ? 'bg-red-50 border-red-500'
                          : 'bg-blue-50 border-blue-500'
                      }`}>
                        <p className="text-sm leading-relaxed">
                          {appeal.reviewer_comment}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Status Description */}
                  <p className="text-xs text-muted-foreground">
                    {config.description}
                  </p>
                </div>

                {/* Separator between appeals */}
                {index < appeals.length - 1 && (
                  <Separator className="my-4" />
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}