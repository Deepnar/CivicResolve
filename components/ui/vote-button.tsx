"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { ThumbsUp } from "lucide-react"
import { Button } from "./button"

interface VoteButtonProps {
  voteCount: number
  isVoted?: boolean
  onVote?: () => Promise<void>
  disabled?: boolean
  className?: string
}

export function VoteButton({ voteCount, isVoted = false, onVote, disabled, className }: VoteButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [localVoted, setLocalVoted] = useState(isVoted)
  const [localCount, setLocalCount] = useState(voteCount)

  const handleVote = async () => {
    if (!onVote || isLoading || disabled) return

    setIsLoading(true)
    try {
      await onVote()
      setLocalVoted(!localVoted)
      setLocalCount((prev) => (localVoted ? prev - 1 : prev + 1))
    } catch (error) {
      console.error("Vote error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} transition={{ duration: 0.2 }}>
      <Button
        variant={localVoted ? "default" : "outline"}
        size="sm"
        onClick={handleVote}
        disabled={isLoading || disabled}
        className={cn(
          "flex items-center gap-2 transition-all duration-200",
          localVoted && "bg-blue-600 hover:bg-blue-700 text-white",
          className,
        )}
      >
        <motion.div animate={localVoted ? { scale: [1, 1.2, 1] } : {}} transition={{ duration: 0.3 }}>
          <ThumbsUp className={cn("h-4 w-4", localVoted && "fill-current")} />
        </motion.div>
        <span className="font-medium">{localCount}</span>
        {isLoading && (
          <motion.div
            className="h-3 w-3 border-2 border-current border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          />
        )}
      </Button>
    </motion.div>
  )
}
