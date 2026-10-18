'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import StatCard from '@/app/components/admin/StatCard'

// Authorized Super Admins list
const SUPER_ADMIN_EMAILS = [
  'rifatsingertvr@gmail.com',
]

interface Profile {
  id: string
  full_name: string
  business_name: string | null
  slug?: string | null
  email: string
  role: string
  category: string | null
  phone: string | null
  location: string | null
  avatar_url: string | null
  created_at: string
}

interface Service {
  id: string
  provider_id: string
  title: string
  price: number
}

interface Booking {
  id: string
  provider_id: string
  customer_id: string
  booking_date: string
  start_time: string
  status: string
  services?: { title: string; price: number }
  provider?: { full_name: string; business_name: string | null }
  customer?: { full_name: string; email: string }
}

export default function AdminDashboard() {
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; isSuperAdmin: boolean } | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'providers' | 'customers' | 'bookings'>('providers')
  const [searchTerm, setSearchTerm] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [bannerMsg, setBannerMsg] = useState('')

  const router = useRouter()
  const supabase = createClient()

  const loadAdminData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }

    const email = (user.email || '').toLowerCase().trim()
    const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(email)

    // Security check: Only authorized Super Admins are allowed
    if (!isSuperAdmin) {
      router.push('/dashboard/customer')
      return
    }

    setCurrentUser({ id: user.id, email: user.email || '', isSuperAdmin: true })

    const [{ data: profs }, { data: svcs }, { data: bks }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('services').select('id, provider_id, title, price'),
      supabase.from('bookings').select('id, provider_id, customer_id, booking_date, start_time, status, services(title, price), provider:profiles!bookings_provider_id_fkey(full_name, business_name), customer:profiles!bookings_customer_id_fkey(full_name, email)').order('booking_date', { ascending: false }),
    ])

    setProfiles(profs || [])
    setServices(svcs || [])
    setBookings((bks as unknown as Booking[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    loadAdminData()
  }, [])

  // Delete User Account (Provider or Customer) with Instant UI Removal & Auto-Reload
  const handleDeleteUser = async (userId: string, name: string, isProvider: boolean) => {
    if (!confirm(`Are you sure you want to permanently delete "${name}"? This action cannot be undone.`)) {
      return
    }

    setActionLoading(userId)

    // 1. Optimistic UI update: Instantly remove user from state so it disappears immediately
    setProfiles((prev) => prev.filter((p) => p.id !== userId))
    if (isProvider) {
      setServices((prev) => prev.filter((s) => s.provider_id !== userId))
    }
    setBookings((prev) => prev.filter((b) => b.provider_id !== userId && b.customer_id !== userId))

    setBannerMsg(`🗑️ Deleting "${name}" and reloading...`)

    try {
      // 2. Call the backend deletion API
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      const data = await res.json()
      if (data.success) {
        setBannerMsg(`✅ "${name}" was deleted successfully. Reloading page...`)
        // 3. Reload page itself to sync fresh state with database
        setTimeout(() => {
          window.location.reload()
        }, 1200)
      } else {
        alert(data.error || 'Failed to delete user.')
        setActionLoading(null)
      }
    } catch {
      // Reload on network finish anyway
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    }
  }

  if (loading) {
    return (
      <div className="sky-bg min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sky-600 font-bold">Verifying Super Admin Access...</p>
        </div>
      </div>
    )
  }

  const providers = profiles.filter((p) => p.role === 'provider')
  const customers = profiles.filter((p) => p.role === 'customer')

  const filteredProviders = providers.filter((p) =>
    !searchTerm ||
    p.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredCustomers = customers.filter((c) =>
    !searchTerm ||
    c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredBookings = bookings.filter((b) =>
    !searchTerm ||
    b.provider?.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.customer?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.customer?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.services?.title?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="sky-bg min-h-screen pb-16">
      {/* Top Admin Navbar */}
      <nav className="bg-slate-900 text-white px-6 py-4 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛡️</span>
            <div>
              <span className="font-black text-lg text-sky-400">BookforMe</span>
              <span className="text-xs text-emerald-400 ml-2 font-mono uppercase bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-800">
                Super Admin Verified
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 hidden sm:inline">
              Logged in: <strong className="text-white">{currentUser?.email}</strong>
            </span>
            <Link
              href="/dashboard/provider"
              className="text-slate-300 hover:text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-slate-800 transition"
            >
              🏪 Provider View
            </Link>
            <Link
              href="/explore"
              className="text-slate-300 hover:text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-slate-800 transition"
            >
              🛍️ Explore Site
            </Link>
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                router.push('/auth/login')
              }}
              className="bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 text-xs font-bold px-3 py-1.5 rounded-lg transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Banner Message */}
        {bannerMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-2xl mb-6 font-bold flex items-center gap-2 animate-fade-in shadow-sm">
            <span>ℹ️</span> {bannerMsg}
          </div>
        )}

        {/* ── MASTER STATS USING PROPS ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Providers / Shops"
            value={providers.length}
            icon="🏪"
            color="from-sky-400 to-blue-500"
            subtext="Registered shop owners"
          />
          <StatCard
            label="Total Customers"
            value={customers.length}
            icon="👤"
            color="from-indigo-400 to-purple-500"
            subtext="Registered clients"
          />
          <StatCard
            label="Total Appointments"
            value={bookings.length}
            icon="📅"
            color="from-emerald-400 to-green-500"
            subtext="Platform bookings"
          />
          <StatCard
            label="Total Services Listed"
            value={services.length}
            icon="🛠"
            color="from-amber-400 to-yellow-500"
            subtext="Active shop catalog items"
          />
        </div>

        {/* Control & Search Bar */}
        <div className="glass rounded-3xl p-6 shadow-xl border border-sky-100 mb-6">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6">
            {/* Tabs */}
            <div className="flex gap-2">
              {[
                { key: 'providers' as const, label: `🏪 Providers (${providers.length})` },
                { key: 'customers' as const, label: `👤 Customers (${customers.length})` },
                { key: 'bookings' as const,  label: `📋 All Bookings (${bookings.length})` },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                    activeTab === t.key
                      ? 'bg-sky-500 text-white shadow-md shadow-sky-200'
                      : 'bg-white text-slate-600 hover:bg-sky-50 border border-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative max-w-sm w-full">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, business, category..."
                className="sky-input text-xs py-2.5 pl-9 w-full"
              />
              <span className="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
            </div>
          </div>

          {/* ── TAB 1: PROVIDERS TABLE ── */}
          {activeTab === 'providers' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-sky-100 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-3">Shop & Provider</th>
                    <th className="py-3 px-3">Email</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Location & Phone</th>
                    <th className="py-3 px-3">Services</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProviders.map((p) => {
                    const provServices = services.filter((s) => s.provider_id === p.id)
                    const shopLink = `/book/${p.slug || p.id}`
                    const isDeleting = actionLoading === p.id

                    return (
                      <tr key={p.id} className="hover:bg-sky-50/40 transition">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-blue-500 text-white font-black flex items-center justify-center text-sm flex-shrink-0 overflow-hidden shadow-xs">
                              {p.avatar_url ? (
                                <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                p.full_name?.charAt(0).toUpperCase() || 'P'
                              )}
                            </div>
                            <div>
                              <p className="font-extrabold text-slate-800 text-sm">
                                {p.business_name || p.full_name}
                              </p>
                              <p className="text-slate-400 text-[11px]">{p.full_name}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-slate-600 font-mono">{p.email || '—'}</td>

                        <td className="py-3 px-3">
                          <span className="bg-sky-50 text-sky-700 px-2.5 py-1 rounded-full font-bold text-[10px] border border-sky-100">
                            {p.category || 'General'}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-slate-500">
                          <p>{p.location || '—'}</p>
                          {p.phone && <p className="text-emerald-600 font-semibold">{p.phone}</p>}
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-extrabold text-slate-700">{provServices.length}</span> services
                        </td>

                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={shopLink}
                              target="_blank"
                              className="bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold px-2.5 py-1.5 rounded-lg text-xs transition"
                            >
                              👁 View Shop
                            </Link>

                            <button
                              onClick={() => handleDeleteUser(p.id, p.business_name || p.full_name, true)}
                              disabled={isDeleting}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-2.5 py-1.5 rounded-lg text-xs transition disabled:opacity-50 flex items-center gap-1"
                            >
                              {isDeleting ? (
                                <>
                                  <div className="w-3 h-3 border-2 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
                                  <span>Deleting...</span>
                                </>
                              ) : (
                                '🗑️ Delete'
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {filteredProviders.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400">
                        No providers found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ── TAB 2: CUSTOMERS TABLE ── */}
          {activeTab === 'customers' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-sky-100 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-3">Customer Name</th>
                    <th className="py-3 px-3">Email</th>
                    <th className="py-3 px-3">Appointments Booked</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.map((c) => {
                    const userBookings = bookings.filter((b) => b.customer_id === c.id)
                    const isDeleting = actionLoading === c.id

                    return (
                      <tr key={c.id} className="hover:bg-sky-50/40 transition">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-white font-bold flex items-center justify-center text-xs">
                              {c.full_name?.charAt(0).toUpperCase() || 'C'}
                            </div>
                            <span className="font-extrabold text-slate-800">{c.full_name}</span>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-slate-600 font-mono">{c.email || '—'}</td>

                        <td className="py-3 px-3">
                          <span className="font-extrabold text-slate-700">{userBookings.length}</span> total bookings
                        </td>

                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleDeleteUser(c.id, c.full_name, false)}
                            disabled={isDeleting}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-2.5 py-1.5 rounded-lg text-xs transition disabled:opacity-50 flex items-center gap-1"
                          >
                            {isDeleting ? (
                              <>
                                <div className="w-3 h-3 border-2 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
                                <span>Deleting...</span>
                              </>
                            ) : (
                              '🗑️ Delete Customer'
                            )}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {filteredCustomers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-slate-400">
                        No customers found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ── TAB 3: ALL BOOKINGS TABLE ── */}
          {activeTab === 'bookings' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-sky-100 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-3">Service</th>
                    <th className="py-3 px-3">Provider / Shop</th>
                    <th className="py-3 px-3">Customer</th>
                    <th className="py-3 px-3">Date & Time</th>
                    <th className="py-3 px-3">Price</th>
                    <th className="py-3 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-sky-50/40 transition">
                      <td className="py-3 px-3 font-extrabold text-slate-800">
                        {b.services?.title || 'Appointment'}
                      </td>
                      <td className="py-3 px-3 text-sky-700 font-semibold">
                        {b.provider?.business_name || b.provider?.full_name || 'Provider'}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {b.customer?.full_name || b.customer?.email || 'Customer'}
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        {b.booking_date} at {b.start_time?.slice(0, 5)}
                      </td>
                      <td className="py-3 px-3 font-black text-emerald-600">
                        ${Number(b.services?.price || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="bg-sky-100 text-sky-700 font-bold px-2 py-0.5 rounded-full text-[10px] uppercase">
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredBookings.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400">
                        No bookings found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
