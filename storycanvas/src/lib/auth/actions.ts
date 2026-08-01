// Authentication actions for Bibliarch
//
// There is deliberately NO email step here. Signing up creates the account and
// signs you straight in. This requires "Confirm email" to be OFF in the Supabase
// dashboard (Authentication -> Providers -> Email). If it ever gets switched
// back on, signUp below detects the missing session and says something true
// instead of promising a confirmation email we never send.

'use server'

import { createClient } from '@/lib/supabase/server'
import { authErrorMessage } from '@/lib/auth/errors'
import { redirect } from 'next/navigation'

export async function signUp(formData: FormData) {
  const supabase = await createClient()

  // Extract form data
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const username = formData.get('username') as string

  // Create the account. Supabase returns a session immediately because email
  // confirmation is off.
  //
  // Note: we deliberately do NOT try signInWithPassword first. That doubled our
  // requests against the endpoint that rate-limits, and a 429 there is what
  // produced the "{}" error users were reporting.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
    },
  })

  if (error) {
    return { error: authErrorMessage(error) }
  }

  if (!data.session) {
    // Only reachable if email confirmation got turned back on in Supabase.
    // Don't send the user hunting for an email that isn't coming.
    console.error(
      'signUp returned no session - "Confirm email" is enabled in Supabase but we send no confirmation mail'
    )
    return {
      error:
        "Your account was created but couldn't be activated automatically. Send us feedback and we'll sort it out.",
    }
  }

  // Create or update the profile with username
  if (data.user) {
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: data.user.id,
      username,
      email,
    })

    if (profileError) {
      // Not fatal - the account exists and the user can sign in.
      console.error('Error creating profile:', profileError)
    }
  }

  redirect('/dashboard')
}

export async function signIn(formData: FormData) {
  const supabase = await createClient()

  // Extract form data
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // Sign in the user
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: authErrorMessage(error) }
  }

  // Redirect to dashboard after successful login
  redirect('/dashboard')
}

export async function signOut() {
  const supabase = await createClient()

  // Sign out the user
  await supabase.auth.signOut()

  // Redirect to home page
  redirect('/')
}
