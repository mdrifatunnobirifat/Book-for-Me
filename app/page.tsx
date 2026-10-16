'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Home() {
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      router.push(p?.role === 'provider' ? '/dashboard/provider' : '/dashboard/customer')
    }
    check()
  }, [])

  return (
    <div className="sky-bg">
      {/* Decorative blobs */}
      <div className="absolute top-[-80px] left-[-80px] w-80 h-80 bg-sky-300/40 rounded-full animate-blob" />
      <div className="absolute top-[20%] right-[-60px] w-64 h-64 bg-blue-300/30 rounded-full animate-blob delay-300" />
      <div className="absolute bottom-[-60px] left-[30%] w-72 h-72 bg-sky-200/50 rounded-full animate-blob delay-500" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-16 flex flex-col items-center">

        {/* Nav */}
        <nav className="w-full flex items-center justify-between mb-20 animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="text-3xl">📅</span>
            <span className="text-2xl font-bold text-sky-700">BookIt</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/explore" className="text-sky-600 hover:text-sky-800 font-medium transition text-sm px-4 py-2 rounded-xl hover:bg-sky-100">
              Browse Providers
            </Link>
            <Link href="/auth/login" className="text-sky-600 hover:text-sky-800 font-medium transition text-sm px-4 py-2 rounded-xl hover:bg-sky-100">
              Sign In
            </Link>
            <Link href="/auth/signup" className="bg-sky-500 hover:bg-sky-600 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition shadow-lg shadow-sky-200 hover:-translate-y-0.5 active:translate-y-0">
              Get Started
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 bg-sky-100 text-sky-600 text-sm font-semibold px-4 py-2 rounded-full mb-6 animate-fade-up border border-sky-200">
            <span className="w-2 h-2 bg-sky-400 rounded-full animate-pulse"></span>
            Smart Appointment Booking Platform
          </div>
          <h1 className="text-6xl md:text-7xl font-black text-slate-800 mb-6 leading-tight animate-fade-up delay-100">
            Book Appointments<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-blue-600">
              Effortlessly
            </span>
          </h1>
          <p className="text-lg text-slate-500 max-w-xl mx-auto mb-10 animate-fade-up delay-200">
            Connect with top service providers, choose your perfect time slot,
            and manage all your bookings in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-up delay-300">
            <Link href="/auth/signup?role=provider"
              className="btn-shimmer px-8 py-4 text-base inline-block text-center">
              🏪 Start as Provider
            </Link>
            <Link href="/auth/signup?role=customer"
              className="bg-white hover:bg-sky-50 text-sky-700 font-bold px-8 py-4 rounded-xl border-2 border-sky-200 transition shadow-lg hover:-translate-y-0.5 text-base inline-block text-center">
              👤 Find a Service →
            </Link>
          </div>
        </div>

        {/* Floating Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-20">
          {[
            { icon:'⚡', title:'Instant Booking', desc:'Select a time slot and book within seconds — no calls needed.', delay:'delay-100', anim:'animate-float' },
            { icon:'🔒', title:'No Double-Booking', desc:'Smart conflict detection ensures your slot is always secure.', delay:'delay-200', anim:'animate-float-delayed' },
            { icon:'📧', title:'Email Updates', desc:'Get notified every time your booking status changes.', delay:'delay-300', anim:'animate-float' },
          ].map(f => (
            <div key={f.title} className={`glass rounded-2xl p-6 text-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300 animate-fade-up ${f.delay}`}>
              <div className={`text-5xl mb-4 inline-block ${f.anim}`}>{f.icon}</div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">{f.title}</h3>
              <p className="text-slate-500 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl mb-16">
          <div className="glass rounded-2xl p-8 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 animate-slide-left border-t-4 border-sky-400">
            <div className="text-5xl mb-4 animate-float">🏪</div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">For Providers</h2>
            <p className="text-slate-500 text-sm mb-6">
              Set your schedule, list your services, manage bookings, and grow your business — all from one dashboard.
            </p>
            <ul className="text-sm text-slate-600 space-y-2 mb-6">
              {['Custom working hours','Multiple services','Booking management','Email notifications'].map(i => (
                <li key={i} className="flex items-center gap-2"><span className="text-sky-500 font-bold">✓</span>{i}</li>
              ))}
            </ul>
            <Link href="/auth/signup?role=provider" className="w-full btn-shimmer text-center block py-3 text-sm rounded-xl">
              Get Started Free →
            </Link>
          </div>

          <div className="glass rounded-2xl p-8 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 animate-slide-right border-t-4 border-blue-400">
            <div className="text-5xl mb-4 animate-float-delayed">👤</div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">For Customers</h2>
            <p className="text-slate-500 text-sm mb-6">
              Discover great service providers, pick the perfect slot, and book your appointment in just a few clicks.
            </p>
            <ul className="text-sm text-slate-600 space-y-2 mb-6">
              {['Browse all providers','Real-time availability','Instant confirmation','Track appointments'].map(i => (
                <li key={i} className="flex items-center gap-2"><span className="text-blue-500 font-bold">✓</span>{i}</li>
              ))}
            </ul>
            <Link href="/explore" className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold text-center block py-3 text-sm rounded-xl transition shadow-lg shadow-blue-100 hover:-translate-y-0.5">
              Find a Provider →
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 w-full max-w-2xl animate-fade-up">
          {[
            { value: '100%', label: 'Free to Start' },
            { value: '0', label: 'No hidden fees' },
            { value: '24/7', label: 'Always available' },
          ].map(s => (
            <div key={s.label} className="glass rounded-2xl p-5 text-center">
              <p className="text-3xl font-black text-sky-600">{s.value}</p>
              <p className="text-slate-500 text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p className="text-slate-400 text-sm mt-16 animate-fade-in">
          © 2025 BookIt · Made with 💙
        </p>
      </div>
    </div>
  )
}
