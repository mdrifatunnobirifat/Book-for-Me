'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import ServiceForm from '../../components/provider/ServiceForm'
import ScheduleForm from '../../components/provider/ScheduleForm'
import BookingsTable from '../../components/provider/BookingsTable'

interface Profile {
  id: string
  full_name: string
  business_name: string | null
  slug: string | null
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
  const [loading, setLoading] = useState(true)
  const [showToast, setShowToast] = useState(true)
  const router = useRouter()
  const supabase = createClient()
  const [bookings, setBookings] = useState<Booking[]>([])


  const fetchData = async (userId: string) => {
  const [{ data: svc }, { data: wh }, { data: bk }] = await Promise.all([
    supabase.from('services').select('*').eq('provider_id', userId),
    supabase.from('working_hours').select('*').eq('provider_id', userId),
    supabase
      .from('bookings')
      .select(`
        id, booking_date, start_time, end_time, status, customer_notes,
        services (title, duration_minutes, price),
        customer:profiles!bookings_customer_id_fkey (id, full_name)
      `)
      .eq('provider_id', userId)
      .order('booking_date', { ascending: false }),
  ])
  setServices(svc || [])
  setWorkingHours(wh || [])
  setBookings((bk as unknown as Booking[]) || [])
}


  useEffect(() => {
    const init = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { router.push('/auth/login'); return }

      const { data: prof } = await supabase
        .from('profiles')
        .select('id, full_name, business_name, slug, role')
        .eq('id', authUser.id)
        .single()

      if (prof?.role !== 'provider') { router.push('/dashboard/customer'); return }

      setProfile(prof)
      await fetchData(authUser.id)
      setLoading(false)
    }

    init()
    const timer = setTimeout(() => setShowToast(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">

      {/* Toast */}
      {showToast && profile && (
        <div className="fixed top-5 right-5 z-50 animate-slide-in">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-5 py-4 shadow-2xl flex items-center gap-3 min-w-[260px]">
            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-lg">
              {profile.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Welcome back! 🎉</p>
              <p className="text-purple-300 text-xs mt-0.5">{profile.full_name}</p>
            </div>
            <div className="w-2 h-2 bg-green-400 rounded-full ml-auto animate-pulse"></div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">🏪 Provider Dashboard</h1>
            <p className="text-purple-300 mt-1">
              {profile?.business_name || profile?.full_name}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Stats */}
            <div className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-center">
              <p className="text-white font-bold text-lg">{services.length}</p>
              <p className="text-white/50 text-xs">Services</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-white/10 hover:bg-red-500/30 text-white px-4 py-2 rounded-xl transition border border-white/20"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Services */}
          {profile && (
            <ServiceForm
              providerId={profile.id}
              services={services}
              onRefresh={() => fetchData(profile.id)}
            />
          )}

          {/* Schedule */}
          {profile && (
            <ScheduleForm
              providerId={profile.id}
              workingHours={workingHours}
              onRefresh={() => fetchData(profile.id)}
            />
          )}
        </div>
        {/* Bookings Table — below services and schedule */}
{profile && (
  <div className="mt-6">
    <BookingsTable
      bookings={bookings}
      providerName={profile.business_name || profile.full_name}
      onRefresh={() => fetchData(profile.id)}
    />
  </div>
)}


        {/* Booking Link */}
<div className="mt-6 bg-purple-500/20 border border-purple-500/40 rounded-2xl p-5">
  <p className="text-purple-200 font-semibold mb-3">🔗 Your Public Booking Link</p>
  <div className="flex flex-col sm:flex-row gap-3">
    <input
      type="text"
      readOnly
      value={`${typeof window !== 'undefined' ? window.location.origin : ''}/book/${profile?.id}`}
      className="flex-1 bg-white/10 border border-white/20 text-white/70 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none"
    />
    <button
      onClick={() => {
        const link = `${window.location.origin}/book/${profile?.id}`
        navigator.clipboard.writeText(link)
        alert('Link copied!')
      }}
      className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl transition text-sm font-semibold"
    >
      Copy Link
    </button>
  </div>
  <p className="text-white/40 text-xs mt-2">
    Share this link so customers can book your services
  </p>
</div>


      </div>
    </div>
  )
}
