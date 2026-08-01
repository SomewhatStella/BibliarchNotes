'use client'

// Beautiful signup page with smooth animations
// Where new users create their Bibliarch account

import { useState } from 'react'
import Link from 'next/link'
import { signUp } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Sparkles } from 'lucide-react'
import FeedbackButton from '@/components/feedback/FeedbackButton'

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Handle form submission with beautiful loading state.
  // There is no email confirmation step - a successful signUp signs you in and
  // redirects to the dashboard.
  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError(null)

    try {
      const result = await signUp(formData)

      if (result?.error) {
        setError(result.error)
        setIsLoading(false)
      }
      // On success signUp redirects, so this component unmounts.
    } catch (err) {
      // A successful signUp redirects, which Next signals by throwing. Let it through.
      if ((err as { digest?: string })?.digest?.startsWith('NEXT_REDIRECT')) throw err
      // Anything else means we never reached Supabase (network, timeout).
      console.error('Signup failed:', err)
      setError("We couldn't reach the server. Check your connection and try again in a minute.")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-100 to-blue-100 dark:from-gray-900 dark:to-gray-800">
      {/* Feedback Button - Fixed to bottom right */}
      <div className="fixed bottom-6 right-6 z-50">
        <FeedbackButton />
      </div>

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-20 w-72 h-72 bg-sky-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute bottom-20 left-20 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-cyan-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      {/* Signup card with smooth entrance animation */}
      <Card className="w-full max-w-md mx-4 relative backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 animate-slide-up">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-2">
            <Sparkles className="w-8 h-8 text-sky-600 dark:text-blue-400 animate-pulse" />
          </div>
          <CardTitle className="text-2xl font-bold text-center bg-gradient-to-r from-sky-500 to-blue-600 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent">
            Create Your Story
          </CardTitle>
          <CardDescription className="text-center">
            Join Bibliarch and bring your stories to life
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            {/* Username input */}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="storyteller"
                required
                disabled={isLoading}
                className="transition-all duration-200 focus:scale-[1.02]"
              />
            </div>

            {/* Email input */}
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
              <Label htmlFor="password">Password</Label>
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
              className="w-full transition-all duration-200 hover:scale-[1.02] bg-gradient-to-r from-sky-500 to-blue-600 dark:from-blue-500 dark:to-blue-700 hover:from-sky-600 hover:to-blue-700 dark:hover:from-blue-600 dark:hover:to-blue-800"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating your account...
                </>
              ) : (
                'Create Account'
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
                Already have an account?
              </span>
            </div>
          </div>

          {/* Sign in link */}
          <div className="text-center">
            <Link
              href="/login"
              className="text-sm text-sky-600 hover:text-sky-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              Sign in instead
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}