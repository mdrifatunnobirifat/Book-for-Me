'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import ImageUpload from '@/app/components/ImageUpload'

interface Props {
  providerId: string
  initial: {
    bio: string | null
    phone: string | null
    location: string | null
    avatar_url: string | null
    category: string | null
    business_name: string | null
    full_name: string
    slug?: string | null
  }
  onRefresh: () => void
}

const CATEGORIES = [
  'Barbershop & Hair',
  'Beauty & Spa',
  'Fitness & Gym',
  'Medical & Health',
  'Legal & Consulting',
  'Home Services',
  'Photography',
  'Education & Tutoring',
  'Automotive',
  'Pet Care',
  'Food & Catering',
  'Other',
]

export default function ProfileSetupForm({ providerId, initial, onRefresh }: Props) {
  const [businessName, setBusinessName] = useState(initial.business_name || '')
  const [slug, setSlug] = useState(initial.slug || '')
  const [bio, setBio] = useState(initial.bio ? initial.bio.replace(/\[MODE:(cart|booking|both)\]\s*/, '') : '')
  const [phone, setPhone] = useState(initial.phone || '')
  const [location, setLocation] = useState(initial.location || '')
  const [avatarUrl, setAvatarUrl] = useState(initial.avatar_url || '')
  const [category, setCategory] = useState(initial.category || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Delete Shop state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const router = useRouter()
  const supabase = createClient()

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setSaving(true)
    setError('')

    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-')

    const { error: err } = await supabase
      .from('profiles')
      .update({
        business_name: businessName || null,
        slug: cleanSlug || null,
        bio: bio || null,
        phone: phone || null,
        location: location || null,
        avatar_url: avatarUrl || null,
        category: category || null,
      })
      .eq('id', providerId)

    setSaving(false)
    if (err) {
      setError(err.message)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      onRefresh()
    }
  }

  const handleDeleteShop = async () => {
    if (confirmText.toUpperCase() !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm.')
      return
    }

    setDeleting(true)
    setDeleteError('')

    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: providerId }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete shop')
      }

      await supabase.auth.signOut()
      router.push('/')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Deletion failed'
      setDeleteError(msg)
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6 shadow-xl border border-sky-100">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
            <span className="text-2xl">🏪</span> Edit Shop Profile
          </h3>
          <span className="text-xs bg-sky-100 text-sky-700 font-bold px-3 py-1 rounded-full border border-sky-200">
            Visible on Explore & Shopping Page
          </span>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-4 py-2.5 rounded-xl mb-4 flex items-center gap-2">
            <span>❌</span> {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {/* Image Upload Component */}
          <ImageUpload
            currentUrl={avatarUrl}
            label="Shop / Cover Photo"
            onUpload={(url) => setAvatarUrl(url)}
          />

          {/* Business Name */}
          <div>
            <label className="block text-slate-700 text-xs font-bold mb-1.5 uppercase tracking-wide">
              Shop / Business Name
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Skyline Hair & Spa Lounge"
              className="sky-input text-sm"
            />
          </div>

          {/* Custom Shop Slug / Link Handle */}
          <div>
            <label className="block text-slate-700 text-xs font-bold mb-1.5 uppercase tracking-wide">
              🔗 Custom Shop URL Handle
            </label>
            <div className="flex items-center">
              <span className="bg-slate-100 border border-r-0 border-sky-200 px-3 py-2.5 rounded-l-xl text-xs font-mono text-slate-500">
                /book/
              </span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-'))}
                placeholder="my-shop-name"
                className="sky-input text-sm rounded-l-none"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Create a custom short link for your customers (e.g. <code>/book/rifats-salon</code>)
            </p>
          </div>

          {/* Category */}
          <div>
            <label className="block text-slate-700 text-xs font-bold mb-1.5 uppercase tracking-wide">
              🏷️ Service Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="sky-input text-sm"
            >
              <option value="">Select a category...</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Phone / Mobile */}
          <div>
            <label className="block text-slate-700 text-xs font-bold mb-1.5 uppercase tracking-wide">
              📞 Phone / Mobile Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 234 567 8900"
              className="sky-input text-sm"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-slate-700 text-xs font-bold mb-1.5 uppercase tracking-wide">
              📍 Location / Address
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. 5th Avenue, New York / Downtown"
              className="sky-input text-sm"
            />
          </div>

          {/* About / Bio */}
          <div>
            <label className="block text-slate-700 text-xs font-bold mb-1.5 uppercase tracking-wide">
              📝 About Your Shop & Specializations
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Describe your services, hygiene standards, experience, or what customers can expect..."
              className="sky-input text-sm resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full btn-shimmer py-3.5 text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2 rounded-xl shadow-lg shadow-sky-200"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Saving Changes...</span>
              </>
            ) : saved ? (
              '✅ Shop Profile Saved!'
            ) : (
              '💾 Save Shop Profile'
            )}
          </button>
        </form>
      </div>

      {/* ── DANGER ZONE: DELETE SHOP ── */}
      <div className="glass rounded-2xl p-6 border-2 border-rose-200 bg-rose-50/30">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="text-rose-700 font-extrabold text-base flex items-center gap-2">
              <span>⚠️</span> Danger Zone: Delete Shop
            </h4>
            <p className="text-slate-500 text-xs mt-1 max-w-xl">
              Permanently remove your shop from BookforMe. This will remove your public store link,
              delete your listed services, working hours, and cancel any pending appointments. This action cannot be undone.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setShowDeleteModal(true); setConfirmText(''); setDeleteError('') }}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-sm flex-shrink-0"
          >
            🗑️ Delete Shop
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-rose-100 animate-bounce-in">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center text-3xl mx-auto mb-4">
              🗑️
            </div>
            <h3 className="text-xl font-black text-slate-800 text-center mb-2">Delete Your Shop?</h3>
            <p className="text-slate-500 text-xs text-center mb-4 leading-relaxed">
              Are you completely sure? This will delete <strong>{businessName || 'your shop'}</strong>,
              all services, schedule hours, and cancel all appointments.
            </p>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 mb-4">
              <label className="block text-slate-700 text-xs font-bold mb-1">
                Type <span className="text-rose-600 font-black">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="w-full bg-white border border-rose-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>

            {deleteError && (
              <p className="text-rose-600 text-xs mb-3 font-semibold text-center">❌ {deleteError}</p>
            )}

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteShop}
                disabled={confirmText.toUpperCase() !== 'DELETE' || deleting}
                className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs py-3 rounded-xl transition shadow-md shadow-rose-200"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete Shop'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
