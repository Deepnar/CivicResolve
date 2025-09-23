"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { AlertTriangle, Clock, CheckCircle, XCircle, User, MessageSquare, Calendar, MapPin } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AdminAppealReview } from "@/components/appeals"
import { formatDistanceToNow } from "date-fns"
import { useAuth } from "@/hooks/use-auth"
import type { Appeal } from "@/lib/types"

const statusConfig = {
  PENDING: {
    icon: Clock,
    label: 'Pending Review',
    color: 'bg-yellow-100 text-yellow-800',
    description: 'Appeals waiting for review'
  },
  UNDER_REVIEW: {
    icon: AlertTriangle,
    label: 'Under Review',
    color: 'bg-blue-100 text-blue-800',
    description: 'Appeals currently being reviewed'
  },
  ACCEPTED: {
    icon: CheckCircle,
    label: 'Accepted',
    color: 'bg-green-100 text-green-800',
    description: 'Appeals that were accepted'
  },
  DENIED: {
    icon: XCircle,
    label: 'Denied',
    color: 'bg-red-100 text-red-800',
    description: 'Appeals that were denied'
  }
}

export default function AdminAppealsPage() {
  const { user } = useAuth()
  const [appeals, setAppeals] = useState<Appeal[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null)

  useEffect(() => {
    fetchAppeals()
  }, [])

  const fetchAppeals = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/appeals')
      
      if (!response.ok) {
        throw new Error('Failed to fetch appeals')
      }
      
      const data = await response.json()
      setAppeals(data.appeals || [])
    } catch (err) {
      console.error('Error fetching appeals:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAppealReviewed = () => {
    fetchAppeals() // Refresh the appeals list
    setSelectedAppeal(null) // Close the review panel
  }

  // Filter appeals based on active tab
  const filteredAppeals = appeals.filter(appeal => {
    if (activeTab === "all") return true
    return appeal.status === activeTab
  })

  // Calculate counts for tabs
  const statusCounts = {
    all: appeals.length,
    PENDING: appeals.filter(a => a.status === 'PENDING').length,
    UNDER_REVIEW: appeals.filter(a => a.status === 'UNDER_REVIEW').length,
    ACCEPTED: appeals.filter(a => a.status === 'ACCEPTED').length,
    DENIED: appeals.filter(a => a.status === 'DENIED').length,
  }

  const statusTabs = [
    { id: "all", label: "All Appeals", count: statusCounts.all },
    { id: "PENDING", label: "Pending", count: statusCounts.PENDING },
    { id: "UNDER_REVIEW", label: "Under Review", count: statusCounts.UNDER_REVIEW },
    { id: "ACCEPTED", label: "Accepted", count: statusCounts.ACCEPTED },
    { id: "DENIED", label: "Denied", count: statusCounts.DENIED },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Appeal Management" 
          description="Review and manage citizen appeals"
        />
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" text="Loading appeals..." />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Appeal Management" 
        description="Review and manage citizen appeals for issue decisions"
      />

      {/* Status Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Object.entries(statusConfig).map(([status, config]) => {
          const Icon = config.icon
          const count = statusCounts[status as keyof typeof statusCounts]
          
          return (
            <Card key={status} className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setActiveTab(status)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${config.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{config.label}</p>
                      <p className="text-xs text-muted-foreground">{config.description}</p>
                    </div>
                  </div>
                  <div className="text-2xl font-bold">{count}</div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Status Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        {statusTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appeals List */}
        <Card>
          <CardHeader>
            <CardTitle>Appeals List</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredAppeals.length === 0 ? (
              <EmptyState
                icon={AlertTriangle}
                title="No Appeals Found"
                description={`No appeals found${activeTab !== 'all' ? ` with status ${activeTab}` : ''}.`}
              />
            ) : (
              <div className="space-y-4">
                {filteredAppeals.map((appeal) => {
                  const config = statusConfig[appeal.status]
                  const Icon = config.icon
                  
                  return (
                    <motion.div
                      key={appeal.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                        selectedAppeal?.id === appeal.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                      }`}
                      onClick={() => setSelectedAppeal(appeal)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-start justify-between mb-3">
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
                      
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">
                          Issue #{appeal.issue_id}: {appeal.issue_title}
                        </h4>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {appeal.reporter_name}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {appeal.issue_address}
                          </div>
                        </div>
                        
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {appeal.reason}
                        </p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Appeal Review Panel */}
        <div>
          {selectedAppeal ? (
            <AdminAppealReview
              appeal={selectedAppeal}
              onReviewComplete={handleAppealReviewed}
            />
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium text-lg mb-2">Select an Appeal</h3>
                <p className="text-muted-foreground">
                  Choose an appeal from the list to review and take action.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}