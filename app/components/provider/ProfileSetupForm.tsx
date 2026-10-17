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

export const CATEGORIES = [
  { name: 'Medical Clinic & Doctor', icon: '🏥', defaultMode: 'booking' },
  { name: 'Dental Care & Clinic', icon: '🦷', defaultMode: 'booking' },
  { name: 'Pharmacy & Medicine', icon: '💊', defaultMode: 'cart' },
  { name: 'Grocery & Supermarket', icon: '🛒', defaultMode: 'cart' },
  { name: 'Bakery & Food Store', icon: '🥖', defaultMode: 'cart' },
  { name: 'Barbershop & Hair Salon', icon: '✂️', defaultMode: 'booking' },
  { name: 'Beauty & Spa', icon: '💆', defaultMode: 'booking' },
  { name: 'Fitness & Gym Trainer', icon: '🏋️', defaultMode: 'booking' },
  { name: 'General Retail & Shop', icon: '🏪', defaultMode: 'cart' },
  { name: 'Home Services & Repair', icon: '🔧', defaultMode: 'booking' },
  { name: 'Legal & Consulting', icon: '⚖️', defaultMode: 'booking' },
  { name: 'Photography & Studio', icon: '📷', defaultMode: 'booking' },
  { name: 'Education & Tutoring', icon: '📚', defaultMode: 'booking' },
  { name: 'Automotive & Garage', icon: '🚗', defaultMode: 'booking' },
  { name: 'Pet Shop & Care', icon: '🐾', defaultMode: 'cart' },
  { name: 'Other Business', icon: '🌟', defaultMode: 'booking' },
]

