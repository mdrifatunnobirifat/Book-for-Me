'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Service { id: string; title: string; price: number; duration_minutes: number }
interface Provider {
  id: string
  full_name: string
  business_name: string | null
  slug: string | null
  avatar_url: string | null
  bio: string | null
  category: string | null
  location: string | null
  phone: string | null
  services: Service[]
}

const CATEGORY_TABS = [
  { key: 'all', label: 'All Shops & Clinics', icon: '🌟' },
  { key: 'medical', label: 'Medical & Dental', icon: '🏥' },
  { key: 'grocery', label: 'Grocery & Supermarket', icon: '🛒' },
  { key: 'pharmacy', label: 'Pharmacy & Health', icon: '💊' },
  { key: 'bakery', label: 'Bakery & Food', icon: '🥖' },
  { key: 'salon', label: 'Salons & Barber', icon: '✂️' },
  { key: 'fitness', label: 'Fitness & Gym', icon: '🏋️' },
]

export default function ExplorePage() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedTab, setSelectedTab] = useState('all')
  const supabase = createClient()

  useEffect(() => {
    const fetchProviders = async () => {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name, business_name, slug, avatar_url, bio, category, location, phone')
        .eq('role', 'provider')

      if (!profs || profs.length === 0) {
        setProviders([])
        setLoading(false)
        return
      }

      const { data: svcs } = await supabase
        .from('services')
        .select('id, provider_id, title, price, duration_minutes')
        .eq('is_active', true)

      const merged = profs.map((p) => ({
        ...p,
        services: (svcs || []).filter((s) => s.provider_id === p.id),
      }))

      setProviders(merged)
      setLoading(false)
    }

    fetchProviders()
  }, [])

  const filteredProviders = providers.filter((p) => {
    const matchSearch =
      !search ||
      p.business_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.location?.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase()) ||
      p.services?.some((s) => s.title.toLowerCase().includes(search.toLowerCase()))

    if (!matchSearch) return false

    if (selectedTab === 'all') return true
    const cat = (p.category || '').toLowerCase()
    if (selectedTab === 'medical') return cat.includes('medical') || cat.includes('doctor') || cat.includes('dental')
    if (selectedTab === 'grocery') return cat.includes('grocery') || cat.includes('supermarket') || cat.includes('retail')
    if (selectedTab === 'pharmacy') return cat.includes('pharmacy') || cat.includes('medicine')
    if (selectedTab === 'bakery') return cat.includes('bakery') || cat.includes('food')
    if (selectedTab === 'salon') return cat.includes('barber') || cat.includes('hair') || cat.includes('spa') || cat.includes('beauty')
    if (selectedTab === 'fitness') return cat.includes('fitness') || cat.includes('gym')

    return true
  })

  return (
    <div className="sky-bg min-h-screen">
      {/* Top Navbar */}
      <nav className="relative z-10 border-b border-sky-100 bg-white/80 backdrop-blur-md px-6 py-4 sticky top-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-3xl">📅</span>
            <span className="text-2xl font-black text-sky-700 tracking-tight">BookforMe</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/auth/login"
              className="text-slate-600 hover:text-sky-600 font-bold text-xs px-3.5 py-2 rounded-xl hover:bg-sky-50 transition"
            >
              Sign In
            </Link>
            <Link href="/auth/signup" className="btn-shimmer text-xs px-4 py-2.5 rounded-xl font-bold">
              Join as Business / Doctor →
            </Link>
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-10">
        {/* Hero Section */}
        <div className="text-center mb-8 animate-fade-up">
          <div className="inline-flex items-center gap-2 bg-sky-100 text-sky-700 text-xs font-bold px-4 py-1.5 rounded-full mb-3 border border-sky-200">
            🏥 Medical Clinics • 🛒 Local Grocers • ✂️ Salons • 💊 Pharmacies
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-800 mb-3 tracking-tight">
            Find Doctors, Groceries & Services<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-blue-600">
              All in One Marketplace
            </span>
          </h1>
          <p className="text-slate-500 max-w-xl mx-auto text-sm">
            Book medical appointments, order from local grocery stores, and schedule services easily.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mt-6">
            <div className="glass p-2 rounded-2xl flex items-center gap-2 shadow-lg border border-sky-100">
              <span className="text-xl pl-3">🔍</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by clinic, doctor, grocery store, product, or location..."
                className="w-full bg-transparent border-0 text-slate-800 placeholder-slate-400 text-sm focus:outline-none px-2 py-2"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="text-slate-400 hover:text-slate-600 text-xs px-2 font-bold"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 justify-start sm:justify-center">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedTab(tab.key)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 ${
                selectedTab === tab.key
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-200 scale-102'
                  : 'bg-white text-slate-600 hover:bg-sky-50 border border-slate-200'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Provider / Store Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 border-4 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sky-600 text-sm font-semibold">Loading verified stores & clinics...</p>
          </div>
        ) : filteredProviders.length === 0 ? (
          <div className="text-center py-20 glass rounded-3xl animate-fade-up max-w-md mx-auto">
            <p className="text-5xl mb-3">🔍</p>
            <p className="text-slate-700 font-extrabold text-base mb-1">No matching shops or clinics</p>
            <p className="text-slate-400 text-xs mb-4">Try searching with a different keyword or category.</p>
            <button onClick={() => { setSearch(''); setSelectedTab('all') }} className="btn-shimmer text-xs px-4 py-2 rounded-xl font-bold">
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProviders.map((p) => {
              const shopLink = `/book/${p.slug || p.id}`
              const isGrocery = (p.category || '').toLowerCase().includes('grocery') || (p.category || '').toLowerCase().includes('retail') || (p.category || '').toLowerCase().includes('pharmacy')
              const isMedical = (p.category || '').toLowerCase().includes('medical') || (p.category || '').toLowerCase().includes('doctor') || (p.category || '').toLowerCase().includes('dental')

              return (
                <Link
                  key={p.id}
                  href={shopLink}
                  className="group bg-white rounded-3xl overflow-hidden hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 border border-slate-100 flex flex-col"
                >
                  {/* Shop Cover Banner */}
                  <div className="relative h-36 bg-gradient-to-br from-sky-400 to-blue-600 overflow-hidden">
                    {p.avatar_url ? (
                      <img
                        src={p.avatar_url}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl opacity-40">
                        {isMedical ? '🏥' : isGrocery ? '🛒' : '🏪'}
                      </div>
                    )}
                    {/* Badge */}
                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-[11px] font-extrabold text-slate-800 px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1">
                      <span>{isMedical ? '🏥' : isGrocery ? '🛒' : '⭐'}</span>
                      <span className="truncate max-w-[130px]">{p.category || 'Business'}</span>
                    </div>

                    <div className="absolute top-3 right-3 bg-sky-500/95 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {isGrocery ? 'Cart & Delivery' : 'Appointments'}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-500 text-white font-black text-xl flex items-center justify-center flex-shrink-0 -mt-8 border-2 border-white shadow-md overflow-hidden">
                        {p.avatar_url ? (
                          <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          p.full_name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <h2 className="font-extrabold text-slate-800 text-base leading-tight truncate">
                          {p.business_name || p.full_name}
                        </h2>
                        <p className="text-slate-400 text-xs truncate">{p.full_name}</p>
                      </div>
                    </div>

                    {/* Location & Phone */}
                    <div className="space-y-1 mb-3 text-xs text-slate-500">
                      {p.location && (
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-sky-500">📍</span>
                          <span className="truncate">{p.location}</span>
                        </div>
                      )}
                      {p.phone && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-emerald-500">📞</span>
                          <span>{p.phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Bio */}
                    {p.bio && (
                      <p className="text-slate-400 text-xs line-clamp-2 mb-4 flex-1">
                        {p.bio.replace(/\[MODE:(cart|booking|both)\]\s*/, '')}
                      </p>
                    )}

                    {/* Products / Services list */}
                    {p.services.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {p.services.slice(0, 3).map((s) => (
                          <span
                            key={s.id}
                            className="text-[10px] bg-sky-50 text-sky-700 border border-sky-100 px-2 py-0.5 rounded-full font-semibold"
                          >
                            {s.title}
                          </span>
                        ))}
                        {p.services.length > 3 && (
                          <span className="text-[10px] text-slate-400 font-semibold self-center">
                            +{p.services.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-medium">
                        {isGrocery ? 'Order Groceries' : 'Book Consultation'}
                      </span>
                      <span className="text-xs bg-sky-500 group-hover:bg-sky-600 text-white font-extrabold px-3.5 py-1.5 rounded-xl transition shadow-xs">
                        {isGrocery ? 'Shop Now →' : 'Enter Shop →'}
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
