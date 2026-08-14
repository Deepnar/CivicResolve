"use client"

import { ShieldCheck, ShieldAlert, EyeOff, Radar } from "lucide-react"

// Compact AI-evidence chip for issue cards/lists.
// - discoveryClass set  → AI-discovered (candidate/auto-found)
// - verificationVerdict → verified / conflicted / fake / unclear
export function VerificationBadge({
  verificationVerdict,
  discoveryClass,
}: {
  verificationVerdict?: string | null
  discoveryClass?: string | null
}) {
  if (discoveryClass) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-medium text-purple-700">
        <Radar className="h-3 w-3" />
        AI-FOUND
      </span>
    )
  }

  switch (verificationVerdict) {
    case "same_issue":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">
          <ShieldCheck className="h-3 w-3" />
          AI VERIFIED
        </span>
      )
    case "different_issue":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
          <ShieldAlert className="h-3 w-3" />
          CONFLICTED
        </span>
      )
    case "no_issue":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">
          <EyeOff className="h-3 w-3" />
          SUSPECTED FAKE
        </span>
      )
    default:
      return null
  }
}
