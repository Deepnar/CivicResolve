"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { CheckCircle, XCircle, Mail, ArrowRight, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useToast } from "@/hooks/use-toast"

type VerificationStatus = 'loading' | 'success' | 'error' | 'expired'

// Component to handle search params
function VerifyEmailContent() {
  const [status, setStatus] = useState<VerificationStatus>('loading')
  const [message, setMessage] = useState('')
  const [isResending, setIsResending] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('No verification token provided')
      return
    }

    verifyEmail(token)
  }, [token])

  const verifyEmail = async (verificationToken: string) => {
    try {
      const response = await fetch(`/api/auth/verify-email?token=${verificationToken}`, {
        method: 'GET',
      })

      const data = await response.json()

      if (response.ok) {
        setStatus('success')
        setMessage('Your email has been verified successfully!')
        
        // Redirect to login after a delay
        setTimeout(() => {
          router.push('/login?verified=true')
        }, 3000)
      } else {
        setStatus('error')
        setMessage(data.message || 'Failed to verify email')
      }
    } catch (error) {
      setStatus('error')
      setMessage('An error occurred while verifying your email')
    }
  }

  const resendVerification = async () => {
    const email = prompt('Please enter your email address to resend verification:')
    if (!email) return

    setIsResending(true)
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Verification Email Sent",
          description: "Please check your inbox for a new verification link.",
        })
      } else {
        toast({
          variant: "destructive",
          title: "Failed to Send Email",
          description: data.message || "Please try again later.",
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to resend verification email.",
      })
    } finally {
      setIsResending(false)
    }
  }

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">Verifying your email...</p>
          </div>
        )

      case 'success':
        return (
          <div className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-green-700 mb-2">Email Verified!</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <p className="text-sm text-gray-500 mb-4">
              You will be redirected to the login page in a few seconds...
            </p>
            <Link href="/login">
              <Button className="inline-flex items-center">
                Go to Login
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        )

      case 'error':
        return (
          <div className="text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-red-700 mb-2">Verification Failed</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            
            <div className="space-y-3">
              <Button
                onClick={resendVerification}
                disabled={isResending}
                variant="outline"
                className="inline-flex items-center"
              >
                {isResending ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                Resend Verification Email
              </Button>
              
              <div className="pt-4">
                <Link href="/login">
                  <Button variant="ghost">
                    Back to Login
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <div className="w-10 h-10 rounded-lg overflow-hidden">
              <Image
                src="/logo.png"
                alt="CivicResolve Logo"
                width={40}
                height={40}
                className="w-full h-full object-contain"
              />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">CivicResolve</h2>
          </div>
          <p className="mt-2 text-gray-600">Email Verification</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Verify Your Email</CardTitle>
            <CardDescription className="text-center">
              Please wait while we verify your email address
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderContent()}
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Need help?{' '}
            <Link href="/contact" className="text-blue-600 hover:text-blue-500">
              Contact Support
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

// Main component with Suspense boundary
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>}>
      <VerifyEmailContent />
    </Suspense>
  )
}
