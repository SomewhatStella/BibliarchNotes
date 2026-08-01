'use client'

// Beautiful login page with smooth animations
// This is what users see when they want to sign in

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from '@/lib/auth/actions'
import { authErrorMessage } from '@/lib/auth/errors'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import FeedbackButton from '@/components/feedback/FeedbackButton'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSuccess, setResetSuccess] = useState(false)
  const router = useRouter()

  // Handle form submission with beautiful loading state
  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError(null)

    try {
      const result = await signIn(formData)

      if (result?.error) {
        setError(result.error)
        setIsLoading(false)
      }
      // On success signIn redirects, so this component unmounts.
    } catch (err) {
      // A successful signIn redirects, which Next signals by throwing. Let it through.
      if ((err as { digest?: string })?.digest?.startsWith('NEXT_REDIRECT')) throw err
      console.error('Sign in failed:', err)
      setError("We couldn't reach the server. Check your connection and try again in a minute.")
      setIsLoading(false)
    }
  }

  // Handle password reset request
  async function handlePasswordReset(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        setError(authErrorMessage(error))
      } else {
        setResetSuccess(true)
      }
    } catch (err) {
      console.error('Password reset failed:', err)
      setError("We couldn't reach the server. Check your connection and try again in a minute.")
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-100 to-blue-100 dark:from-gray-900 dark:to-gray-800">
      {/* Feedback Button - Fixed to bottom right */}
      <div className="fixed bottom-6 right-6 z-50">
        <FeedbackButton />
      </div>

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-sky-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-cyan-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      {/* Login card with smooth entrance animation */}
      <Card className="w-full max-w-md mx-4 relative backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 animate-slide-up">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center bg-gradient-to-r from-sky-500 to-blue-600 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-center">
            Sign in to your Bibliarch account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            {/* Email input with floating label effect */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                disabled={isLoading}
                className="transition-all duration-200 focus:scale-[1.02]"
              />
            </div>

            {/* Password input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs text-sky-600 hover:text-sky-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                disabled={isLoading}
                className="transition-all duration-200 focus:scale-[1.02]"
              />
            </div>

            {/* Error message with fade-in animation */}
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-md animate-fade-in">
                {error}
              </div>
            )}

            {/* Submit button with loading state */}
            <Button 
              type="submit" 
              className="w-full transition-all duration-200 hover:scale-[1.02]"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-gray-900 px-2 text-muted-foreground">
                New to Bibliarch?
              </span>
            </div>
          </div>

          {/* Sign up link */}
          <div className="text-center">
            <Link
              href="/signup"
              className="text-sm text-sky-600 hover:text-sky-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              Create an account
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <Card className="w-full max-w-md animate-slide-up">
            <CardHeader>
              <CardTitle>Reset Password</CardTitle>
              <CardDescription>
                {resetSuccess
                  ? "Check your email!"
                  : "Enter your email to receive a password reset link"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {resetSuccess ? (
                <div className="space-y-4">
                  <div className="p-3 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 rounded-md">
                    A password reset link is on its way to <strong>{resetEmail}</strong>.
                    Check your inbox and your spam folder - it can take a few minutes.
                  </div>
                  <div className="p-3 text-xs text-muted-foreground bg-muted/50 rounded-md">
                    Nothing after 10 minutes? Use the feedback button in the corner and
                    we&apos;ll reset it by hand.
                  </div>
                  <Button
                    onClick={() => {
                      setShowForgotPassword(false)
                      setResetSuccess(false)
                      setResetEmail('')
                    }}
                    className="w-full"
                  >
                    Back to Login
                  </Button>
                </div>
              ) : (
                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="you@example.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      className="transition-all duration-200 focus:scale-[1.02]"
                    />
                  </div>

                  {error && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-md">
                      {error}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowForgotPassword(false)
                        setError(null)
                        setResetEmail('')
                      }}
                      className="flex-1"
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={isLoading || !resetEmail}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Send Reset Link'
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}