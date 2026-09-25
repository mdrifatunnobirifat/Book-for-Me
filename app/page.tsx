'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Home() {
  const supabase = createClient()
  const router = useRouter()

  // ✅ If user is already logged in → redirect to their dashboard
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profile?.role === 'provider') {
          router.push('/dashboard/provider')
        } else {
          router.push('/dashboard/customer')
        }
      }
    }
    checkUser()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-4">

      {/* Hero */}
      <div className="text-center mb-12">
        <h1 className="text-6xl font-bold text-white mb-4">📅 BookIt</h1>
        <p className="text-xl text-purple-300 mb-2">
          The smart way to manage appointments
        </p>
        <p className="text-white/50 max-w-md mx-auto text-sm">
          Whether you run a business or need to book a service —
          BookIt connects providers and customers seamlessly.
        </p>
      </div>

      {/* Role Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl mb-10">

        {/* Provider Card */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 text-center hover:bg-white/15 transition-all duration-300">
          <div className="text-5xl mb-4">🏪</div>
          <h2 className="text-xl font-bold text-white mb-2">I am a Provider</h2>
          <p className="text-white/60 text-sm mb-4">
            Set your schedule, manage services, and accept bookings from customers.
          </p>
          {/* ✅ Passes role=provider in URL */}
          <Link
            href="/auth/signup?role=provider"
            className="inline-block bg-purple-600 hover:bg-purple-500 text-white font-semibold px-6 py-2.5 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/30"
          >
            Get Started Free →
          </Link>
        </div>

        {/* Customer Card */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 text-center hover:bg-white/15 transition-all duration-300">
          <div className="text-5xl mb-4">👤</div>
          <h2 className="text-xl font-bold text-white mb-2">I am a Customer</h2>
          <p className="text-white/60 text-sm mb-4">
            Browse providers, pick your time slot, and book appointments instantly.
          </p>
          {/* ✅ Passes role=customer in URL */}
          <Link
            href="/auth/signup?role=customer"
            className="inline-block bg-white/20 hover:bg-white/30 text-white font-semibold px-6 py-2.5 rounded-xl transition-all duration-200"
          >
            Find a Provider →
          </Link>
        </div>

      </div>

      {/* Bottom Links */}
      <div className="flex flex-col items-center gap-3">
        <Link
          href="/explore"
          className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-8 py-3 rounded-xl transition-all duration-200"
        >
          🔍 Browse All Providers
        </Link>
        <p className="text-white/50 text-sm">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-purple-300 hover:text-purple-200 font-medium transition">
            Sign in here
          </Link>
        </p>
      </div>

    </div>
  )
}
