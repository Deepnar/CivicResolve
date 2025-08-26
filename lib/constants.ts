export const ISSUE_CATEGORIES = {
  ROADS: { label: "Roads & Infrastructure", color: "#ef4444", icon: "Construction" },
  LIGHTING: { label: "Street Lighting", color: "#f59e0b", icon: "Lightbulb" },
  SANITATION: { label: "Sanitation & Waste", color: "#10b981", icon: "Trash2" },
  PARKS: { label: "Parks & Recreation", color: "#22c55e", icon: "Trees" },
  UTILITIES: { label: "Utilities", color: "#3b82f6", icon: "Zap" },
  SAFETY: { label: "Public Safety", color: "#dc2626", icon: "Shield" },
  OTHER: { label: "Other Issues", color: "#6b7280", icon: "AlertCircle" },
} as const

export const ISSUE_STATUS = {
  PENDING: { label: "Pending", color: "#f59e0b", bgColor: "#fef3c7" },
  IN_PROGRESS: { label: "In Progress", color: "#3b82f6", bgColor: "#dbeafe" },
  RESOLVED: { label: "Resolved", color: "#10b981", bgColor: "#d1fae5" },
  REJECTED: { label: "Rejected", color: "#ef4444", bgColor: "#fee2e2" },
} as const

export const PRIORITY_LEVELS = {
  LOW: { label: "Low", color: "#6b7280" },
  MEDIUM: { label: "Medium", color: "#f59e0b" },
  HIGH: { label: "High", color: "#ef4444" },
  URGENT: { label: "Urgent", color: "#dc2626" },
} as const

export const DEPARTMENTS = [
  "Public Works",
  "Transportation",
  "Parks & Recreation",
  "Utilities",
  "Public Safety",
  "Environmental Services",
  "Planning & Development",
] as const

export const BADGES = {
  FIRST_REPORT: { name: "First Reporter", description: "Submitted your first issue report", points: 10 },
  COMMUNITY_HELPER: { name: "Community Helper", description: "Reported 5 issues", points: 50 },
  CIVIC_CHAMPION: { name: "Civic Champion", description: "Reported 25 issues", points: 250 },
  ENGAGEMENT_STAR: { name: "Engagement Star", description: "Received 10 upvotes", points: 100 },
  PROBLEM_SOLVER: { name: "Problem Solver", description: "Had 5 issues resolved", points: 150 },
} as const

export const DEFAULT_MAP_CENTER = {
  lat: 19.0760,
  lng: 72.8777, // Mumbai, India as default
} as const

export const MAP_ZOOM_LEVELS = {
  CITY: 12,
  NEIGHBORHOOD: 15,
  STREET: 18,
} as const
