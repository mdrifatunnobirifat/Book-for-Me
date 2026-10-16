'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import ServiceForm from '@/app/components/provider/ServiceForm'
import ScheduleForm from '@/app/components/provider/ScheduleForm'
import BookingsTable from '@/app/components/provider/BookingsTable'
import Link from 'next/link'

interface Profile { id: string; full_name: string; business_name: string | null; slug: string | null }
interface Service { id: string; title: string; duration_minutes: number; price: number; description: string | null; is_active: boolean }
interface WorkingHour { id: string; day_of_week: number; start_time: string; end_time: string; is_day_off: boolean }
interface Booking {
  id: string; booking_date: string; start_time: string; end_time: string; status: string; customer_notes: string | null
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
  const [activeTab, setActiveTab] = useState<'overview' | 'bookings'>('overview')
  const router = useRouter()
  const supabase = createClient()

  const fetchData = async (userId: string) => {
    const [{ data: svc }, { data: wh }, { data: bk }] = await Promise.all([
      supabase.from('services').select('*').eq('provider_id', userId),
      supabase.from('working_hours').select('*').eq('provider_id', userId),
      supabase.from('bookings')
        .select('id, booking_date, start_time, end_time, status, customer_notes, services(title, duration_minutes, price), customer:profiles!bookings_customer_id_fkey(id, full_name)')
        .eq('provider_id', userId).order('booking_date', { ascending: false }),
    ])
    setServices(svc || [])
    setWorkingHours(wh || [])
    setBookings((bk as unknown as Booking[]) || [])
  }

  useEffect(() => {
    const init = async () => {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) { router.push('/auth/login'); return }
      const { data: prof } = await supabase.from('profiles').select('id, full_name, business_name, slug, role').eq('id', u.id).single()
      if (prof?.role !== 'provider') { router.push('/dashboard/customer'); return }
      setProfile(prof)
      await fetchData(u.id)
      setLoading(false)
    }
    init()
    const t = setTimeout(() => setShowToast(false), 3000)
    return () => clearTimeout(t)
  }, [])

  const pending = bookings.filter(b => b.status === 'pending').length
  const confirmed = bookings.filter(b => b.status === 'confirmed').length
  const total = bookings.length

  if (loading) return (
    <div className="sky-bg min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sky-600 font-medium">Loading dashboard...</p>
      </div>
    </div>
  )

  return (
    <div className="sky-bg min-h-screen">
      <div className="absolute top-0 right-0 w-80 h-80 bg-sky-200/30 rounded-full blur-3xl" />

      {showToast && profile && (
        <div className="fixed top-5 right-5 z-50 animate-bounce-in">
          <div className="glass rounded-2xl px-5 py-4 shadow-2xl flex items-center gap-3 min-w-[260px] border-l-4 border-sky-400">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              {profile.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-slate-800 font-semibold text-sm">Welcome back! 🎉</p>
              <p className="text-sky-500 text-xs mt-0.5">{profile.full_name}</p>
            </div>
            <div className="w-2 h-2 bg-green-400 rounded-full ml-auto animate-pulse"></div>
          </div>
        </div>
      )}

      <nav className="relative z-10 bg-white/80 backdrop-blur-md border-b border-sky-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">📅</span>
            <span className="text-xl font-black text-sky-700">BookIt</span>
          </Link>
          <div className="flex items-center gap-3">
            {pending > 0 && (
              <span className="bg-amber-100 text-amber-600 text-xs font-bold px-3 py-1.5 rounded-full border border-amber-200 animate-pulse">
                {pending} pending
              </span>
            )}
            <button onClick={async () => { await supabase.auth.signOut(); router.push('/auth/login') }}
              className="text-slate-500 hover:text-red-500 text-sm font-medium transition px-3 py-2 rounded-lg hover:bg-red-50">
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 animate-fade-up">
          <div>
            <h1 className="text-3xl font-black text-slate-800">🏪 Provider Dashboard</h1>
            <p className="text-slate-500 mt-1">{profile?.business_name || profile?.full_name}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Services', value: services.length, color: 'from-sky-400 to-blue-500', icon: '🛠' },
            { label: 'Total Bookings', value: total, color: 'from-blue-400 to-indigo-500', icon: '📅' },
            { label: 'Confirmed', value: confirmed, color: 'from-green-400 to-emerald-500', icon: '✅' },
            { label: 'Pending', value: pending, color: 'from-amber-400 to-yellow-500', icon: '⏳' },
          ].map((s, i) => (
            <div key={s.label} className={`glass rounded-2xl p-5 text-center animate-fade-up delay-${(i+1)*100} hover:-translate-y-0.5 transition-all cursor-default`}>
              <span className="text-2xl mb-1 block">{s.icon}</span>
              <p className={`text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r ${s.color}`}>{s.value}</p>
              <p className="text-slate-500 text-xs mt-1 font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { key: 'overview', label: 'Setup & Schedule' },
            { key: 'bookings', label: `Bookings ${pending > 0 ? `(${pending} new)` : ''}` },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as 'overview' | 'bookings')}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                activeTab === tab.key
                  ? 'bg-sky-800 text-white shadow-lg shadow-sky-200'
                  : 'bg-blue-700 text-black hover:bg-sky-50 hover:text-sky-600 border border-slate-200'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-up">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {profile && <ServiceForm providerId={profile.id} services={services} onRefresh={() => fetchData(profile.id)} />}
              {profile && <ScheduleForm providerId={profile.id} workingHours={workingHours} onRefresh={() => fetchData(profile.id)} />}
            </div>

            {/* Booking Link */}
            <div className="glass rounded-2xl p-5 border-t-4 border-sky-900">
              <p className="text-slate-800 font-bold mb-3 flex items-center gap-2">🔗 Your Public Booking Link</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input type="text" readOnly
                  value={typeof window !== 'undefined' ? `${window.location.origin}/book/${profile?.id}` : ''}
                  className="flex-1 sky-input font-mono text-sm text-slate-500" />
                <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/book/${profile?.id}`); alert('Copied!') }}
                  className="btn-shimmer px-5 py-2.5 text-sm flex-shrink-0">
                  Copy Link
                </button>
              </div>
              <p className="text-black text-xs mt-2">Share this link so customers can book your services</p>
            </div>
          </div>
        )}

        {activeTab === 'bookings' && profile && (
          <div className="animate-fade-up">
            <BookingsTable bookings={bookings} providerName={profile.business_name || profile.full_name} onRefresh={() => fetchData(profile.id)} />
          </div>
        )}
      </div>
    </div>
  )
}
