import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

interface Provider {
  id: string
  full_name: string
  business_name: string | null
  bio: string | null
  slug: string | null
  phone: string | null
  location: string | null
  avatar_url: string | null
  category: string | null
  services: { id: string; title: string; price: number; duration_minutes: number }[]
}

const CATEGORY_ICONS: Record<string, string> = {
  'Barbershop & Hair': '✂️', 'Beauty & Spa': '💆', 'Fitness & Gym': '🏋️',
  'Medical & Health': '🏥', 'Legal & Consulting': '⚖️', 'Home Services': '🔧',
  'Photography': '📷', 'Education & Tutoring': '📚', 'Automotive': '🚗',
  'Pet Care': '🐾', 'Food & Catering': '🍽️', 'Other': '🌟',
}

const GRAD_COLORS = [
  'from-sky-400 to-blue-500',
  'from-violet-400 to-purple-500',
  'from-emerald-400 to-teal-500',
  'from-rose-400 to-pink-500',
  'from-amber-400 to-orange-500',
  'from-cyan-400 to-sky-500',
]

export default async function ExplorePage() {
  const supabase = await createClient()
  const { data: rawProviders } = await supabase
    .from('profiles')
    .select('id, full_name, business_name, bio, slug, phone, location, avatar_url, category, services(id, title, price, duration_minutes)')
    .eq('role', 'provider')
    .order('created_at', { ascending: false })

  const providers = (rawProviders || []) as Provider[]

  const minPrice = (svcs: Provider['services']) =>
    svcs?.length ? Math.min(...svcs.map(s => Number(s.price))) : null

  return (
    <div className="sky-bg min-h-screen">
      {/* BG blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-sky-200/40 rounded-full blur-3xl animate-blob" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-blue-200/30 rounded-full blur-3xl animate-blob delay-300" />

      {/* Nav */}
      <nav className="relative z-10 border-b border-sky-100 bg-white/80 backdrop-blur-md px-6 py-4 sticky top-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">📅</span>
            <span className="text-xl font-black text-sky-700">BookforMe</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/auth/login" className="text-slate-500 hover:text-sky-600 font-medium text-sm px-4 py-2 rounded-xl hover:bg-sky-50 transition">Sign In</Link>
            <Link href="/auth/signup" className="btn-shimmer text-sm px-5 py-2.5">Get Started</Link>
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-10">
        {/* Hero */}
        <div className="text-center mb-10 animate-fade-up">
          <div className="inline-flex items-center gap-2 bg-sky-100 text-sky-600 text-sm font-semibold px-4 py-2 rounded-full mb-4 border border-sky-200">
            🛍️ {providers.length} Service Providers Available
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-800 mb-3">
            Find & Book Your<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-blue-600">
              Perfect Service
            </span>
          </h1>
          <p className="text-slate-500 max-w-xl mx-auto">
            Browse top-rated providers, compare services, and book your appointment instantly — just like online shopping.
          </p>
        </div>

        {/* Provider Grid — like Amazon/Shopify product grid */}
        {providers.length === 0 ? (
          <div className="text-center py-20 glass rounded-2xl animate-fade-up">
            <p className="text-6xl mb-4">🔍</p>
            <p className="text-slate-600 text-xl font-bold mb-2">No providers yet</p>
            <Link href="/auth/signup?role=provider" className="btn-shimmer inline-block mt-4 px-6 py-3 text-sm">
              Join as Provider →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {providers.map((p, idx) => {
              const grad = GRAD_COLORS[idx % GRAD_COLORS.length]
              const icon = CATEGORY_ICONS[p.category || ''] || '🌟'
              const min = minPrice(p.services)
              const shopLink = `/book/${p.slug || p.id}`

              return (
                <Link key={p.id} href={shopLink}
                  className="group bg-white rounded-2xl overflow-hidden hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 border border-slate-100 animate-fade-up flex flex-col">

                  {/* Shop Banner / Cover */}
                  <div className={`relative h-36 bg-gradient-to-br ${grad} overflow-hidden`}>
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt={p.business_name || p.full_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-6xl opacity-30 group-hover:scale-110 transition-transform duration-300">
                          {icon}
                        </span>
                      </div>
                    )}
                    {/* Category Badge */}
                    {p.category && (
                      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-xs font-bold text-slate-700 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <span>{icon}</span> {p.category}
                      </div>
                    )}
                    {/* Service count badge */}
                    <div className="absolute top-3 right-3 bg-sky-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                      {p.services?.length || 0} services
                    </div>
                  </div>

                  {/* Shop Info */}
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex items-start gap-3 mb-3">
                      {/* Avatar */}
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-white font-black text-lg flex-shrink-0 -mt-8 border-2 border-white shadow-md`}>
                        {p.avatar_url ? (
                          <img src={p.avatar_url} alt="" className="w-full h-full object-cover rounded-xl" />
                        ) : p.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 mt-0.5">
                        <h2 className="font-bold text-slate-800 text-sm leading-tight truncate">
                          {p.business_name || p.full_name}
                        </h2>
                        <p className="text-slate-400 text-xs truncate">{p.full_name}</p>
                      </div>
                    </div>

                    {/* Location & Phone */}
                    <div className="space-y-1.5 mb-3">
                      {p.location && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <span className="text-sky-400">📍</span>
                          <span className="truncate">{p.location}</span>
                        </div>
                      )}
                      {p.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <span className="text-sky-400">📞</span>
                          <span>{p.phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Bio */}
                    {p.bio && (
                      <p className="text-slate-400 text-xs line-clamp-2 mb-3 flex-1">{p.bio}</p>
                    )}

                    {/* Price & Services preview */}
                    {p.services?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {p.services.slice(0, 2).map(s => (
                          <span key={s.id} className="text-xs bg-sky-50 text-sky-600 border border-sky-200 px-2 py-0.5 rounded-full font-medium">
                            {s.title}
                          </span>
                        ))}
                        {p.services.length > 2 && (
                          <span className="text-xs text-slate-400">+{p.services.length - 2} more</span>
                        )}
                      </div>
                    )}

                    {/* Footer: Price + CTA */}
                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
                      <div>
                        {min !== null ? (
                          <>
                            <span className="text-slate-400 text-xs">Starting from</span>
                            <p className="text-sky-600 font-black text-base">${min.toFixed(2)}</p>
                          </>
                        ) : (
                          <p className="text-slate-300 text-xs">No services</p>
                        )}
                      </div>
                      <div className="bg-sky-500 group-hover:bg-sky-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all duration-200 group-hover:shadow-md group-hover:shadow-sky-200">
                        Enter Shop →
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
