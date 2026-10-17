'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { buildGoogleCalendarUrl, buildICSContent } from '@/lib/calendar'

interface Provider {
  id: string
  full_name: string
  business_name: string | null
  bio: string | null
  avatar_url: string | null
  phone: string | null
  location: string | null
  category: string | null
}

interface Service {
  id: string
  title: string
  duration_minutes: number
  price: number
  description: string | null
}

interface WorkingHour {
  day_of_week: number
  start_time: string
  end_time: string
  is_day_off: boolean
}

interface Booking {
  booking_date: string
  start_time: string
  end_time: string
  status: string
}

interface CartItem {
  id: string
  title: string
  price: number
  qty: number
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function timeToMins(t: string) { const [h, m] = t.slice(0, 5).split(':').map(Number); return h * 60 + m }
function minsToTime(m: number) { return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}` }
function formatDate(d: string) { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) }
function formatTime(t: string) { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}` }
function today() { return new Date().toISOString().split('T')[0] }

function generateSlots(start: string, end: string, dur: number, bookings: Booking[], date: string) {
  const slots: string[] = []
  let cur = timeToMins(start)
  const endM = timeToMins(end)
  const safeDur = dur > 0 ? dur : 30
  while (cur + safeDur <= endM) {
    const s = minsToTime(cur), e = minsToTime(cur + safeDur)
    const blocked = bookings.some(b =>
      b.booking_date === date && b.status !== 'cancelled' &&
      timeToMins(b.start_time) < timeToMins(e) && timeToMins(b.end_time) > timeToMins(s)
    )
    if (!blocked) slots.push(s)
    cur += safeDur
  }
  return slots
}

