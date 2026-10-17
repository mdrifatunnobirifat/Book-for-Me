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
  const [confirmNotice, setConfirmNotice] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const r = searchParams.get('role')
    if (r === 'provider' || r === 'customer') setRole(r)
  }, [searchParams])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setConfirmNotice(false)

    try {
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role,
            business_name: role === 'provider' ? businessName : null,
          },
        },
      })

      if (signUpErr) {
        throw signUpErr
      }

      // If session exists immediately (e.g. email confirmation turned off)
      if (data.session) {
        router.push(role === 'provider' ? '/dashboard/provider' : '/dashboard/customer')
        return
      }

      // Try instant sign in
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (!signInErr) {
        router.push(role === 'provider' ? '/dashboard/provider' : '/dashboard/customer')
      } else {
        setConfirmNotice(true)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Signup failed. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass rounded-3xl p-8 shadow-2xl border border-sky-100 animate-fade-up">
      <h2 className="text-2xl font-black text-slate-800 mb-1">Create Account</h2>
      <p className="text-slate-400 text-xs mb-5">
        Join BookIt to schedule services or start your online appointment store.
      </p>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-2xl mb-5 text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <span>❌</span> {error}
        </div>
      )}

      {confirmNotice && (
        <div className="bg-sky-50 border border-sky-200 text-sky-800 px-4 py-3.5 rounded-2xl mb-5 text-xs space-y-2 animate-fade-in">
          <p className="font-extrabold text-sm flex items-center gap-2">
            <span>📬</span> Verification Email Sent!
          </p>
          <p>
            Please check your inbox at <strong>{email}</strong> and click the confirmation link to activate your account.
          </p>
          <p className="text-[11px] text-slate-500 pt-1 border-t border-sky-100">
            💡 <strong>Testing tip:</strong> In Supabase Dashboard → Authentication → Providers → Email, you can disable &ldquo;Confirm email&rdquo; to enable instant sign-ins without waiting for emails.
          </p>
        </div>
      )}

      {/* Role Selector */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {[
          { val: 'customer' as const, icon: '👤', label: 'Customer', desc: 'Book appointments' },
          { val: 'provider' as const, icon: '🏪', label: 'Provider / Shop', desc: 'Manage & sell services' },
        ].map((r) => (
          <button
            key={r.val}
            type="button"
            onClick={() => setRole(r.val)}
            className={`py-3.5 px-3 rounded-2xl border-2 font-bold transition-all text-left flex flex-col gap-0.5 ${
              role === r.val
                ? 'bg-sky-500 border-sky-400 text-white shadow-lg shadow-sky-200 scale-102'
                : 'bg-white border-slate-200 text-slate-600 hover:border-sky-300 hover:bg-sky-50'
            }`}
          >
            <span className="text-2xl mb-1">{r.icon}</span>
            <span className="text-xs font-black">{r.label}</span>
            <span className={`text-[10px] ${role === r.val ? 'text-sky-100' : 'text-slate-400'}`}>
              {r.desc}
            </span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSignup} className="space-y-3.5">
        <div>
          <label className="block text-slate-700 text-xs font-bold mb-1 uppercase tracking-wide">
            Full Name *
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            placeholder="John Doe"
            className="sky-input text-sm"
          />
        </div>

        {role === 'provider' && (
          <div className="animate-fade-up">
            <label className="block text-slate-700 text-xs font-bold mb-1 uppercase tracking-wide">
              Shop / Business Name *
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
              placeholder="e.g. Master Cuts Barber Studio"
              className="sky-input text-sm"
            />
          </div>
        )}

        <div>
          <label className="block text-slate-700 text-xs font-bold mb-1 uppercase tracking-wide">
            Email Address *
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="youremail@example.com"
            className="sky-input text-sm"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            Enter a valid email format (e.g. user@gmail.com).
          </p>
        </div>

        <div>
          <label className="block text-slate-700 text-xs font-bold mb-1 uppercase tracking-wide">
            Password *
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            placeholder="Minimum 6 characters"
            className="sky-input text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-shimmer py-3.5 text-sm font-bold mt-2 disabled:opacity-60 rounded-xl"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Creating your account...
            </span>
          ) : (
            `Create ${role === 'provider' ? 'Provider Shop' : 'Customer'} Account →`
          )}
        </button>
      </form>

      <p className="text-center text-slate-500 text-xs mt-6">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-sky-600 hover:text-sky-800 font-extrabold transition">
          Sign In
        </Link>
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
        <div className="text-center mb-6 animate-fade-up">
          <Link href="/" className="inline-flex items-center gap-2 hover:opacity-85 transition">
            <span className="text-4xl">📅</span>
            <span className="text-3xl font-black text-sky-700 tracking-tight">BookIt</span>
          </Link>
          <p className="text-slate-500 mt-1 text-xs">Modern Appointment & Shopping Marketplace</p>
        </div>
        <Suspense
          fallback={
            <div className="glass rounded-3xl p-8 text-center animate-pulse">
              <div className="text-slate-400 text-sm">Loading signup form...</div>
            </div>
          }
        >
          <SignupForm />
        </Suspense>
      </div>
    </div>
  )
}
