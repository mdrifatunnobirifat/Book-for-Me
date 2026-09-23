import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

interface Provider {
  id: string
  full_name: string
  business_name: string | null
  bio: string | null
  slug: string | null
  services: { id: string; title: string; price: number; duration_minutes: number }[]
}

export default async function ExplorePage() {
  const supabase = await createClient()

  // Fetch all providers with their services
  const { data: providers } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      business_name,
      bio,
      slug,
      services (id, title, price, duration_minutes)
    `)
    .eq('role', 'provider')
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">

      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-white">📅 BookIt</Link>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="text-white/70 hover:text-white text-sm transition"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="bg-purple-600 hover:bg-purple-500 text-white text-sm px-4 py-2 rounded-xl transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">

        {/* Page Title */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-3">Find a Provider</h1>
          <p className="text-purple-300 text-lg">
            Browse service providers and book your appointment instantly
          </p>
        </div>

        {/* Providers Grid */}
        {!providers || providers.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-6xl mb-4">🔍</p>
            <p className="text-white text-xl font-semibold mb-2">No providers yet</p>
            <p className="text-white/50 text-sm mb-6">
              Be the first provider to join BookIt!
            </p>
            <Link
              href="/auth/signup"
              className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl transition font-semibold"
            >
              Join as Provider
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {(providers as Provider[]).map((provider) => (
              <div
                key={provider.id}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 hover:bg-white/15 hover:border-purple-500/50 transition-all duration-300 flex flex-col"
              >
                {/* Provider Info */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                    {provider.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-white font-bold">
                      {provider.business_name || provider.full_name}
                    </h2>
                    <p className="text-purple-300 text-xs">{provider.full_name}</p>
                  </div>
                </div>

                {/* Bio */}
                {provider.bio && (
                  <p className="text-white/60 text-sm mb-4 line-clamp-2">{provider.bio}</p>
                )}

                {/* Services Preview */}
                <div className="flex-1 mb-4">
                  <p className="text-white/40 text-xs uppercase tracking-wide mb-2">
                    Services ({provider.services?.length || 0})
                  </p>
                  {provider.services?.length > 0 ? (
                    <div className="space-y-1.5">
                      {provider.services.slice(0, 3).map((svc) => (
                        <div key={svc.id} className="flex justify-between items-center">
                          <span className="text-white/80 text-sm">{svc.title}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-white/40 text-xs">{svc.duration_minutes}m</span>
                            <span className="text-purple-300 text-sm font-medium">
                              ${Number(svc.price).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                      {provider.services.length > 3 && (
                        <p className="text-white/30 text-xs">
                          +{provider.services.length - 3} more services
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-white/30 text-xs">No services listed yet</p>
                  )}
                </div>

                {/* Book Button */}
                <Link
                  href={`/book/${provider.slug || provider.id}`}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white text-center font-semibold py-2.5 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/30 text-sm"
                >
                  Book Appointment →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
