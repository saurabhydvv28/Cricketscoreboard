'use server'

import { redirect } from 'next/navigation'
import { createAdminSession, destroyAdminSession, verifyAdminSession } from '@/lib/admin-auth'

export interface AdminLoginState {
  error: string | null
}

export async function adminLogin(
  _prevState: AdminLoginState,
  formData: FormData
): Promise<AdminLoginState> {
  const pin = (formData.get('pin') as string)?.trim()
  const adminPin = process.env.ADMIN_PIN

  if (!adminPin) {
    return { error: 'ADMIN_PIN is not configured. Set it in your environment variables.' }
  }
  if (!pin || pin !== adminPin) {
    return { error: 'Incorrect PIN.' }
  }

  await createAdminSession()
  redirect('/admin')
}

export async function adminLogout() {
  await destroyAdminSession()
  redirect('/')
}

export async function requireAdmin() {
  const isAdmin = await verifyAdminSession()
  if (!isAdmin) {
    redirect('/admin/login')
  }
}