export default function ShopPage() {
  const { slug } = useParams() as { slug: string }
  const router = useRouter()
  const supabase = createClient()

  const [provider, setProvider] = useState<Provider | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([])
  const [blockedDates, setBlockedDates] = useState<string[]>([])
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; name: string } | null>(null)
  const [loading, setLoading] = useState(true)

  // Store Mode detection
  const [storeMode, setStoreMode] = useState<'cart' | 'booking' | 'both'>('booking')
  const [activeCatalogTab, setActiveCatalogTab] = useState<'products' | 'services'>('products')

  // Shopping Cart state
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCartDrawer, setShowCartDrawer] = useState(false)
  const [fulfillmentType, setFulfillmentType] = useState<'delivery' | 'pickup'>('delivery')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [cartNotes, setCartNotes] = useState('')
  const [cartOrdering, setCartOrdering] = useState(false)
  const [cartOrderSuccess, setCartOrderSuccess] = useState<any | null>(null)

  // Appointment Booking Panel state
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [showBookingPanel, setShowBookingPanel] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState('')
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [notes, setNotes] = useState('')
  const [booking, setBooking] = useState(false)
  const [bookingError, setBookingError] = useState('')
  const [dateError, setDateError] = useState('')
  const [appointmentSuccess, setAppointmentSuccess] = useState<any | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: p } = await supabase.from('profiles').select('full_name, phone').eq('id', user.id).single()
        setCurrentUser({ id: user.id, email: user.email || '', name: p?.full_name || 'Customer' })
        if (p?.phone) setContactPhone(p.phone)
      }

      const { data: prov } = await supabase.from('profiles')
        .select('id,full_name,business_name,bio,avatar_url,phone,location,category')
        .or(`slug.eq.${slug},id.eq.${slug}`).eq('role', 'provider').single()

      if (!prov) { setLoading(false); return }
      setProvider(prov)

      // Detect store mode
      const rawBio = prov.bio || ''
      const match = rawBio.match(/\[MODE:(cart|booking|both)\]/)
      if (match) {
        setStoreMode(match[1] as 'cart' | 'booking' | 'both')
        setActiveCatalogTab(match[1] === 'booking' ? 'services' : 'products')
      } else {
        const cat = (prov.category || '').toLowerCase()
        if (cat.includes('grocery') || cat.includes('supermarket') || cat.includes('pharmacy') || cat.includes('bakery') || cat.includes('retail')) {
          setStoreMode('cart')
          setActiveCatalogTab('products')
        } else {
          setStoreMode('booking')
          setActiveCatalogTab('services')
        }
      }

      const [{ data: svc }, { data: wh }, { data: bd }] = await Promise.all([
        supabase.from('services').select('*').eq('provider_id', prov.id).eq('is_active', true),
        supabase.from('working_hours').select('*').eq('provider_id', prov.id),
        supabase.from('blocked_dates').select('blocked_date').eq('provider_id', prov.id),
      ])

      setServices(svc || [])
      setWorkingHours(wh || [])
      setBlockedDates((bd || []).map((b: { blocked_date: string }) => b.blocked_date))
      setLoading(false)
    }
    init()
  }, [slug])

  // Slot calculation for appointment booking
  useEffect(() => {
    if (!selectedDate || !selectedService || !provider) { setAvailableSlots([]); setSelectedSlot(''); return }
    const check = async () => {
      setSlotsLoading(true); setSelectedSlot(''); setDateError('')
      const { data: fresh } = await supabase.from('bookings')
        .select('booking_date,start_time,end_time,status')
        .eq('provider_id', provider.id).eq('booking_date', selectedDate).neq('status', 'cancelled')
      const dayOfWeek = new Date(selectedDate + 'T00:00:00').getDay()
      if (blockedDates.includes(selectedDate)) { setDateError('This date is blocked.'); setAvailableSlots([]); setSlotsLoading(false); return }
      const sched = workingHours.find(wh => wh.day_of_week === dayOfWeek)
      if (!sched || sched.is_day_off) { setDateError('Business is closed on this day.'); setAvailableSlots([]); setSlotsLoading(false); return }
      setAvailableSlots(generateSlots(sched.start_time.slice(0, 5), sched.end_time.slice(0, 5), selectedService.duration_minutes || 30, fresh || [], selectedDate))
      setSlotsLoading(false)
    }
    check()
  }, [selectedDate, selectedService])

  // Cart operations
  const addToCart = (svc: Service, qty = 1) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === svc.id)
      if (existing) {
        return prev.map((i) => (i.id === svc.id ? { ...i, qty: i.qty + qty } : i))
      }
      return [...prev, { id: svc.id, title: svc.title, price: svc.price, qty }]
    })
  }

  const updateCartQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i))
        .filter((i) => i.qty > 0)
    )
  }

  const cartTotalItems = cart.reduce((acc, i) => acc + i.qty, 0)
  const cartTotalPrice = cart.reduce((acc, i) => acc + i.price * i.qty, 0)

  // Handle Cart Order Checkout
  const handlePlaceOrder = async () => {
    if (!currentUser) { router.push('/auth/login'); return }
    if (cart.length === 0 || !provider) return

    setCartOrdering(true)
    const orderDate = today()
    const now = new Date()
    const startTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`
    const endTime = `${String((now.getHours() + 1) % 24).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`

    // Build structured order payload
    const orderPayload = {
      orderType: 'grocery_cart',
      fulfillment: fulfillmentType,
      items: cart,
      totalAmount: cartTotalPrice,
      deliveryAddress: fulfillmentType === 'delivery' ? deliveryAddress : 'In-Store Pickup',
      contactPhone,
      customerNotes: cartNotes,
      placedAt: new Date().toISOString(),
    }

    const firstServiceId = cart[0].id

    const { data: nb, error: err } = await supabase.from('bookings').insert({
      provider_id: provider.id,
      customer_id: currentUser.id,
      service_id: firstServiceId,
      booking_date: orderDate,
      start_time: startTime,
      end_time: endTime,
      status: 'pending',
      customer_notes: JSON.stringify(orderPayload),
    }).select('id').single()

    if (err) {
      alert(`Order error: ${err.message}`)
      setCartOrdering(false)
      return
    }

    // Send email notification
    try {
      const itemList = cart.map(i => `• ${i.qty}x ${i.title} ($${(i.price * i.qty).toFixed(2)})`).join('\n')
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: currentUser.email,
          customerName: currentUser.name,
          providerName: provider.business_name || provider.full_name,
          serviceName: `${cartTotalItems} items (${fulfillmentType === 'delivery' ? 'Home Delivery' : 'Store Pickup'})`,
          bookingDate: orderDate,
          bookingTime: startTime.slice(0, 5),
          status: 'pending',
          notes: `${itemList}\nTotal: $${cartTotalPrice.toFixed(2)}\nFulfillment: ${fulfillmentType.toUpperCase()}\nAddress: ${deliveryAddress || 'Store Pickup'}\nPhone: ${contactPhone}`,
        }),
      })
    } catch { /* non-critical */ }

    setCartOrderSuccess({
      id: nb?.id || 'ORD-' + Date.now(),
      items: [...cart],
      total: cartTotalPrice,
      fulfillment: fulfillmentType,
      address: deliveryAddress,
      phone: contactPhone,
      date: orderDate,
    })
    setCart([])
    setShowCartDrawer(false)
    setCartOrdering(false)
  }

  // Handle Appointment Booking
  const handleBookAppointment = async () => {
    if (!currentUser) { router.push('/auth/login'); return }
    if (!selectedService || !selectedDate || !selectedSlot || !provider) return

    setBooking(true)
    setBookingError('')
    const dur = selectedService.duration_minutes || 30
    const endTime = minsToTime(timeToMins(selectedSlot) + dur)

    const { data: clash } = await supabase.from('bookings').select('id')
      .eq('provider_id', provider.id).eq('booking_date', selectedDate)
      .neq('status', 'cancelled').lt('start_time', endTime).gt('end_time', selectedSlot)

    if (clash && clash.length > 0) {
      setBookingError('This consultation slot was just taken. Please pick another time.')
      setSelectedSlot('')
      setBooking(false)
      return
    }

    const { data: nb, error: err } = await supabase.from('bookings').insert({
      provider_id: provider.id,
      customer_id: currentUser.id,
      service_id: selectedService.id,
      booking_date: selectedDate,
      start_time: selectedSlot + ':00',
      end_time: endTime + ':00',
      status: 'pending',
      customer_notes: notes || null,
    }).select('id').single()

    if (err) {
      setBookingError(err.message)
      setBooking(false)
      return
    }

    // Send email notification
    try {
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: currentUser.email,
          customerName: currentUser.name,
          providerName: provider.business_name || provider.full_name,
          serviceName: selectedService.title,
          bookingDate: selectedDate,
          bookingTime: selectedSlot,
          status: 'pending',
          notes,
        }),
      })
    } catch { /* non-critical */ }

    setAppointmentSuccess({
      id: nb?.id || 'APT-' + Date.now(),
      service: selectedService,
      date: selectedDate,
      slot: selectedSlot,
      endTime,
    })
    setShowBookingPanel(false)
    setBooking(false)
  }

  if (loading) {
    return (
      <div className="sky-bg min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sky-600 font-bold">Loading store & consultation menu...</p>
        </div>
      </div>
    )
  }

  if (!provider) {
    return (
      <div className="sky-bg min-h-screen flex items-center justify-center p-4">
        <div className="glass rounded-3xl p-10 text-center animate-bounce-in max-w-md">
          <p className="text-6xl mb-4">🔍</p>
          <h1 className="text-2xl font-black text-slate-800 mb-2">Shop or Clinic Not Found</h1>
          <p className="text-slate-400 text-xs mb-5">The business you are looking for may have moved or changed their link.</p>
          <Link href="/explore" className="btn-shimmer px-6 py-3 text-sm rounded-xl font-bold inline-block">
            Browse All Stores & Clinics →
          </Link>
        </div>
      </div>
    )
  }

  // ── SUCCESS SCREEN: CART ORDER ──
  if (cartOrderSuccess) {
    return (
      <div className="sky-bg min-h-screen flex items-center justify-center p-4">
        <div className="glass rounded-3xl p-8 max-w-lg w-full text-center animate-bounce-in border border-sky-100 shadow-2xl">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-green-600 text-white rounded-3xl flex items-center justify-center text-4xl mx-auto mb-4 shadow-lg shadow-emerald-200">
            🛒
          </div>
          <h1 className="text-3xl font-black text-slate-800 mb-1">Order Placed Successfully!</h1>
          <p className="text-slate-500 text-xs mb-5">
            Your order has been received by <strong>{provider.business_name || provider.full_name}</strong>.
          </p>

          <div className="bg-sky-50 rounded-2xl p-4 text-left border border-sky-100 space-y-2 mb-5">
            <div className="flex justify-between pb-2 border-b border-sky-200 text-xs font-bold text-slate-700">
              <span>Itemized Receipt</span>
              <span>Subtotal</span>
            </div>
            {cartOrderSuccess.items.map((i: CartItem) => (
              <div key={i.id} className="flex justify-between text-xs text-slate-600">
                <span>{i.qty}x {i.title}</span>
                <span className="font-semibold">${(i.price * i.qty).toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-2 border-t border-sky-200 font-black text-base text-sky-700">
              <span>Total Bill</span>
              <span>${Number(cartOrderSuccess.total).toFixed(2)}</span>
            </div>
            <div className="pt-2 border-t border-sky-100 text-xs text-slate-500">
              <p>📦 <strong>Fulfillment:</strong> {cartOrderSuccess.fulfillment === 'delivery' ? 'Home Delivery' : 'Store Pickup'}</p>
              {cartOrderSuccess.address && <p>📍 <strong>Address:</strong> {cartOrderSuccess.address}</p>}
              {cartOrderSuccess.phone && <p>📞 <strong>Contact Phone:</strong> {cartOrderSuccess.phone}</p>}
            </div>
          </div>

          <div className="flex gap-3">
            <Link href="/dashboard/customer" className="flex-1 btn-shimmer py-3.5 text-xs rounded-xl font-bold block text-center">
              View Order in Dashboard
            </Link>
            <button onClick={() => setCartOrderSuccess(null)} className="flex-1 bg-white hover:bg-sky-50 text-sky-700 border border-sky-200 py-3.5 text-xs rounded-xl font-bold transition">
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── SUCCESS SCREEN: APPOINTMENT ──
  if (appointmentSuccess) {
    const calUrl = buildGoogleCalendarUrl({
      title: `${appointmentSuccess.service.title} with ${provider.business_name || provider.full_name}`,
      date: appointmentSuccess.date,
      startTime: appointmentSuccess.slot,
      endTime: appointmentSuccess.endTime,
      description: `Appointment booked via BookforMe.\\nProvider: ${provider.business_name || provider.full_name}`,
    })

    return (
      <div className="sky-bg min-h-screen flex items-center justify-center p-4">
        <div className="glass rounded-3xl p-8 max-w-md w-full text-center animate-bounce-in border border-sky-100 shadow-2xl">
          <div className="w-20 h-20 bg-gradient-to-br from-sky-400 to-blue-600 text-white rounded-3xl flex items-center justify-center text-4xl mx-auto mb-4 shadow-lg shadow-sky-200 animate-float">
            🎉
          </div>
          <h1 className="text-3xl font-black text-slate-800 mb-1">Appointment Sent!</h1>
          <p className="text-slate-500 text-xs mb-5">
            Your booking request has been submitted to <strong>{provider.business_name || provider.full_name}</strong>.
          </p>

          <div className="bg-sky-50 rounded-2xl p-4 text-left border border-sky-100 space-y-2 mb-5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Consultation</span>
              <span className="text-slate-800 font-bold">{appointmentSuccess.service.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Date</span>
              <span className="text-slate-800 font-bold">{formatDate(appointmentSuccess.date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Time</span>
              <span className="text-sky-600 font-bold">{formatTime(appointmentSuccess.slot)} → {formatTime(appointmentSuccess.endTime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Fee</span>
              <span className="text-emerald-600 font-extrabold">${Number(appointmentSuccess.service.price).toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-2 mb-5">
            <a
              href={calUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs shadow-md shadow-sky-200 transition"
            >
              <span>📆</span> Add to Google Calendar
            </a>
          </div>

          <div className="flex gap-3">
            <Link href="/dashboard/customer" className="flex-1 btn-shimmer py-3.5 text-xs rounded-xl font-bold block text-center">
              My Appointments
            </Link>
            <button onClick={() => setAppointmentSuccess(null)} className="flex-1 bg-white hover:bg-sky-50 text-sky-700 border border-sky-200 py-3.5 text-xs rounded-xl font-bold transition">
              Back to Store
            </button>
          </div>
        </div>
      </div>
    )
  }

  const isGrocery = (provider.category || '').toLowerCase().includes('grocery') || (provider.category || '').toLowerCase().includes('retail') || (provider.category || '').toLowerCase().includes('pharmacy')
  const isMedical = (provider.category || '').toLowerCase().includes('medical') || (provider.category || '').toLowerCase().includes('doctor') || (provider.category || '').toLowerCase().includes('dental')

  const productsList = services.filter((s) => s.duration_minutes === 0 || storeMode === 'cart')
  const servicesList = services.filter((s) => s.duration_minutes > 0 || storeMode === 'booking')

  return (
    <div className="sky-bg min-h-screen pb-24">
      {/* ── TOP NAV ── */}
      <nav className="bg-white/85 backdrop-blur-md border-b border-sky-100 px-6 py-4 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/explore" className="text-sky-600 hover:text-sky-800 transition font-bold text-xs flex items-center gap-1">
              <span>←</span> Browse Marketplace
            </Link>
            <span className="text-slate-300">|</span>
            <span className="text-slate-800 text-xs font-extrabold truncate max-w-[200px] sm:max-w-md">
              {provider.business_name || provider.full_name}
            </span>
          </div>

          {/* Cart Icon in Nav */}
          {cartTotalItems > 0 && (
            <button
              onClick={() => setShowCartDrawer(true)}
              className="bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-md shadow-sky-200 animate-bounce-in"
            >
              <span>🛒</span> {cartTotalItems} items • ${cartTotalPrice.toFixed(2)}
            </button>
          )}
        </div>
      </nav>

      {/* ── SHOP HEADER / HERO ── */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="glass rounded-3xl overflow-hidden shadow-xl border border-sky-100 mb-8 animate-fade-up">
          <div className="relative h-56 bg-gradient-to-br from-sky-400 to-blue-600 overflow-hidden">
            {provider.avatar_url && (
              <img src={provider.avatar_url} alt="" className="w-full h-full object-cover opacity-75" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            <div className="absolute bottom-5 left-6 flex items-end gap-4">
              <div className="w-24 h-24 rounded-3xl bg-white flex items-center justify-center border-4 border-white shadow-2xl overflow-hidden flex-shrink-0">
                {provider.avatar_url ? (
                  <img src={provider.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-5xl">{isMedical ? '🏥' : isGrocery ? '🛒' : '🏪'}</span>
                )}
              </div>
              <div className="text-white drop-shadow-md">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-black">{provider.business_name || provider.full_name}</h1>
                  <span className="bg-white/20 backdrop-blur-sm text-white text-[11px] font-extrabold px-3 py-0.5 rounded-full">
                    {provider.category || 'Verified Business'}
                  </span>
                </div>
                <p className="text-white/80 text-xs">{provider.full_name}</p>
              </div>
            </div>
          </div>

          <div className="p-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2 text-xs">
              {provider.location && (
                <span className="bg-sky-50 text-slate-700 border border-sky-100 px-3.5 py-1.5 rounded-full font-semibold flex items-center gap-1.5">
                  <span>📍</span> {provider.location}
                </span>
              )}
              {provider.phone && (
                <a href={`tel:${provider.phone}`} className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3.5 py-1.5 rounded-full font-semibold flex items-center gap-1.5 hover:bg-emerald-100 transition">
                  <span>📞</span> {provider.phone}
                </a>
              )}
              <span className="bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1.5 rounded-full font-semibold">
                {storeMode === 'cart' ? '🛒 Grocery & Retail Delivery' : storeMode === 'booking' ? '📅 Appointments Available' : '⚡ Products & Bookings'}
              </span>
            </div>

            {provider.bio && (
              <p className="text-slate-500 text-xs w-full pt-2 border-t border-slate-100">
                {provider.bio.replace(/\[MODE:(cart|booking|both)\]\s*/, '')}
              </p>
            )}
          </div>
        </div>

        {/* ── CATALOG TABS IF DUAL MODE ── */}
        {storeMode === 'both' && (
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveCatalogTab('products')}
              className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${
                activeCatalogTab === 'products'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-200'
                  : 'bg-white text-slate-600 hover:bg-sky-50 border border-slate-200'
              }`}
            >
              <span>🛒</span> Grocery & Retail Products ({productsList.length})
            </button>
            <button
              onClick={() => setActiveCatalogTab('services')}
              className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${
                activeCatalogTab === 'services'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-200'
                  : 'bg-white text-slate-600 hover:bg-sky-50 border border-slate-200'
              }`}
            >
              <span>📅</span> Book Appointments & Consultations ({servicesList.length})
            </button>
          </div>
        )}

        {/* ── PRODUCTS / GROCERY GRID ── */}
        {(storeMode === 'cart' || (storeMode === 'both' && activeCatalogTab === 'products')) && (
          <div className="animate-fade-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <span>🛒</span> Shop Products ({services.length})
              </h2>
              <span className="text-xs text-slate-400">Click &ldquo;+ Add to Cart&rdquo; to order for Delivery or Pickup</span>
            </div>

            {services.length === 0 ? (
              <div className="glass rounded-3xl p-12 text-center">
                <p className="text-5xl mb-2">📦</p>
                <p className="text-slate-600 font-extrabold text-sm">No grocery or retail products listed yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {services.map((svc) => {
                  const inCart = cart.find((i) => i.id === svc.id)
                  return (
                    <div
                      key={svc.id}
                      className="bg-white rounded-3xl p-4 border border-slate-100 hover:border-sky-300 hover:shadow-xl transition-all duration-200 flex flex-col justify-between"
                    >
                      <div>
                        <div className="h-28 bg-gradient-to-br from-sky-50 to-blue-50 rounded-2xl flex items-center justify-center text-4xl mb-3 shadow-inner">
                          {isGrocery ? '🥬' : isMedical ? '💊' : '🛍️'}
                        </div>
                        <h3 className="font-extrabold text-slate-800 text-sm mb-1">{svc.title}</h3>
                        {svc.description && (
                          <p className="text-slate-400 text-xs mb-3 line-clamp-2">{svc.description}</p>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sky-600 font-black text-lg">${Number(svc.price).toFixed(2)}</p>
                        </div>

                        {inCart ? (
                          <div className="flex items-center gap-2 bg-sky-50 border border-sky-200 rounded-xl px-2 py-1">
                            <button
                              onClick={() => updateCartQty(svc.id, -1)}
                              className="w-6 h-6 rounded-lg bg-white text-slate-700 font-extrabold text-xs shadow-xs hover:bg-slate-100"
                            >
                              -
                            </button>
                            <span className="text-xs font-black text-sky-700 min-w-[16px] text-center">
                              {inCart.qty}
                            </span>
                            <button
                              onClick={() => updateCartQty(svc.id, 1)}
                              className="w-6 h-6 rounded-lg bg-sky-500 text-white font-extrabold text-xs shadow-xs hover:bg-sky-600"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(svc, 1)}
                            className="bg-sky-500 hover:bg-sky-600 text-white text-xs font-extrabold px-3.5 py-2 rounded-xl transition shadow-xs flex items-center gap-1"
                          >
                            <span>🛒</span> Add to Cart
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── APPOINTMENT / MEDICAL GRID ── */}
        {(storeMode === 'booking' || (storeMode === 'both' && activeCatalogTab === 'services')) && (
          <div className="animate-fade-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <span>📅</span> {isMedical ? 'Medical Consultations & Procedures' : 'Services & Appointments'} ({services.length})
              </h2>
              <span className="text-xs text-slate-400">Select a service to pick your consultation date and time slot</span>
            </div>

            {services.length === 0 ? (
              <div className="glass rounded-3xl p-12 text-center">
                <p className="text-5xl mb-2">🏥</p>
                <p className="text-slate-600 font-extrabold text-sm">No appointment services listed yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.map((svc) => (
                  <div
                    key={svc.id}
                    className="bg-white rounded-3xl p-5 border border-slate-100 hover:border-sky-300 hover:shadow-xl transition-all duration-200 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-extrabold text-slate-800 text-base">{svc.title}</h3>
                        <span className="bg-sky-50 text-sky-700 font-bold text-[11px] px-2.5 py-1 rounded-full border border-sky-100 flex-shrink-0">
                          ⏱ {svc.duration_minutes || 30} mins
                        </span>
                      </div>
                      {svc.description && (
                        <p className="text-slate-500 text-xs mb-4">{svc.description}</p>
                      )}
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-slate-400 text-xs font-semibold block">Fee / Price</span>
                        <span className="text-sky-600 font-black text-xl">${Number(svc.price).toFixed(2)}</span>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedService(svc)
                          setShowBookingPanel(true)
                          setSelectedDate('')
                          setSelectedSlot('')
                          setAvailableSlots([])
                          setBookingError('')
                          setDateError('')
                        }}
                        className="btn-shimmer text-xs px-4 py-2.5 rounded-xl font-bold"
                      >
                        📅 Book Slot →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── FLOATING CART ACTION BAR ── */}
      {cartTotalItems > 0 && (
        <div className="fixed bottom-6 inset-x-0 z-40 flex justify-center px-4 animate-bounce-in">
          <button
            onClick={() => setShowCartDrawer(true)}
            className="glass bg-sky-600 text-white px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-4 hover:bg-sky-700 transition-all border-2 border-white/60 max-w-md w-full justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🛒</span>
              <div className="text-left">
                <p className="font-black text-sm">{cartTotalItems} {cartTotalItems === 1 ? 'item' : 'items'} in your cart</p>
                <p className="text-sky-100 text-xs font-semibold">Total: ${cartTotalPrice.toFixed(2)}</p>
              </div>
            </div>
            <span className="bg-white text-sky-600 font-black text-xs px-4 py-2 rounded-2xl shadow-sm">
              View Cart & Checkout →
            </span>
          </button>
        </div>
      )}

      {/* ── SHOPPING CART DRAWER (GROCERY / RETAIL CHECKOUT) ── */}
      {showCartDrawer && (
        <>
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 animate-fade-in" onClick={() => setShowCartDrawer(false)} />
          <div className="fixed top-0 right-0 h-full w-full sm:w-[460px] bg-white z-50 shadow-2xl flex flex-col animate-slide-in overflow-hidden">
            <div className="bg-gradient-to-r from-sky-500 to-blue-600 p-5 text-white flex-shrink-0 flex items-center justify-between">
              <div>
                <h3 className="font-black text-lg flex items-center gap-2">
                  <span>🛒</span> Your Shopping Cart
                </h3>
                <p className="text-sky-100 text-xs">{provider.business_name || provider.full_name}</p>
              </div>
              <button
                onClick={() => setShowCartDrawer(false)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Cart Items List */}
              <div className="space-y-3">
                <p className="text-slate-700 font-bold text-xs uppercase tracking-wider">Order Items ({cartTotalItems})</p>
                {cart.map((item) => (
                  <div key={item.id} className="bg-sky-50/60 p-3.5 rounded-2xl border border-sky-100 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-extrabold text-slate-800 text-sm truncate">{item.title}</p>
                      <p className="text-slate-400 text-xs">${item.price.toFixed(2)} each</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-white border border-sky-200 rounded-xl px-2 py-0.5">
                        <button onClick={() => updateCartQty(item.id, -1)} className="text-slate-600 font-bold px-1.5">-</button>
                        <span className="text-xs font-black text-sky-700 px-2">{item.qty}</span>
                        <button onClick={() => updateCartQty(item.id, 1)} className="text-sky-600 font-bold px-1.5">+</button>
                      </div>
                      <span className="text-sm font-black text-slate-800 min-w-[50px] text-right">
                        ${(item.price * item.qty).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Fulfillment Method */}
              <div className="space-y-2">
                <label className="text-slate-700 font-bold text-xs uppercase tracking-wider block">Fulfillment Method *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFulfillmentType('delivery')}
                    className={`p-3 rounded-2xl border text-left font-bold text-xs flex flex-col gap-1 transition ${
                      fulfillmentType === 'delivery'
                        ? 'bg-sky-500 text-white border-sky-400 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    <span className="text-lg">🚚</span>
                    <span>Home Delivery</span>
                    <span className={`text-[10px] ${fulfillmentType === 'delivery' ? 'text-sky-100' : 'text-slate-400'}`}>To your door</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFulfillmentType('pickup')}
                    className={`p-3 rounded-2xl border text-left font-bold text-xs flex flex-col gap-1 transition ${
                      fulfillmentType === 'pickup'
                        ? 'bg-sky-500 text-white border-sky-400 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    <span className="text-lg">🛍️</span>
                    <span>Store Pickup</span>
                    <span className={`text-[10px] ${fulfillmentType === 'pickup' ? 'text-sky-100' : 'text-slate-400'}`}>Pick up at shop</span>
                  </button>
                </div>
              </div>

              {/* Delivery Address if Home Delivery */}
              {fulfillmentType === 'delivery' && (
                <div>
                  <label className="text-slate-700 font-bold text-xs uppercase tracking-wider block mb-1">
                    Delivery Address *
                  </label>
                  <textarea
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    rows={2}
                    placeholder="Enter complete building, street, flat/apartment address..."
                    className="sky-input text-xs resize-none"
                    required
                  />
                </div>
              )}

              {/* Contact Phone */}
              <div>
                <label className="text-slate-700 font-bold text-xs uppercase tracking-wider block mb-1">
                  Contact Phone / WhatsApp *
                </label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+1 234 567 8900"
                  className="sky-input text-xs"
                  required
                />
              </div>

              {/* Special Instructions */}
              <div>
                <label className="text-slate-700 font-bold text-xs uppercase tracking-wider block mb-1">
                  Order Instructions (Optional)
                </label>
                <input
                  type="text"
                  value={cartNotes}
                  onChange={(e) => setCartNotes(e.target.value)}
                  placeholder="e.g. Call before delivery, substitute brand if out of stock..."
                  className="sky-input text-xs"
                />
              </div>

              {/* Total Calculation */}
              <div className="bg-sky-50 p-4 rounded-2xl border border-sky-200 space-y-1.5">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Subtotal</span>
                  <span>${cartTotalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Estimated Delivery / Service</span>
                  <span className="text-emerald-600 font-bold">Free</span>
                </div>
                <div className="flex justify-between text-base font-black text-sky-800 pt-2 border-t border-sky-200">
                  <span>Total Amount</span>
                  <span>${cartTotalPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-white flex-shrink-0">
              {!currentUser ? (
                <Link href="/auth/login" className="w-full btn-shimmer py-3.5 text-xs rounded-xl block text-center font-bold">
                  Sign In to Place Order
                </Link>
              ) : (
                <button
                  onClick={handlePlaceOrder}
                  disabled={cartOrdering || (fulfillmentType === 'delivery' && !deliveryAddress)}
                  className="w-full btn-shimmer py-4 text-sm rounded-xl font-bold disabled:opacity-50"
                >
                  {cartOrdering ? 'Submitting Order...' : `🛍️ Place Order • $${cartTotalPrice.toFixed(2)}`}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── APPOINTMENT BOOKING DRAWER (MEDICAL / SALON SLOTS) ── */}
      {showBookingPanel && selectedService && (
        <>
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 animate-fade-in" onClick={() => setShowBookingPanel(false)} />
          <div className="fixed top-0 right-0 h-full w-full sm:w-[440px] bg-white z-50 shadow-2xl flex flex-col animate-slide-in overflow-hidden">
            <div className="bg-gradient-to-r from-sky-500 to-blue-600 p-5 text-white flex-shrink-0 flex items-center justify-between">
              <div>
                <p className="text-sky-100 text-xs uppercase tracking-wide">Book Consultation / Slot</p>
                <h3 className="font-black text-lg">{selectedService.title}</h3>
                <p className="text-xs text-sky-100 mt-0.5">⏱ {selectedService.duration_minutes || 30} mins • ${Number(selectedService.price).toFixed(2)}</p>
              </div>
              <button
                onClick={() => setShowBookingPanel(false)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div>
                <label className="block text-slate-700 font-bold text-xs uppercase tracking-wide mb-2">
                  📅 Pick Appointment Date *
                </label>
                <input
                  type="date"
                  min={today()}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="sky-input text-sm"
                />
                {dateError && <p className="text-red-500 text-xs mt-2 bg-red-50 p-2 rounded-lg">❌ {dateError}</p>}
                {selectedDate && !dateError && (
                  <p className="text-sky-600 text-xs mt-1.5 font-bold">Selected: {formatDate(selectedDate)}</p>
                )}
              </div>

              {selectedDate && !dateError && (
                <div>
                  <label className="block text-slate-700 font-bold text-xs uppercase tracking-wide mb-2">
                    🕐 Available Consultation Times *
                  </label>
                  {slotsLoading ? (
                    <div className="flex items-center gap-2 text-slate-400 text-xs py-3">
                      <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
                      Checking doctor / provider schedule...
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <p className="text-slate-400 text-xs">No available slots on this day. Please pick another date.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {availableSlots.map((slot) => {
                        const dur = selectedService.duration_minutes || 30
                        const endSlot = minsToTime(timeToMins(slot) + dur)
                        const isSel = selectedSlot === slot
                        return (
                          <button
                            key={slot}
                            onClick={() => setSelectedSlot(slot)}
                            className={`flex flex-col items-center py-2.5 rounded-xl border-2 text-xs font-bold transition ${
                              isSel
                                ? 'bg-sky-500 border-sky-400 text-white shadow-md'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-sky-300'
                            }`}
                          >
                            <span>{formatTime(slot)}</span>
                            <span className={`text-[10px] ${isSel ? 'text-sky-100' : 'text-slate-400'}`}>to {formatTime(endSlot)}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {selectedSlot && (
                <div>
                  <label className="block text-slate-700 font-bold text-xs uppercase tracking-wide mb-2">
                    📝 Patient Symptoms / Visit Reason / Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Describe any symptoms, previous prescription details, or visit requests..."
                    className="sky-input text-xs resize-none"
                  />
                </div>
              )}

              {bookingError && (
                <p className="text-red-600 text-xs bg-red-50 border border-red-200 p-2.5 rounded-xl">
                  ❌ {bookingError}
                </p>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-white flex-shrink-0">
              {!currentUser ? (
                <Link href="/auth/login" className="w-full btn-shimmer py-3.5 text-xs rounded-xl block text-center font-bold">
                  Sign In to Book Appointment
                </Link>
              ) : (
                <button
                  onClick={handleBookAppointment}
                  disabled={!selectedDate || !selectedSlot || booking}
                  className="w-full btn-shimmer py-3.5 text-xs rounded-xl font-bold disabled:opacity-50"
                >
                  {booking ? 'Scheduling...' : '📅 Confirm Appointment'}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
