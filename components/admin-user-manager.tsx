'use client'

import { useEffect, useState } from 'react'
import type { AdminModule, AdminPermissions } from '@/lib/admin-auth'

type AdminUser = {
  id: number
  email: string
  role: 'superadmin' | 'subadmin'
  permissions: AdminPermissions
  isActive: boolean
  createdAt: string
}

const modules: Array<{ key: AdminModule; label: string; description: string }> = [
  { key: 'content', label: 'Website pages', description: 'Home page, About, event details and footer' },
  { key: 'media', label: 'Photos and videos', description: 'Upload files and choose media for website pages' },
  { key: 'gallery', label: 'Photo gallery page', description: 'Gallery photos, captions and optional videos' },
  { key: 'blog', label: 'News and articles', description: 'Blog stories, cover photos and article videos' },
  { key: 'enquiries', label: 'Exhibitor messages', description: 'Read enquiries sent by potential exhibitors' },
  { key: 'engagements', label: 'Registrations and newsletter', description: 'View sign-ups and download the email list' },
  { key: 'bookings', label: 'Pass bookings and refunds', description: 'See who paid for which pass and process refunds' },
]

function emptyPermissions(): AdminPermissions {
  return Object.fromEntries(modules.map(({ key }) => [key, { read: false, edit: false }]))
}

async function responseBody(response: Response) {
  const body: unknown = await response.json()
  if (!body || typeof body !== 'object') throw new Error('Unexpected server response.')
  return body as Record<string, unknown>
}

export function AdminUserManager() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [permissions, setPermissions] = useState<AdminPermissions>(emptyPermissions)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [savingUserId, setSavingUserId] = useState<number | null>(null)

  async function loadUsers() {
    const response = await fetch('/api/superadmin/users', { cache: 'no-store' })
    const body = await responseBody(response)
    if (!response.ok) throw new Error(String(body.error || 'Could not load admin accounts.'))
    setUsers(body.users as AdminUser[])
  }

  useEffect(() => {
    loadUsers().catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : 'Could not load admin accounts.'))
  }, [])

  async function createUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/superadmin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, permissions }),
      })
      const body = await responseBody(response)
      if (!response.ok) throw new Error(String(body.error || 'Could not create sub-admin.'))
      setEmail('')
      setPassword('')
      setPermissions(emptyPermissions())
      setMessage('Sub-admin account created.')
      await loadUsers()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not create sub-admin.')
    } finally {
      setSaving(false)
    }
  }

  async function updateUser(user: AdminUser) {
    setError('')
    setMessage('')
    setSavingUserId(user.id)
    try {
      const response = await fetch('/api/superadmin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, isActive: user.isActive, permissions: user.permissions }),
      })
      const body = await responseBody(response)
      if (!response.ok) throw new Error(String(body.error || 'Could not save sub-admin permissions.'))
      setMessage(`Access settings saved for ${user.email}.`)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save sub-admin permissions.')
    } finally {
      setSavingUserId(null)
    }
  }

  function setGrant(
    current: AdminPermissions,
    update: (next: AdminPermissions) => void,
    module: AdminModule,
    action: 'read' | 'edit',
    enabled: boolean,
  ) {
    const grant = { ...current[module], [action]: enabled }
    if (action === 'edit' && enabled) grant.read = true
    if (action === 'read' && !enabled) grant.edit = false
    update({ ...current, [module]: grant })
  }

  return (
    <div className="admin-users">
      <div className="admin-panel-heading">
        <div><span className="admin-eyebrow">ACCESS CONTROL</span><h2>Admin accounts</h2></div>
      </div>
      <div className="admin-section-guide">
        <strong>Who can do what?</strong>
        <p>Create a separate sign-in for each staff member, then choose which parts of the website they can view or change. Giving someone “Make changes” access also lets them view that section. The main Superadmin account always keeps full access.</p>
      </div>
      {error && <p className="admin-error" role="alert">{error}</p>}
      {message && <p className="admin-success" role="status">{message}</p>}

      <form className="admin-user-form" onSubmit={createUser}>
        <h3>Add a team member</h3>
        <label className="admin-edit-field"><span>Team member’s email</span><input type="email" autoComplete="email" placeholder="name@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label className="admin-edit-field"><span>Temporary password</span><input type="password" autoComplete="new-password" minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} required /><small className="admin-field-hint">Use at least 12 characters. Share it with the team member privately.</small></label>
          <div className="admin-permission-help"><strong>Choose their access</strong><span><b>View</b> means they can see information. <b>Make changes</b> means they can edit and publish information. Make changes also includes View.</span></div>
        <PermissionGrid permissions={permissions} onChange={setPermissions} setGrant={setGrant} />
        <button className="admin-primary-button" type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create sub-admin'}</button>
      </form>

      <div className="admin-user-list">
        <h3>Team accounts</h3>
        {users.map((user) => (
          <article className="admin-user-card" key={user.id}>
            <div className="admin-user-heading">
              <div><strong>{user.email}</strong><small>{user.role === 'superadmin' ? 'Main administrator · Full access' : user.isActive ? 'Team member · Account enabled' : 'Team member · Sign-in paused'}</small></div>
              {user.role === 'subadmin' && <label className="admin-boolean-field"><input type="checkbox" checked={user.isActive} onChange={(event) => setUsers((current) => current.map((item) => item.id === user.id ? { ...item, isActive: event.target.checked } : item))} />Can sign in</label>}
            </div>
            {user.role === 'subadmin' ? <>
              <PermissionGrid permissions={user.permissions} onChange={(next) => setUsers((current) => current.map((item) => item.id === user.id ? { ...item, permissions: next } : item))} setGrant={setGrant} />
              <button className="admin-primary-button" type="button" onClick={() => { void updateUser(user) }} disabled={savingUserId === user.id}>{savingUserId === user.id ? 'Saving access…' : 'Save access for this person'}</button>
            </> : <p className="admin-help">This is the main administrator account. It can view and manage every section and team account.</p>}
          </article>
        ))}
      </div>
    </div>
  )
}

function PermissionGrid({
  permissions,
  onChange,
  setGrant,
}: {
  permissions: AdminPermissions
  onChange: (next: AdminPermissions) => void
  setGrant: (current: AdminPermissions, update: (next: AdminPermissions) => void, module: AdminModule, action: 'read' | 'edit', enabled: boolean) => void
}) {
  return (
    <div className="admin-permission-grid">
      <div className="admin-permission-row admin-permission-header"><strong>Website area</strong><strong>View</strong><strong>Make changes</strong></div>
      {modules.map(({ key, label }) => (
        <div className="admin-permission-row" key={key}>
          <span title={modules.find((module) => module.key === key)?.description}>{label}<small>{modules.find((module) => module.key === key)?.description}</small></span>
          {(['read', 'edit'] as const).map((action) => (
            <label key={action} aria-label={`${action} ${label}`}><input
              type="checkbox"
              checked={permissions[key]?.[action] === true}
              onChange={(event) => setGrant(permissions, onChange, key, action, event.target.checked)}
            /></label>
          ))}
        </div>
      ))}
    </div>
  )
}
