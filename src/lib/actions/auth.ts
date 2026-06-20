'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

export interface AuthFormState {
  error: string | null
  fieldErrors?: {
    fullName?: string
    email?: string
    password?: string
  }
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// ----------------------------------------------------------------
// Sign up — creates an auth.users row, which fires the DB trigger
// (handle_new_user) that auto-creates the matching profiles row
// with a generated player_id slug.
// ----------------------------------------------------------------
export async function signup(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const fullName = (formData.get('fullName') as string)?.trim()
  const email = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string

  const fieldErrors: AuthFormState['fieldErrors'] = {}
  if (!fullName || fullName.length < 2) {
    fieldErrors.fullName = 'Enter your full name.'
  }
  if (!email || !validateEmail(email)) {
    fieldErrors.email = 'Enter a valid email address.'
  }
  if (!password || password.length < 8) {
    fieldErrors.password = 'Password must be at least 8 characters.'
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { error: null, fieldErrors }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/auth/confirm`,
    },
  })

  if (error) {
    if (error.message.toLowerCase().includes('already registered')) {
      return {
        error: null,
        fieldErrors: { email: 'An account with this email already exists.' },
      }
    }
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/signup/check-email')
}

// ----------------------------------------------------------------
// Log in — password grant
// ----------------------------------------------------------------
export async function login(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string

  if (!email || !validateEmail(email)) {
    return { error: null, fieldErrors: { email: 'Enter a valid email address.' } }
  }
  if (!password) {
    return { error: null, fieldErrors: { password: 'Enter your password.' } }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    if (error.message.toLowerCase().includes('invalid login credentials')) {
      return { error: 'Incorrect email or password.' }
    }
    if (error.message.toLowerCase().includes('email not confirmed')) {
      return { error: 'Please confirm your email before signing in.' }
    }
    return { error: error.message }
  }

  revalidatePath('/', 'layout')

  const redirectTo = formData.get('redirectTo') as string | null
  redirect(redirectTo && redirectTo.startsWith('/') ? redirectTo : '/')
}

// ----------------------------------------------------------------
// Log out
// ----------------------------------------------------------------
export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}

// ----------------------------------------------------------------
// Resend confirmation email
// ----------------------------------------------------------------
export async function resendConfirmation(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = (formData.get('email') as string)?.trim()
  if (!email || !validateEmail(email)) {
    return { error: 'Enter a valid email address.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/auth/confirm`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { error: null }
}
