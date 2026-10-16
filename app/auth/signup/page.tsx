'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function SignupForm() {
  const searchParams = useSearchParams()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'customer' | 'provider'>('customer')
  const [businessName, setBusinessName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const r = searchParams.get('role')
    if (r === 'provider' || r === 'customer') setRole(r)
  }, [searchParams])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName, role, business_name: role === 'provider' ? businessName : null } },
    })
    if (error) { setError(error.message); setLoading(false); return }
    router.push(role === 'provider' ? '/dashboard/provider' : '/dashboard/customer')
  }

  return (
    <div className="glass rounded-2xl p-8 shadow-xl animate-fade-up">
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Create Account</h2>
      <p className="text-slate-400 text-sm mb-6">Use a real email — you'll need it to confirm your account.</p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-5 text-sm flex items-center gap-2 animate-fade-in">
          <span>❌</span> {error}
        </div>
      )}

      {/* Role Selector */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { val: 'customer' as const, icon: '👤', label: 'Customer' },
          { val: 'provider' as const, icon: '🏪', label: 'Provider' },
        ].map(r => (
          <button key={r.val} type="button" onClick={() => setRole(r.val)}
            className={`py-4 px-4 rounded-xl border-2 font-semibold transition-all duration-300 text-sm flex flex-col items-center gap-1 ${
              role === r.val
                ? 'bg-sky-500 border-sky-400 text-white shadow-lg shadow-sky-200 scale-105'
                : 'bg-white border-slate-200 text-slate-600 hover:border-sky-300 hover:bg-sky-50'
            }`}>
            <span className="text-2xl">{r.icon}</span>
            {r.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label className="block text-slate-600 text-sm font-semibold mb-2">Full Name</label>
          <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required
            placeholder="Your full name" className="sky-input" />
        </div>
        {role === 'provider' && (
          <div className="animate-fade-up">
            <label className="block text-slate-600 text-sm font-semibold mb-2">Business Name</label>
            <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)} required
              placeholder="e.g. Alex Barbershop" className="sky-input" />
          </div>
        )}
        <div>
          <label className="block text-slate-600 text-sm font-semibold mb-2">
            Email Address
            <span className="ml-2 text-xs font-normal text-sky-500 bg-sky-50 px-2 py-0.5 rounded-full">Use a real email</span>
          </label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
            placeholder="you@gmail.com" className="sky-input" />
        </div>
        <div>
          <label className="block text-slate-600 text-sm font-semibold mb-2">Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
            placeholder="Min. 6 characters" minLength={6} className="sky-input" />
        </div>
        <button type="submit" disabled={loading}
          className="w-full btn-shimmer py-3.5 text-sm mt-2 disabled:opacity-60 disabled:cursor-not-allowed">
          {loading ? 'Creating account...' : `Create ${role === 'provider' ? 'Provider' : 'Customer'} Account →`}
        </button>
      </form>

      <p className="text-center text-slate-500 text-sm mt-6">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-sky-500 hover:text-sky-700 font-semibold transition">Sign in</Link>
      </p>
    </div>
  )
}

export default function SignupPage() {
  return (
    <div className="sky-bg flex items-center justify-center min-h-screen p-4">
      <div className="absolute top-0 right-0 w-80 h-80 bg-sky-200/60 rounded-full blur-3xl animate-blob" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-200/50 rounded-full blur-3xl animate-blob delay-300" />
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8 animate-fade-up">
          <Link href="/" className="inline-flex items-center gap-2 hover:opacity-80 transition">
            <span className="text-4xl">📅</span>
            <span className="text-3xl font-black text-sky-700">BookIt</span>
          </Link>
          <p className="text-slate-500 mt-2 text-sm">Join thousands of users booking smarter.</p>
        </div>
        <Suspense fallback={
          <div className="glass rounded-2xl p-8 text-center animate-pulse">
            <div className="text-slate-400">Loading...</div>
          </div>
        }>
          <SignupForm />
        </Suspense>
      </div>
    </div>
  )
}
