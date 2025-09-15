"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { UserPlus, Search, Mail, Phone, MapPin, Calendar, Edit, Trash2, Shield, User } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/use-auth"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"

interface TeamMember {
  id: number
  name: string
  email: string
  phone?: string
  role: string
  department?: string
  joined_at: string
  last_active?: string
  issues_assigned: number
  issues_resolved: number
  status: 'ACTIVE' | 'INACTIVE'
}

export default function OrganizationMembers() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [filteredMembers, setFilteredMembers] = useState<TeamMember[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newMember, setNewMember] = useState({
    email: "",
    employeeId: "",
    position: "",
    role: "MEMBER"
  })
  const [userCheckResult, setUserCheckResult] = useState<{
    userExists: boolean;
    verified: boolean;
    user?: any;
  } | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)

  useEffect(() => {
    if (user && user.role === 'ORGANIZATION_ADMIN') {
      fetchTeamMembers()
    }
  }, [user])

  useEffect(() => {
    filterMembers()
  }, [members, searchTerm, roleFilter, statusFilter])

  const fetchTeamMembers = async () => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/organization/members', {
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch team members')
      }
      
      const data = await response.json()
      setMembers(data.members || [])
      
    } catch (error) {
      console.error('Error fetching team members:', error)
      // Fallback to empty array if API fails
      setMembers([])
    } finally {
      setLoading(false)
    }
  }

  const filterMembers = () => {
    let filtered = members

    if (searchTerm) {
      filtered = filtered.filter(member => 
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (member.department && member.department.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    if (roleFilter !== "all") {
      filtered = filtered.filter(member => member.role === roleFilter)
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(member => member.status === statusFilter)
    }

    setFilteredMembers(filtered)
  }

  const handleCheckUser = async () => {
    try {
      if (!newMember.email) {
        toast.error("Email is required")
        return
      }

      const response = await fetch('/api/organization/check-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email: newMember.email })
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error)
        setUserCheckResult(null)
        setShowConfirmation(false)
        return
      }

      setUserCheckResult(data)
      if (data.userExists && data.verified) {
        setShowConfirmation(true)
      }
    } catch (error) {
      console.error('Error checking user:', error)
      toast.error("Failed to check user")
    }
  }

  const handleAssignUser = async () => {
    try {
      if (!userCheckResult?.user?.id || !newMember.employeeId) {
        toast.error("Employee ID is required")
        return
      }

      const response = await fetch('/api/organization/assign-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: userCheckResult.user.id,
          employeeId: newMember.employeeId,
          position: newMember.position,
          role: newMember.role
        })
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error)
        return
      }
      
      toast.success(data.message || "User successfully assigned to organization!")
      setIsAddDialogOpen(false)
      setShowConfirmation(false)
      setUserCheckResult(null)
      setNewMember({
        email: "",
        employeeId: "",
        position: "",
        role: "MEMBER"
      })
      
      // Refresh the members list
      fetchTeamMembers()
    } catch (error) {
      console.error('Error assigning user:', error)
      toast.error("Failed to assign user to organization")
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ORGANIZATION_ADMIN': return 'bg-purple-100 text-purple-800'
      case 'MEMBER': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800'
      case 'INACTIVE': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (!user || user.role !== 'ORGANIZATION_ADMIN') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="text-gray-600 mt-2">You must be an organization administrator to access this page.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title="Team Members"
          description="Manage your organization's team members"
        />
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Team Members"
        description={`Managing ${filteredMembers.length} team members in your organization`}
      />

      {/* Actions and Filters */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Team Management</CardTitle>
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
              setIsAddDialogOpen(open)
              if (!open) {
                setShowConfirmation(false)
                setUserCheckResult(null)
                setNewMember({
                  email: "",
                  employeeId: "",
                  position: "",
                  role: "MEMBER"
                })
              }
            }}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Assign Team Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Existing User to Organization</DialogTitle>
                </DialogHeader>
                
                {!showConfirmation ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="email">User Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newMember.email}
                        onChange={(e) => setNewMember({...newMember, email: e.target.value})}
                        placeholder="Enter existing user's email"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        This email must already be registered in the system
                      </p>
                    </div>
                    
                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCheckUser}>
                        Check User
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {userCheckResult?.user && (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <h3 className="font-medium text-green-800 mb-2">User Found!</h3>
                        <p><strong>Name:</strong> {userCheckResult.user.name}</p>
                        <p><strong>Email:</strong> {userCheckResult.user.email}</p>
                        <p><strong>Current Role:</strong> {userCheckResult.user.role}</p>
                      </div>
                    )}
                    
                    <div>
                      <Label htmlFor="employeeId">Employee ID</Label>
                      <Input
                        id="employeeId"
                        value={newMember.employeeId}
                        onChange={(e) => setNewMember({...newMember, employeeId: e.target.value})}
                        placeholder="Enter employee ID"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="position">Position/Department</Label>
                      <Input
                        id="position"
                        value={newMember.position}
                        onChange={(e) => setNewMember({...newMember, position: e.target.value})}
                        placeholder="e.g., Field Worker, Supervisor"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="role">Organization Role</Label>
                      <Select value={newMember.role} onValueChange={(value) => setNewMember({...newMember, role: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MEMBER">Member</SelectItem>
                          <SelectItem value="ORGANIZATION_ADMIN">Organization Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => {
                        setShowConfirmation(false)
                        setUserCheckResult(null)
                      }}>
                        Back
                      </Button>
                      <Button onClick={handleAssignUser}>
                        Assign to Organization
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="ORGANIZATION_ADMIN">Organization Admin</SelectItem>
                <SelectItem value="MEMBER">Member</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Members List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMembers.map((member) => (
          <Card key={member.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{member.name}</h3>
                    <p className="text-sm text-gray-600">{member.email}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm">
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className={getRoleColor(member.role)}>
                    {member.role.replace('_', ' ')}
                  </Badge>
                  <Badge className={getStatusColor(member.status)}>
                    {member.status}
                  </Badge>
                </div>

                {member.department && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Shield className="h-3 w-3" />
                    {member.department}
                  </div>
                )}

                {member.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-3 w-3" />
                    {member.phone}
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-3 w-3" />
                  Joined {formatDistanceToNow(new Date(member.joined_at), { addSuffix: true })}
                </div>

                {member.last_active && (
                  <div className="text-sm text-gray-600">
                    Last active: {formatDistanceToNow(new Date(member.last_active), { addSuffix: true })}
                  </div>
                )}

                <div className="border-t pt-3 mt-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Assigned:</span>
                      <div className="font-semibold">{member.issues_assigned}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Resolved:</span>
                      <div className="font-semibold text-green-600">{member.issues_resolved}</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredMembers.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No team members found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || roleFilter !== "all" || statusFilter !== "all" 
                ? "Try adjusting your filters to see more results."
                : "Start building your team by adding the first member."
              }
            </p>
            {!searchTerm && roleFilter === "all" && statusFilter === "all" && (
              <Button onClick={() => setIsAddDialogOpen(true)} className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Assign First Team Member
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
