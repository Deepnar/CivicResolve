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
  resolutionVerdict?: 'fixed' | 'not_fixed' | 'unclear'
  resolutionConfidence?: number
  resolutionStreetUrl?: string
  resolutionStreetCapturedAt?: string | null
  resolutionStreetVerdict?: 'still_present' | 'not_present' | 'unclear'
  // AI Observation Engine — external street-imagery verification evidence
  verificationVerdict?: 'same_issue' | 'different_issue' | 'unclear' | 'no_issue'
  verificationConfidence?: number
  verificationReason?: string
  verificationImageUrl?: string  // External street photo used as evidence
  verificationSource?: 'ola' | 'mapillary' | 'kartaview'
  verificationCapturedAt?: string
  verificationDistanceM?: number
  verifiedAt?: string
  reporterId: string
  isAnonymous?: boolean  // Whether the reporter is anonymous
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
  // Duplicate detection fields
  possible_duplicate_of?: number  // ID of the issue this might be a duplicate of
  duplicate_confidence?: number  // Similarity score (0.0 - 1.0)
  duplicate_status?: DuplicateStatus  // Status of duplicate review
  reporter_confirmed_unique?: boolean  // Whether reporter confirmed it's unique
  reporter_acknowledgement?: ReporterAcknowledgement  // Reporter's acknowledgement
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
export type IssueStatus = "PENDING" | "IN_PROGRESS" | "RESOLVED" | "REJECTED" | "UNDER_APPEAL" | "CLOSED_DUPLICATE"
export type AppealStatus = "PENDING" | "UNDER_REVIEW" | "ACCEPTED" | "DENIED"
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT"
export type UserRole = "CITIZEN" | "ADMIN" | "ORGANIZATION_ADMIN" | "NGO_ADMIN"
export type OrganizationRole = "ORGANIZATION_ADMIN" | "MEMBER"
export type NGORole = "NGO_ADMIN" | "MEMBER"
export type DuplicateStatus = "PENDING" | "MERGED" | "IGNORED" | "SEPARATE"
export type DuplicateAction = "MERGED" | "IGNORED" | "SEPARATE"
export type ReporterAcknowledgement = "SAME_ISSUE" | "DIFFERENT_ISSUE"

export interface CreateIssueData {
  title: string
  description: string
  category: IssueCategory
  latitude: number
  longitude: number
  address: string
  imageUrl?: string
  isAnonymous?: boolean
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

// =================================================================
// DUPLICATE DETECTION SYSTEM TYPES
// =================================================================

export interface DuplicateDetectionResult {
  isDuplicate: boolean
  possibleDuplicates: PossibleDuplicate[]
  similarityScore?: number
  bestMatch?: PossibleDuplicate
}

export interface PossibleDuplicate {
  issueId: number
  title: string
  description: string
  category: string
  status: IssueStatus
  latitude: number
  longitude: number
  address: string
  reporterId: number
  reporterName: string
  createdAt: Date
  distanceMeters: number
  similarityScore: number
  titleSimilarity: number
  descriptionSimilarity: number
  votes_count: number
  comments_count: number
  linked_count?: number
}

export interface DuplicateRelationship {
  id: number
  original_issue_id: number
  duplicate_issue_id: number
  action: DuplicateAction
  admin_id: number
  admin_comment?: string
  similarity_score?: number
  distance_meters?: number
  created_at: Date
  updated_at: Date
  // Joined data
  admin_name?: string
  original_issue?: Issue
  duplicate_issue?: Issue
}

export interface DuplicatePendingReview {
  issue_id: number
  issue_title: string
  issue_category: string
  issue_status: IssueStatus
  issue_latitude: number
  issue_longitude: number
  issue_address: string
  issue_created_at: Date
  issue_reporter_id: number
  issue_reporter_name: string
  issue_votes: number
  issue_comments: number
  
  original_issue_id: number
  original_title: string
  original_category: string
  original_status: IssueStatus
  original_latitude: number
  original_longitude: number
  original_address: string
  original_created_at: Date
  original_reporter_id: number
  original_reporter_name: string
  original_votes: number
  original_comments: number
  
  similarity_score: number
  duplicate_status: DuplicateStatus
  distance_meters: number
}

export interface DuplicateDetectionConfig {
  similarity_threshold: number
  distance_threshold_meters: number
  enabled: boolean
  auto_merge_enabled: boolean
  check_same_category_only: boolean
  title_weight: number
  description_weight: number
  location_weight: number
}

export interface DuplicateMergeRequest {
  original_issue_id: number
  duplicate_issue_id: number
  admin_comment?: string
}

export interface DuplicateIgnoreRequest {
  original_issue_id: number
  duplicate_issue_id: number
  admin_comment?: string
}

export interface DuplicateSeparateRequest {
  original_issue_id: number
  duplicate_issue_id: number
  admin_comment?: string
  reason?: string
}

export interface DuplicateDetectionAudit {
  id: number
  issue_id: number
  action_type: 'DETECTED' | 'MERGED' | 'IGNORED' | 'SEPARATE' | 'AUTO_DETECTED'
  performed_by?: number
  details?: any
  similarity_score?: number
  distance_meters?: number
  created_at: Date
  // Joined data
  performer_name?: string
  issue_title?: string
}

export interface DuplicateConfirmationDialog {
  possibleDuplicates: PossibleDuplicate[]
  showDialog: boolean
  userAcknowledgement?: ReporterAcknowledgement
}

export interface DuplicateSuggestion {
  issueId: number
  title: string
  description: string
  address: string
  distanceMeters: number
  similarityScore: number
  category: string
  createdAt: Date
  reporterName: string
  votes_count: number
}
