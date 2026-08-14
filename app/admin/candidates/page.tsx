"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Radar, Check, X } from "lucide-react"

interface Candidate {
  id: number
  title: string
  description: string
  category: string
  latitude: number
  longitude: number
  imageUrl: string | null
  discoveryClass: string
  discoveryConfidence: number
  discoverySource: string
  createdAt: string
}

export default function AdminCandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<number | null>(null)

  useEffect(() => {
    fetch("/api/admin/candidates")
      .then((r) => r.json())
      .then((d) => setCandidates(d.candidates || []))
      .finally(() => setLoading(false))
  }, [])

  async function decide(id: number, action: "accept" | "reject") {
    setBusy(id)
    try {
      const r = await fetch(`/api/admin/candidates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      if (r.ok) setCandidates((c) => c.filter((x) => x.id !== id))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Radar className="h-7 w-7 text-purple-600" />
        <h1 className="text-2xl font-bold">AI-Discovered Issues</h1>
      </div>
      <p className="text-gray-600 mb-6 max-w-2xl">
        These issues were automatically detected from street imagery (no citizen report). Review each one: accept it
        as a real issue, or reject it as a false positive. Only you decide — the AI never publishes anything.
      </p>

      {loading ? (
        <p className="text-gray-500">Loading candidates…</p>
      ) : candidates.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-500">
            No AI-discovered candidates right now. The discovery scan runs every 10 minutes.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {candidates.map((c) => (
            <Card key={c.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-start justify-between gap-2">
                  <span>{c.title}</span>
                  <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                    {(c.discoveryConfidence * 100).toFixed(0)}%
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {c.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.imageUrl} alt={c.title} className="w-full h-40 object-cover rounded-lg" />
                )}
                <p className="text-xs text-gray-600 line-clamp-2">{c.description}</p>
                <p className="text-xs text-gray-400">
                  {c.category} · {c.discoveryClass.replace(/_/g, " ")} · {c.latitude.toFixed(5)}, {c.longitude.toFixed(5)}
                </p>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" className="flex-1" disabled={busy === c.id} onClick={() => decide(c.id, "accept")}>
                    <Check className="h-4 w-4 mr-1" /> Accept as issue
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" disabled={busy === c.id} onClick={() => decide(c.id, "reject")}>
                    <X className="h-4 w-4 mr-1" /> Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
