"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft, Users, Mail, Phone, MapPin, Settings, Plus, UserPlus, Trash2, Crown, Shield } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { formatTimeAgo } from "@/lib/date-utils"
import { ISSUE_CATEGORIES } from "@/lib/constants"

interface Organization {
  id: number
  name: string
  description?: string
  email?: string
  phone?: string
  address?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface Member {
  id: number
  user_id: number
  organization_id: number
  role: 'ORGANIZATION_ADMIN' | 'MEMBER'
  employee_id?: string
  position?: string
  is_active: boolean
  assigned_at: string
  user_name: string
  user_email: string
  user_role: string
}

interface CategoryMapping {
  id: number
  category: string
  organization_id: number
  is_primary: boolean
  created_at: string
}

export default function OrganizationDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const router = useRouter()
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [categoryMappings, setCategoryMappings] = useState<CategoryMapping[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddUserDialog, setShowAddUserDialog] = useState(false)
  const [checkingUser, setCheckingUser] = useState(false)
  const [userCheckResult, setUserCheckResult] = useState<any>(null)
  const [addUserForm, setAddUserForm] = useState({
    email: "",
    employee_id: "",
    position: "",
    role: "MEMBER" as 'ORGANIZATION_ADMIN' | 'MEMBER'
  })
  const [submitting, setSubmitting] = useState(false)
  const [organizationId, setOrganizationId] = useState<number | null>(null)
  const { toast } = useToast()

  // Unwrap params
  useEffect(() => {
    params.then((resolvedParams) => {
      const id = parseInt(resolvedParams.id)
      setOrganizationId(id)
    })
  }, [params])

  useEffect(() => {
    if (organizationId) {
      fetchOrganizationDetails()
    }
  }, [organizationId])

