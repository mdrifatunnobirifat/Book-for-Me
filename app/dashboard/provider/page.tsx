'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ProviderDashboard() {
  const [user, setUser] = useState<{ full_name: string; business_name: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  // ✅ Simple Toast Component (no extra library needed)
function Toast({ message, name }: { message: string; name: string }) {
  return (
    <div className="fixed top-5 right-5 z-50 animate-slide-in">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-5 py-4 shadow-2xl flex items-center gap-3 min-w-[260px]">
        {/* Avatar Circle */}
        <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
          {name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-white font-semibold text-sm">{message}</p>
          <p className="text-purple-300 text-xs mt-0.5">Welcome back, {name}! 👋</p>
        </div>
        {/* Green dot */}
        <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0 ml-auto animate-pulse"></div>
      </div>
    </div>
  )
}

  useEffect(() => {
    const getUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (!authUser) {
        router.push('/auth/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, business_name, role')
        .eq('id', authUser.id)
        .single()

      setUser(profile)
      setLoading(false)
    }

    getUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">🏪 Provider Dashboard</h1>
            <p className="text-purple-300 mt-1">
              Welcome, <span className="font-semibold text-white">{user?.full_name}</span>
              {user?.business_name && (
                <span className="text-white/50"> · {user.business_name}</span>
              )}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-white/10 hover:bg-red-500/30 text-white px-4 py-2 rounded-xl transition border border-white/20"
          >
            Sign Out
          </button>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { icon: '🛠️', label: 'My Services', desc: 'Add & manage your services' },
            { icon: '🗓️', label: 'My Schedule', desc: 'Set working hours & off days' },
            { icon: '📋', label: 'Bookings', desc: 'View incoming appointments' },
          ].map((card) => (
            <div key={card.label}
              className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 text-center hover:bg-white/15 transition-all duration-300 cursor-pointer">
              <div className="text-4xl mb-3">{card.icon}</div>
              <h3 className="text-white font-semibold mb-1">{card.label}</h3>
              <p className="text-white/50 text-sm">{card.desc}</p>
              <span className="inline-block mt-3 text-xs bg-purple-500/30 text-purple-300 px-3 py-1 rounded-full">
                Coming Soon
              </span>
            </div>
          ))}
        </div>

        {/* Success Banner */}
        <div className="bg-green-500/20 border border-green-500/40 rounded-2xl p-5 text-center">
          <p className="text-green-300 font-semibold text-lg">✅ You are logged in as a Provider!</p>
          <p className="text-green-200/70 text-sm mt-1">
            Full dashboard features coming in Day 3.
          </p>
        </div>

      </div>
    </div>
  )
}
