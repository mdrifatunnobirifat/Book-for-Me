import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

interface Provider {
  id: string; full_name: string; business_name: string | null; bio: string | null; slug: string | null
  services: { id: string; title: string; price: number; duration_minutes: number }[]
}

export default async function ExplorePage() {
  const supabase = await createClient()
  const { data: providers } = await supabase
    .from('profiles')
    .select('id, full_name, business_name, bio, slug, services(id, title, price, duration_minutes)')
    .eq('role', 'provider')
    .order('created_at', { ascending: false })

  const colors = ['from-sky-400 to-blue-500','from-blue-400 to-indigo-500','from-cyan-400 to-sky-500','from-indigo-400 to-blue-600']

  return (
    <div className="sky-bg min-h-screen">
      <div className="absolute top-0 left-0 w-96 h-96 bg-sky-200/40 rounded-full blur-3xl animate-blob" />
      <div className="absolute top-1/2 right-0 w-80 h-80 bg-blue-200/30 rounded-full blur-3xl animate-blob delay-300" />

      <nav className="relative z-10 border-b border-sky-100 bg-white/70 backdrop-blur-md px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">📅</span>
            <span className="text-xl font-black text-sky-700">BookIt</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-slate-500 hover:text-sky-600 font-medium text-sm transition">Sign In</Link>
            <Link href="/auth/signup" className="btn-shimmer text-sm px-5 py-2.5">Get Started</Link>
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-6xl mx-auto p-6 pt-12">
        <div className="text-center mb-12 animate-fade-up">
          <div className="inline-flex items-center gap-2 bg-sky-100 text-sky-600 text-sm font-semibold px-4 py-2 rounded-full mb-4 border border-sky-200">
            🔍 Browse Providers
          </div>
          <h1 className="text-4xl font-black text-slate-800 mb-3">Find Your Perfect Provider</h1>
          <p className="text-slate-500">Book appointments with top-rated service professionals near you</p>
        </div>

        {!providers || providers.length === 0 ? (
          <div className="text-center py-20 glass rounded-2xl animate-fade-up">
            <p className="text-6xl mb-4">🔍</p>
            <p className="text-slate-600 text-xl font-semibold mb-2">No providers yet</p>
            <p className="text-slate-400 mb-6 text-sm">Be the first to join as a provider!</p>
            <Link href="/auth/signup?role=provider" className="btn-shimmer inline-block px-6 py-3 text-sm">
              Join as Provider →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {(providers as Provider[]).map((provider, idx) => (
              <div key={provider.id}
                className={`glass rounded-2xl overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 animate-fade-up delay-${(idx % 4 + 1) * 100}`}>
                {/* Color Header */}
                <div className={`bg-gradient-to-r ${colors[idx % colors.length]} p-5 relative overflow-hidden`}>
                  <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white font-black text-2xl border-2 border-white/30">
                    {provider.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="mt-3">
                    <h2 className="text-white font-bold text-lg leading-tight">{provider.business_name || provider.full_name}</h2>
                    <p className="text-white/80 text-xs">{provider.full_name}</p>
                  </div>
                </div>

                <div className="p-5">
                  {provider.bio && <p className="text-slate-500 text-sm mb-4 line-clamp-2">{provider.bio}</p>}

                  <p className="text-slate-400 text-xs uppercase tracking-wide font-semibold mb-2">
                    Services ({provider.services?.length || 0})
                  </p>
                  {provider.services?.length > 0 ? (
                    <div className="space-y-2 mb-4">
                      {provider.services.slice(0, 3).map(svc => (
                        <div key={svc.id} className="flex justify-between items-center bg-sky-50 rounded-lg px-3 py-2">
                          <span className="text-slate-700 text-sm font-medium">{svc.title}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 text-xs">{svc.duration_minutes}m</span>
                            <span className="text-sky-600 text-sm font-bold">${Number(svc.price).toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                      {provider.services.length > 3 && (
                        <p className="text-slate-400 text-xs text-center">+{provider.services.length - 3} more services</p>
                      )}
                    </div>
                  ) : <p className="text-slate-300 text-xs mb-4">No services listed yet</p>}

                  <Link href={`/book/${provider.slug || provider.id}`}
                    className="w-full btn-shimmer text-center block py-2.5 text-sm rounded-xl">
                    Book Appointment →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
