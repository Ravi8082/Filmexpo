import { AdminPanel } from '@/components/admin-panel'
import { getAdminSession, isAdminSetupRequired } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export default async function SuperadminPage() {
  const [session, setupRequired] = await Promise.all([getAdminSession(), isAdminSetupRequired()])
  return <AdminPanel
    initiallyAuthenticated={Boolean(session)}
    setupRequired={setupRequired}
    setupTokenRequired={process.env.NODE_ENV === 'production'}
    initialAccount={session ? {
      email: session.email,
      role: session.role,
      permissions: session.permissions,
    } : null}
  />
}