  const fetchOrganizationDetails = async () => {
    if (!organizationId) return
    
    try {
      setLoading(true)
      const response = await fetch(`/api/organizations/${organizationId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch organization details')
      }

      const data = await response.json()
      setOrganization(data.organization)
      setMembers(data.members || [])
      setCategoryMappings(data.categoryMappings || [])
    } catch (error) {
      console.error('Error fetching organization details:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch organization details"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCheckUser = async () => {
    if (!addUserForm.email.trim() || !organizationId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Email is required"
      })
      return
    }

    try {
      setCheckingUser(true)
      const response = await fetch(
        `/api/organizations/${organizationId}/check-user?email=${encodeURIComponent(addUserForm.email.trim())}`
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check user')
      }

      setUserCheckResult(data)

      if (!data.userExists) {
        toast({
          variant: "destructive",
          title: "User Not Found",
          description: "This email must already be registered before assignment"
        })
      } else if (data.alreadyAssigned) {
        toast({
          variant: "destructive",
          title: "Already Assigned",
          description: "This user is already assigned to this organization"
        })
      }
    } catch (error: any) {
      console.error('Error checking user:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to check user"
      })
    } finally {
      setCheckingUser(false)
    }
  }

  const handleAddUser = async () => {
    if (!userCheckResult?.userExists || userCheckResult?.alreadyAssigned || !organizationId) {
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch(`/api/organizations/${organizationId}/assign-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addUserForm)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to assign user')
      }

      toast({
        title: "Success",
        description: "User assigned to organization successfully"
      })

      setShowAddUserDialog(false)
      setAddUserForm({ email: "", employee_id: "", position: "", role: "MEMBER" })
      setUserCheckResult(null)
      fetchOrganizationDetails()
    } catch (error: any) {
      console.error('Error assigning user:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to assign user"
      })
    } finally {
      setSubmitting(false)
    }
  }

  const getCategoryName = (category: string) => {
    return ISSUE_CATEGORIES[category as keyof typeof ISSUE_CATEGORIES]?.label || category
  }

  const getCategoryColor = (category: string) => {
    return ISSUE_CATEGORIES[category as keyof typeof ISSUE_CATEGORIES]?.color || "#6b7280"
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="container mx-auto px-4 py-8">
        <EmptyState
          icon={Users}
          title="Organization not found"
          description="The organization you're looking for doesn't exist or you don't have permission to view it"
        />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{organization.name}</h1>
          {organization.description && (
            <p className="text-gray-600 mt-1">{organization.description}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Organization Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Organization Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              <Badge variant={organization.is_active ? "default" : "secondary"}>
                {organization.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
            
            {organization.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-sm">{organization.email}</span>
              </div>
            )}
            
            {organization.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-sm">{organization.phone}</span>
              </div>
            )}
            
            {organization.address && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                <span className="text-sm">{organization.address}</span>
              </div>
            )}
            
            <div className="text-xs text-gray-500 pt-2 border-t">
              Created {formatTimeAgo(organization.created_at)}
            </div>
          </CardContent>
        </Card>

        {/* Category Mappings */}
        <Card>
          <CardHeader>
            <CardTitle>Responsible Categories</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryMappings.length === 0 ? (
              <p className="text-sm text-gray-500">No categories assigned</p>
            ) : (
              <div className="space-y-2">
                {categoryMappings.map((mapping) => (
                  <div
                    key={mapping.id}
                    className="flex items-center justify-between p-2 rounded border"
                  >
                    <span
                      className="text-sm font-medium"
                      style={{ color: getCategoryColor(mapping.category) }}
                    >
                      {getCategoryName(mapping.category)}
                    </span>
                    {mapping.is_primary && (
                      <Badge variant="secondary" className="text-xs">
                        Primary
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Members</span>
                <span className="text-2xl font-bold">{members.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Administrators</span>
                <span className="text-2xl font-bold">
                  {members.filter(m => m.role === 'ORGANIZATION_ADMIN').length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Categories</span>
                <span className="text-2xl font-bold">{categoryMappings.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Members Section */}
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Organization Members ({members.length})
          </CardTitle>
          
          <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add User to Organization</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="email"
                      type="email"
                      value={addUserForm.email}
                      onChange={(e) => {
                        setAddUserForm({ ...addUserForm, email: e.target.value })
                        setUserCheckResult(null)
                      }}
                      placeholder="Enter email address"
                    />
                    <Button 
                      onClick={handleCheckUser} 
                      disabled={checkingUser || !addUserForm.email.trim()}
                    >
                      {checkingUser ? "Checking..." : "Check"}
                    </Button>
                  </div>
                  {userCheckResult && (
                    <div className="mt-2 p-3 rounded border">
                      {userCheckResult.userExists ? (
                        userCheckResult.alreadyAssigned ? (
                          <div className="text-orange-600">
                            <p className="font-medium">User already assigned</p>
                            <p className="text-sm">This user is already a member of this organization.</p>
                          </div>
                        ) : (
                          <div className="text-green-600">
                            <p className="font-medium">User found: {userCheckResult.user.name}</p>
                            <p className="text-sm">Email: {userCheckResult.user.email}</p>
                            <p className="text-sm">Ready to assign to organization.</p>
                          </div>
                        )
                      ) : (
                        <div className="text-red-600">
                          <p className="font-medium">User not found</p>
                          <p className="text-sm">This email must be registered before assignment.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {userCheckResult?.userExists && !userCheckResult?.alreadyAssigned && (
                  <>
                    <div>
                      <Label htmlFor="employee_id">Employee ID</Label>
                      <Input
                        id="employee_id"
                        value={addUserForm.employee_id}
                        onChange={(e) => setAddUserForm({ ...addUserForm, employee_id: e.target.value })}
                        placeholder="Enter employee ID"
                      />
                    </div>
                    <div>
                      <Label htmlFor="position">Position</Label>
                      <Input
                        id="position"
                        value={addUserForm.position}
                        onChange={(e) => setAddUserForm({ ...addUserForm, position: e.target.value })}
                        placeholder="Enter position/title"
                      />
                    </div>
                    <div>
                      <Label htmlFor="role">Role</Label>
                      <Select
                        value={addUserForm.role}
                        onValueChange={(value: 'ORGANIZATION_ADMIN' | 'MEMBER') => 
                          setAddUserForm({ ...addUserForm, role: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MEMBER">Member</SelectItem>
                          <SelectItem value="ORGANIZATION_ADMIN">Organization Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddUserDialog(false)
                      setAddUserForm({ email: "", employee_id: "", position: "", role: "MEMBER" })
                      setUserCheckResult(null)
                    }}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddUser}
                    disabled={submitting || !userCheckResult?.userExists || userCheckResult?.alreadyAssigned}
                  >
                    {submitting ? "Adding..." : "Add User"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No members yet"
              description="Add the first member to this organization"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Assigned</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{member.user_name}</span>
                          {member.role === 'ORGANIZATION_ADMIN' && (
                            <Crown className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                        <div className="text-sm text-gray-500">{member.user_email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.role === 'ORGANIZATION_ADMIN' ? "default" : "secondary"}>
                        {member.role === 'ORGANIZATION_ADMIN' ? 'Admin' : 'Member'}
                      </Badge>
                    </TableCell>
                    <TableCell>{member.position || "-"}</TableCell>
                    <TableCell>{member.employee_id || "-"}</TableCell>
                    <TableCell>
                      {formatTimeAgo(member.assigned_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
