'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
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
  const [bio, setBio] = useState(initial.bio || '')
  const [phone, setPhone] = useState(initial.phone || '')
  const [location, setLocation] = useState(initial.location || '')
  const [avatarUrl, setAvatarUrl] = useState(initial.avatar_url || '')
  const [category, setCategory] = useState(initial.category || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
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

  return (
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
  )
}
