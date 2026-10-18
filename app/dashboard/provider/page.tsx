'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import ServiceForm from '@/app/components/provider/ServiceForm'
import ScheduleForm from '@/app/components/provider/ScheduleForm'
import BookingsTable from '@/app/components/provider/BookingsTable'
import ProfileSetupForm from '@/app/components/provider/ProfileSetupForm'
import Link from 'next/link'

interface Profile {
  id: string
  full_name: string
  business_name: string | null
  slug: string | null
  bio: string | null
  phone: string | null
  location: string | null
  avatar_url: string | null
  category: string | null
  role?: string | null
}

interface Service {
  id: string
  title: string
  duration_minutes: number
  price: number
  description: string | null
  is_active: boolean
}

interface WorkingHour {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  is_day_off: boolean
}

interface Booking {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  status: string
  customer_notes: string | null
  services: { title: string; duration_minutes: number; price: number }
  customer: { id: string; full_name: string; email?: string }
}

export default function ProviderDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [showToast, setShowToast] = useState(true)
  const [activeTab, setActiveTab] = useState<'preview' | 'profile' | 'services' | 'schedule' | 'bookings'>('preview')
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [copied, setCopied] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const fetchData = async (userId: string) => {
    const [{ data: svc }, { data: wh }, { data: bk }] = await Promise.all([
      supabase.from('services').select('*').eq('provider_id', userId),
      supabase.from('working_hours').select('*').eq('provider_id', userId),
      supabase.from('bookings')
        .select('id, booking_date, start_time, end_time, status, customer_notes, services(title, duration_minutes, price), customer:profiles!bookings_customer_id_fkey(id, full_name, email)')
        .eq('provider_id', userId)
        .order('booking_date', { ascending: false }),
    ])
    setServices(svc || [])
    setWorkingHours(wh || [])
    setBookings((bk as unknown as Booking[]) || [])
  }

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, business_name, slug, role, bio, phone, location, avatar_url, category')
      .eq('id', userId)
      .single()
    if (data) setProfile(data)
  }

  useEffect(() => {
    const init = async () => {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) {
        router.push('/auth/login')
        return
      }
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', u.id).single()
      if (prof?.role !== 'provider' && prof?.role !== 'admin') {
        router.push('/dashboard/customer')
        return
      }
      await fetchProfile(u.id)
      await fetchData(u.id)
      setLoading(false)
    }
    init()

    const t = setTimeout(() => setShowToast(false), 3500)
    return () => clearTimeout(t)
  }, [])

  const pending = bookings.filter((b) => b.status === 'pending').length

  // Dynamically resolve base URL: in browser it automatically uses the live domain (e.g. https://your-site.vercel.app)
  const shopPath = profile?.slug ? `/book/${profile.slug}` : profile ? `/book/${profile.id}` : '/book'
  const shopUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${shopPath}`
      : `${process.env.NEXT_PUBLIC_APP_URL || ''}${shopPath}`

  const copyLink = () => {
    if (shopUrl) {
      navigator.clipboard.writeText(shopUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="sky-bg min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sky-600 font-bold">Loading your provider dashboard...</p>
        </div>
      </div>
    )
  }

  const tabs = [
    { key: 'preview',  label: '🛍️ My Live Shop (Preview)', badge: null },
    { key: 'profile',  label: '🏪 Shop Profile',         badge: null },
    { key: 'services', label: '🛠 Services',             badge: services.length },
    { key: 'schedule', label: '📆 Schedule',             badge: null },
    { key: 'bookings', label: '📋 Bookings',             badge: pending > 0 ? pending : null },
  ]

  return (
    <div className="sky-bg min-h-screen">
      <div className="absolute top-0 right-0 w-80 h-80 bg-sky-200/40 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl" />

      {/* Welcome Toast */}
      {showToast && profile && (
        <div className="fixed top-5 right-5 z-50 animate-bounce-in">
          <div className="glass rounded-2xl px-5 py-4 shadow-2xl flex items-center gap-3 min-w-[280px] border-l-4 border-sky-500">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white font-black text-lg flex-shrink-0 overflow-hidden shadow-sm">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                profile.full_name.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <p className="text-slate-800 font-extrabold text-sm">Welcome back! 🎉</p>
              <p className="text-sky-600 text-xs font-semibold">{profile.business_name || profile.full_name}</p>
            </div>
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full ml-auto animate-pulse"></div>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <nav className="relative z-20 bg-white/80 backdrop-blur-md border-b border-sky-100 px-6 py-4 sticky top-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-3xl">📅</span>
            <span className="text-2xl font-black text-sky-700 tracking-tight">BookforMe</span>
            <span className="text-xs bg-sky-100 text-sky-700 px-2.5 py-0.5 rounded-full font-bold ml-2">
              Provider Center
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {profile && (
              <a
                href={shopPath}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-shimmer text-xs px-4 py-2.5 rounded-xl font-bold flex items-center gap-1.5 shadow-md shadow-sky-200"
              >
                <span>🛍️</span> Open My Live Shop ↗
              </a>
            )}

            <Link
              href="/admin"
              className="text-slate-600 hover:text-sky-600 text-xs font-bold transition px-3 py-2 rounded-xl hover:bg-sky-50 flex items-center gap-1 border border-sky-100"
            >
              🛡️ Super Admin
            </Link>
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                router.push('/auth/login')
              }}
              className="text-slate-500 hover:text-rose-600 text-xs font-bold transition px-3 py-2 rounded-xl hover:bg-rose-50"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-7xl mx-auto p-6">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 animate-fade-up">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-black text-2xl overflow-hidden border-2 border-white shadow-lg">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                '🏪'
              )}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-800">
                {profile?.business_name || profile?.full_name}
              </h1>
              <div className="flex items-center gap-2 text-slate-400 text-xs mt-0.5">
                <span>{profile?.category || 'Complete your shop profile'}</span>
                {profile?.location && (
                  <>
                    <span>•</span>
                    <span>📍 {profile.location}</span>
                  </>
                )}
                {profile?.phone && (
                  <>
                    <span>•</span>
                    <span>📞 {profile.phone}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Shop Link Pill */}
          <div className="glass px-4 py-2.5 rounded-2xl flex items-center gap-3 border border-sky-100 max-w-md">
            <span className="text-xs font-bold text-slate-500 flex-shrink-0">🔗 Shop Link:</span>
            <span className="text-xs font-mono text-sky-600 truncate">{shopUrl}</span>
            <button
              onClick={copyLink}
              className="text-xs bg-sky-500 hover:bg-sky-600 text-white font-bold px-3 py-1.5 rounded-lg flex-shrink-0 transition shadow-xs"
            >
              {copied ? '✅ Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6">
          {[
            { label: 'Total Services', value: services.length, icon: '🛠', grad: 'from-sky-400 to-blue-500' },
            { label: 'Total Orders',   value: bookings.length, icon: '📅', grad: 'from-blue-400 to-indigo-500' },
            { label: 'Confirmed',      value: bookings.filter((b) => b.status === 'confirmed').length, icon: '✅', grad: 'from-emerald-400 to-green-500' },
            { label: 'Pending Orders', value: pending,         icon: '⏳', grad: 'from-amber-400 to-yellow-500' },
          ].map((s, i) => (
            <div key={s.label} className={`glass rounded-2xl p-4 text-center animate-fade-up delay-${(i + 1) * 100}`}>
              <span className="text-xl mb-1 block">{s.icon}</span>
              <p className={`text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r ${s.grad}`}>
                {s.value}
              </p>
              <p className="text-slate-400 text-xs font-semibold mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs Bar */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`px-4 py-3 rounded-2xl font-extrabold text-xs transition-all flex items-center gap-2 flex-shrink-0 ${
                activeTab === tab.key
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-200 scale-102'
                  : 'bg-white text-slate-600 hover:bg-sky-50 hover:text-sky-700 border border-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge !== null && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                    activeTab === tab.key ? 'bg-white text-sky-600' : 'bg-sky-100 text-sky-700'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* TAB 1: Live Shop (Shopping Website Experience) */}
        {activeTab === 'preview' && profile && (
          <div className="space-y-6 animate-fade-up">
            {/* Control Bar for Shop Preview */}
            <div className="glass rounded-2xl p-5 border border-sky-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                  <span>🛍️</span> Your Customer Shopping Website
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  This is how customers browse your services, photos, and book appointments through your store link
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Device switch */}
                <div className="bg-sky-50 p-1 rounded-xl flex border border-sky-100">
                  <button
                    onClick={() => setPreviewDevice('desktop')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      previewDevice === 'desktop'
                        ? 'bg-sky-500 text-white shadow-sm'
                        : 'text-slate-500 hover:text-sky-600'
                    }`}
                  >
                    🖥️ Desktop
                  </button>
                  <button
                    onClick={() => setPreviewDevice('mobile')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      previewDevice === 'mobile'
                        ? 'bg-sky-500 text-white shadow-sm'
                        : 'text-slate-500 hover:text-sky-600'
                    }`}
                  >
                    📱 Mobile
                  </button>
                </div>

                <a
                  href={shopPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-shimmer text-xs px-4 py-2 rounded-xl font-bold flex items-center gap-1.5"
                >
                  <span>🚀</span> Open Full Store ↗
                </a>
              </div>
            </div>

            {/* Live Interactive Iframe Preview */}
            <div className="flex justify-center">
              <div
                className={`transition-all duration-300 w-full ${
                  previewDevice === 'mobile' ? 'max-w-[420px]' : 'max-w-6xl'
                }`}
              >
                <div className="glass rounded-3xl overflow-hidden shadow-2xl border-4 border-white/80">
                  {/* Browser Bar */}
                  <div className="bg-slate-100/90 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-rose-400"></div>
                        <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                        <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                      </div>
                      <div className="bg-white px-3 py-1 rounded-lg border border-slate-200 text-xs font-mono text-slate-500 max-w-[280px] sm:max-w-md truncate">
                        {shopUrl}
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-sky-600 bg-sky-100 px-2.5 py-0.5 rounded-full">
                      ● Live Interactive Store
                    </span>
                  </div>

                  <div className="relative bg-white" style={{ height: '700px' }}>
                    <iframe
                      src={shopPath}
                      className="w-full h-full border-0"
                      title="Customer Shopping Experience"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Profile Settings */}
        {activeTab === 'profile' && profile && (
          <div className="animate-fade-up">
            <ProfileSetupForm
              providerId={profile.id}
              initial={profile}
              onRefresh={() => fetchProfile(profile.id)}
            />
          </div>
        )}

        {/* TAB 3: Services / Products */}
        {activeTab === 'services' && profile && (
          <div className="animate-fade-up">
            <ServiceForm
              providerId={profile.id}
              services={services}
              onRefresh={() => fetchData(profile.id)}
            />
          </div>
        )}

        {/* TAB 4: Weekly Working Hours */}
        {activeTab === 'schedule' && profile && (
          <div className="animate-fade-up">
            <ScheduleForm
              providerId={profile.id}
              workingHours={workingHours}
              onRefresh={() => fetchData(profile.id)}
            />
          </div>
        )}

        {/* TAB 5: Bookings */}
        {activeTab === 'bookings' && profile && (
          <div className="animate-fade-up">
            <BookingsTable
              bookings={bookings}
              providerName={profile.business_name || profile.full_name}
              onRefresh={() => fetchData(profile.id)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
