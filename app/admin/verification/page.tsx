"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShieldCheck, ShieldAlert, EyeOff, AlertTriangle, Copy } from "lucide-react"

interface Stats {
  totalIssues: number
  verified: number
  sameIssue: number
  differentIssue: number
  noIssue: number
  unclear: number
  resolutionNotFixed: number
  duplicateFlags: number
}

interface Recent {
  id: number
  title: string
  category: string
  status: string
  verificationVerdict: string | null
  verificationConfidence: number | null
  verificationSource: string | null
  verificationCapturedAt: string | null
  verifiedAt: string | null
  resolutionVerdict: string | null
}

export default function AdminVerificationPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recent, setRecent] = useState<Recent[]>([])

  useEffect(() => {
    fetch("/api/admin/verification-stats")
      .then((r) => r.json())
      .then((d) => {
        setStats(d.stats)
        setRecent(d.recent || [])
      })
  }, [])

  const cards = [
    { label: "Issues AI-verified", value: stats?.verified ?? "…", icon: ShieldCheck, color: "text-green-600" },
    { label: "Same issue confirmed", value: stats?.sameIssue ?? "…", icon: Copy, color: "text-blue-600" },
    { label: "Conflicted", value: stats?.differentIssue ?? "…", icon: ShieldAlert, color: "text-amber-600" },
    { label: "Suspected fake", value: stats?.noIssue ?? "…", icon: EyeOff, color: "text-red-600" },
    { label: "Resolution fraud flagged", value: stats?.resolutionNotFixed ?? "…", icon: AlertTriangle, color: "text-orange-600" },
  ]

  const verdictLabel: Record<string, string> = {
    same_issue: "✅ Verified",
    different_issue: "⚠️ Conflicted",
    no_issue: "🚫 Suspected fake",
    unclear: "❓ Unclear",
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">AI Verification Overview</h1>
      <p className="text-gray-600 mb-6">
        How the Observation Engine is performing. Every verdict is evidence for humans — none of it auto-decides.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="flex items-center gap-4 py-4">
              <c.icon className={`h-8 w-8 ${c.color}`} />
              <div>
                <p className="text-2xl font-bold">{c.value}</p>
                <p className="text-xs text-gray-500">{c.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Evidence</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-gray-500">No verification evidence yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2">Issue</th>
                    <th className="pb-2">Category</th>
                    <th className="pb-2">Verdict</th>
                    <th className="pb-2">Conf.</th>
                    <th className="pb-2">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2">
                        <Link href={`/issues/${r.id}`} className="hover:underline line-clamp-1 max-w-[260px] block">
                          {r.title}
                        </Link>
                      </td>
                      <td className="py-2">{r.category}</td>
                      <td className="py-2">
                        {r.resolutionVerdict
                          ? `🔧 ${r.resolutionVerdict.replace(/_/g, " ")}`
                          : verdictLabel[r.verificationVerdict ?? ""] ?? "—"}
                      </td>
                      <td className="py-2">
                        {r.verificationConfidence != null ? (r.verificationConfidence * 100).toFixed(0) + "%" : "—"}
                      </td>
                      <td className="py-2 text-xs text-gray-500">{r.verificationSource ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
