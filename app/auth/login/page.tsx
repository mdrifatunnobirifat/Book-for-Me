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
  const [toast, setToast] = useState<{ message: string; name: string } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Step 1: Sign in
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Step 2: Get user profile (name + role)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', data.user.id)
      .single()

    const userName = profile?.full_name || 'User'
    const userRole = profile?.role || 'customer'

    // Step 3: Show toast with username
    setToast({ message: 'Login successful!', name: userName })

    // Step 4: Redirect after 1.5 seconds (so user sees the toast)
    setTimeout(() => {
      if (userRole === 'provider') {
        router.push('/dashboard/provider')
      } else {
        router.push('/dashboard/customer')
      }
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      
     
      <div className="w-full max-w-md">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">📅 BookIt</h1>
          <p className="text-purple-300">Welcome back! Sign in to continue.</p>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-6">Sign In</h2>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg mb-4 text-sm">
              ❌ {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-purple-200 text-sm font-medium mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full bg-white/10 border border-white/30 text-white placeholder-white/40 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-purple-200 text-sm font-medium mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-white/10 border border-white/30 text-white placeholder-white/40 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/30 mt-2"
            >
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

          <p className="text-center text-white/60 text-sm mt-6">
            New here?{' '}
            <Link href="/auth/signup" className="text-purple-300 hover:text-purple-200 font-medium transition">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
