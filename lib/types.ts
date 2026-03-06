export interface User {
  id: string
  email: string
  name: string
  role: "CITIZEN" | "ADMIN" | "ORGANIZATION_ADMIN" | "NGO_ADMIN"
  points: number
  badges: string[]
  createdAt: Date
  updatedAt: Date
}

export interface Organization {
  id: string
  name: string
  description?: string
  email?: string
  phone?: string
  address?: string
  is_active: boolean
  createdAt: Date
  updatedAt: Date
}

export interface UserOrganization {
  id: string
  user_id: string
  organization_id: string
  role: "ORGANIZATION_ADMIN" | "MEMBER"
  employee_id?: string
  position?: string
  is_active: boolean
  assigned_at: Date
  assigned_by?: string
  user?: User
  organization?: Organization
}

export interface NGO {
  id: string
  name: string
  description?: string
  email?: string
  phone?: string
  address?: string
  registration_number?: string
  contact_person?: string
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface UserNGO {
  id: string
  user_id: string
  ngo_id: string
  role: "NGO_ADMIN" | "MEMBER"
  position?: string
  is_active: boolean
  assigned_at: Date
  assigned_by?: string
  user?: User
  ngo?: NGO
}

export interface NGOPriorityNotification {
  id: string
  issue_id: string
  ngo_id: string
  priority_level: "HIGH" | "URGENT"
  notification_sent: boolean
  sent_at?: Date
  createdAt: Date
}

export interface Issue {
  id: string
  title: string
  description: string
  category: IssueCategory
  status: IssueStatus
  priority: Priority
  latitude: number
  longitude: number
  address: string
  imageUrl?: string
  resolutionImageUrl?: string  // Photo proof of issue resolution
  reporterId: string
  reporter: User
  comments: Comment[]
  votes: Vote[]
  assignments: Assignment[]
  votes_count?: number  // API response field
  comments_count?: number  // API response field
  assigned_to?: string  // User ID of the organization member assigned to this issue
  assigned_to_name?: string  // Name of the organization member assigned to this issue
  assigned_at?: Date  // When the issue was assigned
  assigned_by?: string  // User ID who made the assignment
  // NGO-related fields
  reported_via_ngo?: boolean  // Whether this issue was reported by an NGO
  ngo_id?: string  // ID of the NGO that reported this issue
  citizen_name?: string  // Name of the actual citizen on whose behalf NGO is reporting
  citizen_phone?: string  // Phone number of the citizen (if available)
  ngo_notes?: string  // Additional notes from the NGO about the citizen or situation
  createdAt: Date
  updatedAt: Date
}

export interface Comment {
  id: string
  content: string
  issueId: string
  authorId: string
  author: User
  createdAt: Date
  updatedAt: Date
}

export interface Vote {
  id: string
  issueId: string
  userId: string
  user: User
  createdAt: Date
}

export interface Assignment {
  id: string
  department: string
  issueId: string
  assignedById: string
  assignedBy: User
  assignedAt: Date
  completedAt?: Date
  notes?: string
}

export type IssueCategory = "ROADS" | "LIGHTING" | "SANITATION" | "PARKS" | "UTILITIES" | "SAFETY" | "ENVIRONMENT" | "VANDALISM" | "TRANSPORTATION" | "NOISE" | "OTHER"
export type IssueStatus = "PENDING" | "IN_PROGRESS" | "RESOLVED" | "REJECTED" | "UNDER_APPEAL"
export type AppealStatus = "PENDING" | "UNDER_REVIEW" | "ACCEPTED" | "DENIED"
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT"
export type UserRole = "CITIZEN" | "ADMIN" | "ORGANIZATION_ADMIN" | "NGO_ADMIN"
export type OrganizationRole = "ORGANIZATION_ADMIN" | "MEMBER"
export type NGORole = "NGO_ADMIN" | "MEMBER"

export interface CreateIssueData {
  title: string
  description: string
  category: IssueCategory
  latitude: number
  longitude: number
  address: string
  imageUrl?: string
  // NGO-specific fields for reporting on behalf of citizens
  citizen_name?: string
  citizen_phone?: string
  ngo_notes?: string
}

export interface CreateNGOData {
  name: string
  description?: string
  email?: string
  phone?: string
  address?: string
  registration_number?: string
  contact_person?: string
  website?: string
  focus_areas: string[]
}

export interface UpdateIssueData {
  status?: IssueStatus
  priority?: Priority
  notes?: string
}

export interface AuthUser {
  id: string
  email: string
  name: string
  role: UserRole
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  name: string
  email: string
  password: string
}

export interface Appeal {
  id: number
  issue_id: number
  reporter_id: number
  reason: string
  status: AppealStatus
  reviewer_id: number | null
  reviewer_comment: string | null
  created_at: Date
  updated_at: Date
  // Joined data from queries
  reporter_name?: string
  reporter_email?: string
  reviewer_name?: string
  reviewer_email?: string
  issue_title?: string
  issue_category?: string
  issue_address?: string
}

export interface IssueUpdate {
  id: number
  issue_id: number
  user_id: number
  message: string
  image_url?: string
  created_at: Date
  user_name?: string
  user_email?: string
}
