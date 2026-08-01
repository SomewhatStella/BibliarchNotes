'use client'

// User settings page - where users manage their account
// Change password, view account info, etc.

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, ArrowLeft, User, KeyRound, Mail, Trash2, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingUsername, setIsLoadingUsername] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [usernameSuccess, setUsernameSuccess] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [newUsername, setNewUsername] = useState('')
  const [createdAt, setCreatedAt] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const router = useRouter()

  // Load user data
  useEffect(() => {
    async function loadUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      setUserEmail(user.email || null)
      setUserId(user.id)
      setCreatedAt(user.created_at ? new Date(user.created_at).toLocaleDateString() : null)

      // Get username from profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Error loading profile:', profileError)
        setUsername('No username set')
      } else if (profile && 'username' in profile) {
        setUsername((profile as any).username || 'No username set')
      } else {
        // Fallback to user metadata if profile doesn't exist
        setUsername(user.user_metadata?.username || 'No username set')
      }
    }

    loadUser()
  }, [router])

  // Handle password change
  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    // Validation
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      setIsLoading(false)
      return
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      setIsLoading(false)
      return
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from current password')
      setIsLoading(false)
      return
    }

    try {
      const supabase = createClient()

      // First verify current password by trying to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail!,
        password: currentPassword,
      })

      if (signInError) {
        setError('Current password is incorrect')
        setIsLoading(false)
        return
      }

      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) {
        const { authErrorMessage } = await import('@/lib/auth/errors')
        setError(authErrorMessage(updateError))
      } else {
        setSuccess(true)
        // Clear form
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch (err) {
      setError('Failed to update password. Please try again.')
    }

    setIsLoading(false)
  }

  // Handle username change
  async function handleUsernameChange(e: React.FormEvent) {
    e.preventDefault()
    setIsLoadingUsername(true)
    setUsernameError(null)
    setUsernameSuccess(false)

    // Validation
    if (!newUsername || newUsername.trim().length === 0) {
      setUsernameError('Username cannot be empty')
      setIsLoadingUsername(false)
      return
    }

    if (newUsername.length < 3) {
      setUsernameError('Username must be at least 3 characters')
      setIsLoadingUsername(false)
      return
    }

    if (newUsername.length > 20) {
      setUsernameError('Username must be less than 20 characters')
      setIsLoadingUsername(false)
      return
    }

    try {
      const supabase = createClient()

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          username: newUsername.trim()
        })
        .eq('id', userId)

      if (updateError) {
        setUsernameError(updateError.message)
      } else {
        setUsernameSuccess(true)
        setUsername(newUsername.trim())
        setNewUsername('')
      }
    } catch (err) {
      setUsernameError('Failed to update username. Please try again.')
    }

    setIsLoadingUsername(false)
  }

  // Handle account deletion
  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault()

    if (deleteConfirmText !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm')
      return
    }

    setIsDeleting(true)
    setDeleteError(null)

    try {
      const supabase = createClient()

      // Delete user's data first (stories, canvases, etc.)
      // The database should have CASCADE deletes set up, but we'll be explicit

      // Delete all stories owned by the user (this should cascade to canvases, nodes, etc.)
      const { error: storiesError } = await supabase
        .from('stories')
        .delete()
        .eq('user_id', userId)

      if (storiesError) {
        console.error('Error deleting stories:', storiesError)
        // Continue anyway - we want to delete the account
      }

      // Delete the user's profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)

      if (profileError) {
        console.error('Error deleting profile:', profileError)
        // Continue anyway
      }

      // Delete collaborations where user is a collaborator
      const { error: collabError } = await supabase
        .from('story_collaborators')
        .delete()
        .eq('user_id', userId)

      if (collabError) {
        console.error('Error deleting collaborations:', collabError)
      }

      // Delete the account using the database function
      const { error: deleteError } = await supabase.rpc('delete_own_account')

      if (deleteError) {
        throw new Error(deleteError.message)
      }

      // Sign out and redirect to home
      await supabase.auth.signOut()
      router.push('/?deleted=true')
    } catch (err) {
      console.error('Delete account error:', err)
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete account. Please try again.')
      setIsDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 to-blue-100 dark:from-gray-900 dark:to-gray-800">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-sky-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-cyan-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      {/* Header */}
      <div className="relative max-w-4xl mx-auto p-4 sm:p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-sky-500 to-blue-600 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent">
            Account Settings
          </h1>
        </div>

        <div className="grid gap-6">
          {/* Account Info Card */}
          <Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Account Information
              </CardTitle>
              <CardDescription>Your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <User className="w-4 h-4" />
                  Username
                </Label>
                <div className="text-sm font-medium">{username || 'Loading...'}</div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  Email Address
                </Label>
                <div className="text-sm font-medium">{userEmail || 'Loading...'}</div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Member Since</Label>
                <div className="text-sm font-medium">{createdAt || 'Loading...'}</div>
              </div>
            </CardContent>
          </Card>

          {/* Change Username Card */}
          <Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Change Username
              </CardTitle>
              <CardDescription>
                Update your display name
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUsernameChange} className="space-y-4">
                {/* New Username */}
                <div className="space-y-2">
                  <Label htmlFor="new-username">New Username</Label>
                  <Input
                    id="new-username"
                    type="text"
                    placeholder="Enter new username"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    required
                    disabled={isLoadingUsername}
                    className="transition-all duration-200 focus:scale-[1.01]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Must be between 3-20 characters
                  </p>
                </div>

                {/* Success message */}
                {usernameSuccess && (
                  <div className="p-3 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 rounded-md animate-fade-in">
                    Username updated successfully!
                  </div>
                )}

                {/* Error message */}
                {usernameError && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-md animate-fade-in">
                    {usernameError}
                  </div>
                )}

                {/* Submit button */}
                <Button
                  type="submit"
                  className="w-full transition-all duration-200 hover:scale-[1.02]"
                  disabled={isLoadingUsername || !newUsername}
                >
                  {isLoadingUsername ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating username...
                    </>
                  ) : (
                    'Update Username'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Change Password Card */}
          <Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="w-5 h-5" />
                Change Password
              </CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                {/* Current Password */}
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="transition-all duration-200 focus:scale-[1.01]"
                  />
                </div>

                {/* New Password */}
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="transition-all duration-200 focus:scale-[1.01]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Must be at least 6 characters
                  </p>
                </div>

                {/* Confirm New Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="transition-all duration-200 focus:scale-[1.01]"
                  />
                </div>

                {/* Success message */}
                {success && (
                  <div className="p-3 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 rounded-md animate-fade-in">
                    Password updated successfully!
                  </div>
                )}

                {/* Error message */}
                {error && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-md animate-fade-in">
                    {error}
                  </div>
                )}

                {/* Submit button */}
                <Button
                  type="submit"
                  className="w-full transition-all duration-200 hover:scale-[1.02]"
                  disabled={isLoading || !currentPassword || !newPassword || !confirmPassword}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating password...
                    </>
                  ) : (
                    'Update Password'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Delete Account Card */}
          <Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 border-red-200 dark:border-red-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <Trash2 className="w-5 h-5" />
                Delete Account
              </CardTitle>
              <CardDescription>
                Permanently delete your account and all associated data
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!showDeleteConfirm ? (
                <div className="space-y-4">
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-red-700 dark:text-red-300">
                        <p className="font-medium mb-1">Warning: This action cannot be undone</p>
                        <p>Deleting your account will permanently remove:</p>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          <li>All your stories and canvases</li>
                          <li>All nodes, connections, and content</li>
                          <li>Your profile and account settings</li>
                          <li>Access to shared stories</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    I want to delete my account
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleDeleteAccount} className="space-y-4">
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                      To confirm deletion, please type <span className="font-mono bg-red-100 dark:bg-red-800 px-1 rounded">DELETE</span> below:
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Input
                      type="text"
                      placeholder="Type DELETE to confirm"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      disabled={isDeleting}
                      className="border-red-200 dark:border-red-800 focus:ring-red-500"
                    />
                  </div>

                  {deleteError && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-md">
                      {deleteError}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setShowDeleteConfirm(false)
                        setDeleteConfirmText('')
                        setDeleteError(null)
                      }}
                      disabled={isDeleting}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="destructive"
                      className="flex-1"
                      disabled={isDeleting || deleteConfirmText !== 'DELETE'}
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Forever
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
