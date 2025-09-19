'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Plus, Building2, Users, Search, Edit, Trash2 } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'

interface NGO {
  id: number
  name: string
  description?: string
  email?: string
  phone?: string
  address?: string
  registration_number?: string
  contact_person?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function NGOManagementPage() {
  const [ngos, setNGOs] = useState<NGO[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingNGO, setEditingNGO] = useState<NGO | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    email: '',
    phone: '',
    address: '',
    registration_number: '',
    contact_person: ''
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchNGOs()
  }, [])

  const fetchNGOs = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/ngos')
      
      if (!response.ok) {
        throw new Error('Failed to fetch NGOs')
      }

      const data = await response.json()
      setNGOs(data.ngos || [])
    } catch (error) {
      console.error('Error fetching NGOs:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch NGOs"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingNGO ? `/api/admin/ngos/${editingNGO.id}` : '/api/admin/ngos'
      const method = editingNGO ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || `Failed to ${editingNGO ? 'update' : 'create'} NGO`)
      }

      toast({
        title: "Success",
        description: `NGO ${editingNGO ? 'updated' : 'created'} successfully`
      })

      // Reset form and close modal
      setFormData({
        name: '',
        description: '',
        email: '',
        phone: '',
        address: '',
        registration_number: '',
        contact_person: ''
      })
      setShowAddForm(false)
      setEditingNGO(null)
      
      // Refresh the list
      fetchNGOs()
    } catch (error: any) {
      console.error(`Error ${editingNGO ? 'updating' : 'creating'} NGO:`, error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || `Failed to ${editingNGO ? 'update' : 'create'} NGO`
      })
    }
  }

  const handleEdit = (ngo: NGO) => {
    setEditingNGO(ngo)
    setFormData({
      name: ngo.name,
      description: ngo.description || '',
      email: ngo.email || '',
      phone: ngo.phone || '',
      address: ngo.address || '',
      registration_number: ngo.registration_number || '',
      contact_person: ngo.contact_person || ''
    })
    setShowAddForm(true)
  }

  const handleDelete = async (ngo: NGO) => {
    if (!confirm(`Are you sure you want to delete "${ngo.name}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/ngos/${ngo.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete NGO')
      }

      toast({
        title: "Success",
        description: `${ngo.name} has been deleted successfully`
      })
      
      fetchNGOs()
    } catch (error: any) {
      console.error('Error deleting NGO:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete NGO"
      })
    }
  }

  const filteredNGOs = ngos.filter(ngo =>
    ngo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ngo.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ngo.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">NGO Management</h1>
        </div>
        <div className="text-center py-8">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">NGO Management</h1>
          <p className="text-muted-foreground">
            Manage NGO organizations that report civic issues
          </p>
        </div>
        <Button onClick={() => {
          setEditingNGO(null)
          setFormData({
            name: '',
            description: '',
            email: '',
            phone: '',
            address: '',
            registration_number: '',
            contact_person: ''
          })
          setShowAddForm(true)
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Add NGO
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total NGOs
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ngos.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active NGOs
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {ngos.filter(ngo => ngo.is_active).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Inactive NGOs
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {ngos.filter(ngo => !ngo.is_active).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search NGOs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or contact person..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardContent>
      </Card>

      {/* NGO List */}
      <Card>
        <CardHeader>
          <CardTitle>NGOs ({filteredNGOs.length})</CardTitle>
          <CardDescription>
            List of all registered NGOs in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredNGOs.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No NGOs found"
              description={searchTerm ? "No NGOs match your search criteria." : "No NGOs have been added yet. Click 'Add NGO' to get started."}
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredNGOs.map((ngo) => (
                <Card key={ngo.id} className="relative overflow-hidden hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg font-semibold text-gray-900">
                          {ngo.name}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={ngo.is_active ? "default" : "secondary"}
                            className={ngo.is_active ? "bg-green-100 text-green-700 hover:bg-green-100" : ""}
                          >
                            {ngo.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(ngo)}
                          className="h-8 w-8 p-0 hover:bg-blue-50"
                        >
                          <Edit className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(ngo)}
                          className="h-8 w-8 p-0 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0 space-y-4">
                    {ngo.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                        {ngo.description}
                      </p>
                    )}
                    
                    <div className="space-y-3">
                      {ngo.contact_person && (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Contact</span>
                            <p className="text-sm text-gray-900 truncate">{ngo.contact_person}</p>
                          </div>
                        </div>
                      )}
                      
                      {ngo.email && (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</span>
                            <a 
                              href={`mailto:${ngo.email}`} 
                              className="text-sm text-blue-600 hover:text-blue-700 hover:underline truncate block"
                            >
                              {ngo.email}
                            </a>
                          </div>
                        </div>
                      )}
                      
                      {ngo.phone && (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0"></div>
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</span>
                            <p className="text-sm text-gray-900 truncate">{ngo.phone}</p>
                          </div>
                        </div>
                      )}
                      
                      {ngo.registration_number && (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0"></div>
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Reg No</span>
                            <p className="text-sm text-gray-900 truncate">{ngo.registration_number}</p>
                          </div>
                        </div>
                      )}
                      
                      {ngo.address && (
                        <div className="flex items-start gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 mt-1"></div>
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Address</span>
                            <p className="text-sm text-gray-900 line-clamp-2 leading-relaxed">{ngo.address}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="pt-2 border-t border-gray-100">
                      <span className="text-xs text-gray-400">
                        Added {new Date(ngo.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle className="text-xl font-semibold text-gray-900">
                {editingNGO ? 'Edit NGO' : 'Add New NGO'}
              </CardTitle>
              <CardDescription className="text-gray-600">
                {editingNGO ? 'Update NGO information below' : 'Fill in the details to add a new NGO to the system'}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                        NGO Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Enter NGO name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact_person" className="text-sm font-medium text-gray-700">
                        Contact Person
                      </Label>
                      <Input
                        id="contact_person"
                        value={formData.contact_person}
                        onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                        className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Enter contact person name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Brief description of the NGO's mission and activities"
                    />
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Contact Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        placeholder="contact@ngo.org"
                      />
                      <p className="text-xs text-blue-600">
                        💡 If this email matches an existing user, they'll automatically become an NGO admin
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                        Phone Number
                      </Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        placeholder="+91 12345 67890"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-sm font-medium text-gray-700">
                      Address
                    </Label>
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      rows={2}
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Complete address of the NGO"
                    />
                  </div>
                </div>

                {/* Registration Details */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Registration Details</h3>
                  <div className="space-y-2">
                    <Label htmlFor="registration_number" className="text-sm font-medium text-gray-700">
                      Registration Number
                    </Label>
                    <Input
                      id="registration_number"
                      value={formData.registration_number}
                      onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      placeholder="NGO/REG/2024/001"
                    />
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddForm(false)
                      setEditingNGO(null)
                    }}
                    className="px-6"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    className="px-6 bg-blue-600 hover:bg-blue-700"
                  >
                    {editingNGO ? 'Update NGO' : 'Create NGO'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}