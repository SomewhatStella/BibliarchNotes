// Turns Supabase auth errors into sentences a human can act on.
//
// Why this exists: @supabase/auth-js builds its error message with
//   err.msg || err.message || err.error_description || err.error || JSON.stringify(err)
// so when the auth request fails in a way it can't parse (network drop, gateway
// error, rate limit with an empty body) the "message" is the literal string "{}".
// Users were seeing that in the red box on the login page.

const FALLBACK = "We couldn't reach the server. Check your connection and try again in a minute."

// A message is only safe to show if it reads like a sentence, not like a payload.
function isPresentable(message: string | undefined | null): message is string {
  if (!message) return false
  const trimmed = message.trim()
  if (!trimmed) return false
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return false
  if (trimmed.length > 160) return false
  return true
}

type LooseAuthError = {
  message?: string
  code?: string
  status?: number
  name?: string
} | null | undefined

export function authErrorMessage(error: LooseAuthError, fallback = FALLBACK): string {
  if (!error) return fallback

  const code = error.code ?? ''
  const status = error.status ?? 0
  const raw = (error.message ?? '').toLowerCase()

  // Known cases first, keyed on code where Supabase gives us one and on the
  // message text where it doesn't (older GoTrue versions omit the code).
  if (code === 'invalid_credentials' || raw.includes('invalid login credentials')) {
    return "That email and password don't match an account. Double-check both, or create an account if you haven't yet."
  }

  if (code === 'email_not_confirmed' || raw.includes('email not confirmed')) {
    // Should be unreachable now that email confirmation is off, but if the
    // Supabase toggle ever gets flipped back on we want a message that tells
    // the user something true rather than sending them to look for an email.
    return 'This account needs to be activated before you can sign in. Send us feedback and we can activate it for you.'
  }

  if (
    code === 'user_already_exists' ||
    raw.includes('already registered') ||
    raw.includes('already been registered')
  ) {
    return 'There is already an account with that email. Try signing in instead.'
  }

  if (code === 'weak_password' || raw.includes('password should be at least')) {
    return 'That password is too short. Use at least 6 characters.'
  }

  if (code === 'validation_failed' || raw.includes('unable to validate email')) {
    return "That doesn't look like a valid email address."
  }

  if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit' || status === 429) {
    return 'Too many tries in a row. Wait a minute and try again.'
  }

  if (code === 'same_password') {
    return 'That is already your current password. Pick a different one.'
  }

  if (error.name === 'AuthRetryableFetchError' || status === 0) {
    return FALLBACK
  }

  if (status >= 500) {
    return 'The server had a problem on its end. Try again in a minute.'
  }

  // Anything else: only pass it through if it actually reads like a message.
  return isPresentable(error.message) ? error.message : fallback
}
