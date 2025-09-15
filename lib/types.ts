export interface User {
  id: string
  email: string
  name: string
  role: "CITIZEN" | "ADMIN" | "MODERATOR"
  points: number
  badges: string[]
  createdAt: Date
  updatedAt: Date
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
  reporterId: string
  reporter: User
  comments: Comment[]
  votes: Vote[]
  assignments: Assignment[]
  votes_count?: number  // API response field
  comments_count?: number  // API response field
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

export type IssueCategory = "ROADS" | "LIGHTING" | "SANITATION" | "PARKS" | "UTILITIES" | "SAFETY" | "OTHER"
export type IssueStatus = "PENDING" | "IN_PROGRESS" | "RESOLVED" | "REMOVED"
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT"
export type UserRole = "CITIZEN" | "ADMIN" | "MODERATOR"

export interface CreateIssueData {
  title: string
  description: string
  category: IssueCategory
  latitude: number
  longitude: number
  address: string
  imageUrl?: string
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
