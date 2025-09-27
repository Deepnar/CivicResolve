import { AlertTriangle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface ErrorStateProps {
  error?: string
  onRetry?: () => void
  title?: string
  description?: string
}

export function ErrorState({ 
  error,
  onRetry,
  title = "Something went wrong",
  description = "An error occurred while loading data. Please try again."
}: ErrorStateProps) {
  return (
    <Card className="border-red-200 bg-red-50/50">
      <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-red-800 mb-2">
          {title}
        </h3>
        <p className="text-sm text-red-600 mb-4 max-w-md">
          {error || description}
        </p>
        {onRetry && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRetry}
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  )
}