export default function ProfileSetupForm({ providerId, initial, onRefresh }: Props) {
  const [businessName, setBusinessName] = useState(initial.business_name || '')
  const [slug, setSlug] = useState(initial.slug || '')
  const [phone, setPhone] = useState(initial.phone || '')
  const [location, setLocation] = useState(initial.location || '')
  const [avatarUrl, setAvatarUrl] = useState(initial.avatar_url || '')
  const [category, setCategory] = useState(initial.category || '')
  
  // Extract custom store mode from bio tags if present: [MODE:cart], [MODE:booking], [MODE:both]
  const parseBio = (raw: string | null) => {
    if (!raw) return { cleanBio: '', mode: 'auto' }
    const match = raw.match(/\[MODE:(cart|booking|both)\]/)
    const mode = match ? match[1] : 'auto'
    const cleanBio = raw.replace(/\[MODE:(cart|booking|both)\]\s*/, '').trim()
    return { cleanBio, mode }
  }

  const parsed = parseBio(initial.bio)
  const [bio, setBio] = useState(parsed.cleanBio)
  const [storeMode, setStoreMode] = useState<'auto' | 'booking' | 'cart' | 'both'>(
    (parsed.mode as 'auto' | 'booking' | 'cart' | 'both') || 'auto'
  )

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setSaving(true)
    setError('')

    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-')
    // Encode store mode tag in bio
    const modeTag = storeMode !== 'auto' ? `[MODE:${storeMode}] ` : ''
    const fullBio = `${modeTag}${bio}`.trim() || null

    const { error: err } = await supabase
      .from('profiles')
      .update({
        business_name: businessName || null,
        slug: cleanSlug || null,
        bio: fullBio,
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
    <div className="glass rounded-3xl p-6 md:p-8 shadow-xl border border-sky-100">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h3 className="font-black text-slate-800 text-xl flex items-center gap-2">
            <span>🏪</span> Shop & Clinic Profile Setup
          </h3>
          <p className="text-slate-400 text-xs mt-0.5">
            Configure your business details, products, and checkout experience
          </p>
        </div>
        <span className="text-xs bg-sky-100 text-sky-700 font-bold px-3 py-1 rounded-full border border-sky-200">
          Visible on Explore & Public Link
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-4 py-2.5 rounded-xl mb-4 flex items-center gap-2">
          <span>❌</span> {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        {/* Image Upload Component */}
        <ImageUpload
          currentUrl={avatarUrl}
          label="Shop / Clinic Cover Photo"
          onUpload={(url) => setAvatarUrl(url)}
        />

        {/* Business Name */}
        <div>
          <label className="block text-slate-700 text-xs font-bold mb-1.5 uppercase tracking-wide">
            Business / Clinic / Shop Name *
          </label>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            required
            placeholder="e.g. City Health Clinic, Fresh Market Grocery, or Alex Hair Studio"
            className="sky-input text-sm"
          />
        </div>

        {/* Custom Shop Slug / Link Handle */}
        <div>
          <label className="block text-slate-700 text-xs font-bold mb-1.5 uppercase tracking-wide">
            🔗 Custom Shop Web Link
          </label>
          <div className="flex items-center">
            <span className="bg-slate-100 border border-r-0 border-sky-200 px-3.5 py-2.5 rounded-l-xl text-xs font-mono text-slate-500">
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
            Choose a simple short link for your customers (e.g. <code>/book/city-clinic</code> or <code>/book/green-grocers</code>)
          </p>
        </div>

        {/* Category Selector */}
        <div>
          <label className="block text-slate-700 text-xs font-bold mb-1.5 uppercase tracking-wide">
            🏷️ Business Category *
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            className="sky-input text-sm"
          >
            <option value="">Select your business type...</option>
            {CATEGORIES.map((c) => (
              <option key={c.name} value={c.name}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Store Operating Mode (Shopping Cart vs Appointment Scheduling) */}
        <div className="bg-sky-50/60 p-4 rounded-2xl border border-sky-200 space-y-3">
          <label className="block text-slate-800 text-xs font-black uppercase tracking-wide flex items-center justify-between">
            <span>⚙️ Customer Checkout & Ordering Mode</span>
            <span className="text-[11px] text-sky-600 font-semibold lowercase">
              {storeMode === 'cart'
                ? '🛒 Grocery / Retail Cart'
                : storeMode === 'booking'
                ? '📅 Time-slot Appointments'
                : storeMode === 'both'
                ? '⚡ Dual Mode'
                : '🤖 Auto based on Category'}
            </span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => setStoreMode('booking')}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                storeMode === 'booking'
                  ? 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-200'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-sky-300'
              }`}
            >
              <span className="text-xl">📅</span>
              <span className="text-xs font-bold">Appointments</span>
              <span className={`text-[10px] ${storeMode === 'booking' ? 'text-sky-100' : 'text-slate-400'}`}>
                For Clinics, Doctors, Salons, Consultations
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStoreMode('cart')}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                storeMode === 'cart'
                  ? 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-200'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-sky-300'
              }`}
            >
              <span className="text-xl">🛒</span>
              <span className="text-xs font-bold">Grocery / Retail</span>
              <span className={`text-[10px] ${storeMode === 'cart' ? 'text-sky-100' : 'text-slate-400'}`}>
                Multi-item cart, quantity (+/-), Pickup & Delivery
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStoreMode('both')}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                storeMode === 'both'
                  ? 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-200'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-sky-300'
              }`}
            >
              <span className="text-xl">⚡</span>
              <span className="text-xs font-bold">Both Services & Cart</span>
              <span className={`text-[10px] ${storeMode === 'both' ? 'text-sky-100' : 'text-slate-400'}`}>
                Allows both booking appointments and buying products
              </span>
            </button>
          </div>
        </div>

        {/* Phone / Mobile / WhatsApp */}
        <div>
          <label className="block text-slate-700 text-xs font-bold mb-1.5 uppercase tracking-wide">
            📞 Phone / WhatsApp / Emergency Contact
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 234 567 8900"
            className="sky-input text-sm"
          />
        </div>

        {/* Location / Chamber / Store Address */}
        <div>
          <label className="block text-slate-700 text-xs font-bold mb-1.5 uppercase tracking-wide">
            📍 Store Address / Clinic Location
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Suite 402, Medical Arts Building / 123 Market St"
            className="sky-input text-sm"
          />
        </div>

        {/* About / Bio / Specializations */}
        <div>
          <label className="block text-slate-700 text-xs font-bold mb-1.5 uppercase tracking-wide">
            📝 About Your Business, Specialties & Doctor Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="List doctor qualifications, clinic specialties, delivery terms, or grocery freshness guarantees..."
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
              <span>Saving Profile...</span>
            </>
          ) : saved ? (
            '✅ Profile Saved Successfully!'
          ) : (
            '💾 Save Business Profile'
          )}
        </button>
      </form>
    </div>
  )
}
