'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ name: string } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', data.user.id).single()
    setToast({ name: profile?.full_name || 'User' })
    setTimeout(() => {
      router.push(profile?.role === 'provider' ? '/dashboard/provider' : '/dashboard/customer')
    }, 1500)
  }

  return (
    <div className="sky-bg flex items-center justify-center min-h-screen p-4">
      {/* Blobs */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-sky-200/60 rounded-full blur-3xl animate-blob" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-200/50 rounded-full blur-3xl animate-blob delay-300" />

      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 animate-bounce-in">
          <div className="glass rounded-2xl px-5 py-4 shadow-2xl flex items-center gap-3 min-w-[260px] border-l-4 border-sky-400">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              {toast.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-slate-800 font-semibold text-sm">Login successful! 🎉</p>
              <p className="text-sky-500 text-xs mt-0.5">Welcome back, {toast.name}!</p>
            </div>
            <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0 ml-auto animate-pulse"></div>
          </div>
        </div>
      )}

      <div className="relative z-10 w-full max-w-md animate-fade-up">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 hover:opacity-80 transition">
            <span className="text-4xl">📅</span>
            <span className="text-3xl font-black text-sky-700">BookIt</span>
          </Link>
          <p className="text-slate-500 mt-2 text-sm">Welcome back! Sign in to continue.</p>
        </div>

        <div className="glass rounded-2xl p-8 shadow-xl">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">Sign In</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-5 text-sm flex items-center gap-2 animate-fade-in">
              <span>❌</span> {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-slate-600 text-sm font-semibold mb-2">Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="you@example.com" className="sky-input" />
            </div>
            <div>
              <label className="block text-slate-600 text-sm font-semibold mb-2">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="••••••••" className="sky-input" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full btn-shimmer mt-2 py-3.5 text-sm disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Signing in...
                </span>
              ) : 'Sign In →'}
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-6">
            New here?{' '}
            <Link href="/auth/signup" className="text-sky-500 hover:text-sky-700 font-semibold transition">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
