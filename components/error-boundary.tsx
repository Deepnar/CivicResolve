'use client'

import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { logger } from '@/lib/logger'

interface Props {
  children: React.ReactNode
  fallback?: React.ComponentType<ErrorFallbackProps>
}

interface State {
  hasError: boolean
  error: Error | null
  errorBoundary: string
}

interface ErrorFallbackProps {
  error: Error | null
  resetError: () => void
  errorBoundary: string
}

const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError, errorBoundary }) => (
  <Card className="max-w-lg mx-auto mt-8">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-red-600">
        <AlertTriangle className="h-5 w-5" />
        Something went wrong
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <p className="text-gray-600">
        We encountered an unexpected error in the {errorBoundary} component. 
        Our team has been notified and is working to fix this issue.
      </p>
      
      {process.env.NODE_ENV === 'development' && error && (
        <details className="bg-red-50 p-3 rounded border">
          <summary className="text-sm font-medium text-red-800 cursor-pointer">
            Error Details (Development)
          </summary>
          <pre className="text-xs mt-2 text-red-700 overflow-auto">
            {error.name}: {error.message}
            {error.stack && '\n\n' + error.stack}
          </pre>
        </details>
      )}
      
      <Button onClick={resetError} className="w-full">
        <RefreshCw className="h-4 w-4 mr-2" />
        Try Again
      </Button>
    </CardContent>
  </Card>
)

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { 
      hasError: false, 
      error: null,
      errorBoundary: 'Unknown'
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { 
      hasError: true, 
      error,
      errorBoundary: error.stack?.split('\n')[1]?.match(/at (.+) \(/)?.[1] || 'Unknown'
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('React Error Boundary caught error', error, 'ErrorBoundary', {
      errorInfo,
      componentStack: errorInfo.componentStack,
      errorBoundary: this.state.errorBoundary
    })

    // Report to error tracking service in production
    if (process.env.NODE_ENV === 'production') {
      // TODO: Integrate with error tracking service (Sentry, Rollbar, etc.)
      // errorTracker.captureException(error, { extra: errorInfo })
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: null, errorBoundary: 'Unknown' })
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return (
        <FallbackComponent 
          error={this.state.error} 
          resetError={this.resetError}
          errorBoundary={this.state.errorBoundary}
        />
      )
    }

    return this.props.children
  }
}

// Higher-order component for easy wrapping
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<ErrorFallbackProps>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  )
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  return WrappedComponent
}

export default ErrorBoundary
