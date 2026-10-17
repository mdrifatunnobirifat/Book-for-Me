'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Service {
  id: string
  title: string
  duration_minutes: number
  price: number
  description: string | null
  is_active: boolean
}

interface Props {
  providerId: string
  services: Service[]
  onRefresh: () => void
}

export default function ServiceForm({ providerId, services, onRefresh }: Props) {
  const [title, setTitle] = useState('')
  const [duration, setDuration] = useState(30)
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const supabase = createClient()

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.from('services').insert({
      provider_id: providerId,
      title,
      duration_minutes: duration,
      price: parseFloat(price) || 0,
      description: description || null,
    })

    if (error) {
      setError(error.message)
    } else {
      setTitle('')
      setDuration(30)
      setPrice('')
      setDescription('')
      setShowForm(false)
      onRefresh()
    }
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Delete this service?')) {
      await supabase.from('services').delete().eq('id', id)
      onRefresh()
    }
  }

  const handleToggle = async (id: string, current: boolean) => {
    await supabase.from('services').update({ is_active: !current }).eq('id', id)
    onRefresh()
  }

  return (
    <div className="glass rounded-2xl p-6 shadow-xl border border-sky-100">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <span>🛠️</span> Shop Products & Services
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">
            Add your services just like products in an online shopping catalog
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-shimmer text-xs px-4 py-2.5 rounded-xl font-bold flex items-center gap-1.5"
        >
          {showForm ? '✕ Cancel' : '+ Add New Service'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-sky-50/70 rounded-2xl p-5 mb-6 border border-sky-200 space-y-4 animate-fade-in">
          <h3 className="font-bold text-slate-800 text-sm">Add New Service to Catalog</h3>

          {error && (
            <p className="text-red-600 text-xs bg-red-50 border border-red-200 px-3 py-2 rounded-xl">
              ❌ {error}
            </p>
          )}

          <div>
            <label className="block text-slate-700 text-xs font-bold mb-1.5">Service Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g. Deluxe Haircut & Beard Styling"
              className="sky-input text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 text-xs font-bold mb-1.5">Duration</label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="sky-input text-sm"
              >
                {[15, 30, 45, 60, 90, 120, 180].map((d) => (
                  <option key={d} value={d}>
                    {d} minutes
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-700 text-xs font-bold mb-1.5">Price ($) *</label>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="25.00"
                className="sky-input text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 text-xs font-bold mb-1.5">Short Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain what is included, special treatments, etc."
              rows={2}
              className="sky-input text-sm resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-shimmer py-3 text-sm font-bold disabled:opacity-50 rounded-xl"
          >
            {loading ? 'Adding Service...' : '➕ Save Service to Shop'}
          </button>
        </form>
      )}

      {services.length === 0 ? (
        <div className="text-center py-14 bg-sky-50/50 rounded-xl border border-dashed border-sky-200">
          <p className="text-4xl mb-2">🛒</p>
          <p className="text-slate-500 text-sm font-semibold">No services yet. Add your first service above!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {services.map((svc) => (
            <div
              key={svc.id}
              className="bg-white rounded-2xl p-4 border border-slate-100 hover:border-sky-200 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-extrabold text-slate-800 text-base">{svc.title}</h4>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                      svc.is_active
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {svc.is_active ? 'Active' : 'Hidden'}
                  </span>
                </div>
                {svc.description && (
                  <p className="text-slate-500 text-xs mb-3 line-clamp-2">{svc.description}</p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-sky-600 font-black text-lg">${Number(svc.price).toFixed(2)}</span>
                  <span className="text-slate-400 text-xs ml-2 font-medium">{svc.duration_minutes} min</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggle(svc.id, svc.is_active)}
                    className="text-xs text-sky-600 hover:text-sky-800 font-semibold px-2.5 py-1 bg-sky-50 rounded-lg hover:bg-sky-100 transition"
                  >
                    {svc.is_active ? 'Hide' : 'Show'}
                  </button>
                  <button
                    onClick={() => handleDelete(svc.id)}
                    className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2.5 py-1 bg-rose-50 rounded-lg hover:bg-rose-100 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
