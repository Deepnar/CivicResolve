"use client"

import { useState, useEffect, Suspense } from "react"
import { motion } from "framer-motion"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { LogIn, Eye, EyeOff, ArrowRight, Mail, CheckCircle } from "lucide-react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

type LoginForm = z.infer<typeof loginSchema>

// Component to handle search params logic
function SearchParamsHandler({ 
  onVerificationSuccess, 
  onVerificationError,
  onPasswordResetSuccess,
  onPasswordResetError 
}: {
  onVerificationSuccess: () => void
  onVerificationError: (error: string) => void
  onPasswordResetSuccess: () => void
  onPasswordResetError: (error: string) => void
}) {
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    // Get current URL parameters at the time of effect execution
    const currentUrl = new URL(window.location.href)
    const verified = currentUrl.searchParams.get('verified')
    const verificationError = currentUrl.searchParams.get('error')
    const passwordReset = currentUrl.searchParams.get('password_reset')
    const resetError = currentUrl.searchParams.get('reset_error')
    
    // If no relevant parameters, do nothing
    if (!verified && !verificationError && !passwordReset && !resetError) {
      return
    }

    let hasProcessedNotification = false
    
    // Check if user was redirected after verification
    if (verified === 'true') {
      // Only show notification if we haven't shown it recently
      const lastShown = sessionStorage.getItem('last_email_verified')
      const now = Date.now()
      const oneMinuteAgo = now - 60000 // 1 minute
      
      if (!lastShown || parseInt(lastShown) < oneMinuteAgo) {
        onVerificationSuccess()
        sessionStorage.setItem('last_email_verified', now.toString())
        hasProcessedNotification = true
      }
    }
    
    // Check for verification errors
    if (verificationError === 'invalid_token') {
      const lastShown = sessionStorage.getItem('last_invalid_token_error')
      const now = Date.now()
      const oneMinuteAgo = now - 60000
      
      if (!lastShown || parseInt(lastShown) < oneMinuteAgo) {
        onVerificationError('Invalid verification token. Please request a new verification email.')
        sessionStorage.setItem('last_invalid_token_error', now.toString())
        hasProcessedNotification = true
      }
    } else if (verificationError === 'expired_token') {
      const lastShown = sessionStorage.getItem('last_expired_token_error')
      const now = Date.now()
      const oneMinuteAgo = now - 60000
      
      if (!lastShown || parseInt(lastShown) < oneMinuteAgo) {
        onVerificationError('Verification token has expired. Please request a new verification email.')
        sessionStorage.setItem('last_expired_token_error', now.toString())
        hasProcessedNotification = true
      }
    }

    // Check for password reset success
    if (passwordReset === 'true') {
      const lastShown = sessionStorage.getItem('last_password_reset_success')
      const now = Date.now()
      const oneMinuteAgo = now - 60000
      
      if (!lastShown || parseInt(lastShown) < oneMinuteAgo) {
        onPasswordResetSuccess()
        sessionStorage.setItem('last_password_reset_success', now.toString())
        hasProcessedNotification = true
      }
    }

    // Check for password reset errors
    if (resetError) {
      const lastShown = sessionStorage.getItem(`last_password_reset_error_${resetError}`)
      const now = Date.now()
      const oneMinuteAgo = now - 60000
      
      if (!lastShown || parseInt(lastShown) < oneMinuteAgo) {
        onPasswordResetError('Password reset failed. Please try again.')
        sessionStorage.setItem(`last_password_reset_error_${resetError}`, now.toString())
        hasProcessedNotification = true
      }
    }

    // Clear URL parameters immediately after processing
    if (hasProcessedNotification || verified || verificationError || passwordReset || resetError) {
      router.replace('/login', { scroll: false })
    }
  }, [onVerificationSuccess, onVerificationError, onPasswordResetSuccess, onPasswordResetError, router]) // Include callback dependencies

  return null
}

function LoginPageContent() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [needsVerification, setNeedsVerification] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [userEmail, setUserEmail] = useState("")
  const { login } = useAuth()
  const { toast } = useToast()

  // Handler functions for search params
  const handleVerificationSuccess = () => {
    toast({
      title: "Email Verified!",
      description: "Your email has been successfully verified. You can now log in to your account.",
      variant: "default",
    })
  }

  const handleVerificationError = (errorMessage: string) => {
    setError(errorMessage)
    setNeedsVerification(true)
  }

  const handlePasswordResetSuccess = () => {
    toast({
      title: "Password Reset Successful!",
      description: "Your password has been reset. You can now log in with your new password.",
      variant: "default",
    })
  }

  const handlePasswordResetError = (errorMessage: string) => {
    setError(errorMessage)
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    console.log("Login form submitted:", { email: data.email }) // Debug log
    setIsLoading(true)
    setError("")
    setNeedsVerification(false)
    setUserEmail(data.email)
    
    try {
      console.log("Attempting login...") // Debug log
      await login(data.email, data.password)
      console.log("Login successful") // Debug log
    } catch (error: any) {
      console.error("Login failed:", error)
      
      // Check if error is related to email verification
      if (error.message && error.message.includes("verify your email")) {
        setError("Please verify your email before logging in. Check your inbox for the verification link.")
        setNeedsVerification(true)
      } else {
        setError("Login failed. Please check your credentials and try again.")
        setNeedsVerification(false)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const resendVerification = async () => {
    if (!userEmail) return

    setIsResending(true)
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: userEmail }),
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

  // Alternative submit handler for mobile touch issues
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSubmit(onSubmit)(e)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Search params handler */}
      <SearchParamsHandler
        onVerificationSuccess={handleVerificationSuccess}
        onVerificationError={handleVerificationError}
        onPasswordResetSuccess={handlePasswordResetSuccess}
        onPasswordResetError={handlePasswordResetError}
      />
      
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="text-center mb-6 sm:mb-8">
          <motion.div
            className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-blue-600 rounded-2xl mb-3 sm:mb-4"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <LogIn className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
          </motion.div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-sm sm:text-base text-gray-600">Sign in to your CivicResolve account</p>
        </div>

        <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-xl">
          <CardHeader className="space-y-1 pb-4 px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="text-lg sm:text-xl font-heading text-center">Sign In</CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
                {needsVerification && (
                  <div className="mt-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={resendVerification}
                      disabled={isResending}
                      className="w-full"
                    >
                      {isResending ? (
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin" />
                          Sending...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          Resend Verification Email
                        </div>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
            
            <form onSubmit={handleFormSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  {...register("email")}
                  className={`h-11 text-base ${errors.email ? "border-red-500" : ""}`}
                  autoComplete="email"
                  inputMode="email"
                />
                {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    {...register("password")}
                    className={`pr-10 h-11 text-base ${errors.password ? "border-red-500" : ""}`}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    onTouchStart={(e) => {
                      e.preventDefault()
                      setShowPassword(!showPassword)
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 touch-target-small"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
              </div>

              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white touch-target h-12 text-base font-medium" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing In...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    Sign In
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </Button>
            </form>

            <div className="mt-4 sm:mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{" "}
                <Link href="/register" className="text-blue-600 hover:text-blue-700 font-medium touch-target-inline">
                  Sign up here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-4 sm:mt-6 text-center">
          <p className="text-xs text-gray-500 px-4">By signing in, you agree to our Terms of Service and Privacy Policy</p>
        </div>
      </motion.div>
    </div>
  )
}

// Main component with Suspense boundary
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LoginPageContent />
    </Suspense>
  )
}
