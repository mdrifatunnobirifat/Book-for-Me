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
      description,
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
    await supabase.from('services').delete().eq('id', id)
    onRefresh()
  }

  const handleToggle = async (id: string, current: boolean) => {
    await supabase.from('services').update({ is_active: !current }).eq('id', id)
    onRefresh()
  }

  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-white">🛠️ My Services</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-purple-600 hover:bg-purple-500 text-white text-sm px-4 py-2 rounded-xl transition"
        >
          {showForm ? '✕ Cancel' : '+ Add Service'}
        </button>
      </div>

      {/* Add Service Form */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-white/5 rounded-xl p-4 mb-4 space-y-3">
          {error && (
            <p className="text-red-300 text-sm bg-red-500/20 px-3 py-2 rounded-lg">{error}</p>
          )}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Service name (e.g. Haircut)"
            className="w-full bg-white/10 border border-white/20 text-white placeholder-white/40 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-white/60 text-xs mb-1 block">Duration (minutes)</label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                {[15, 30, 45, 60, 90, 120].map(d => (
                  <option key={d} value={d} className="bg-slate-800">{d} mins</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-white/60 text-xs mb-1 block">Price ($)</label>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full bg-white/10 border border-white/20 text-white placeholder-white/40 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description (optional)"
            rows={2}
            className="w-full bg-white/10 border border-white/20 text-white placeholder-white/40 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition"
          >
            {loading ? 'Adding...' : 'Add Service'}
          </button>
        </form>
      )}

      {/* Services List */}
      {services.length === 0 ? (
        <p className="text-white/40 text-sm text-center py-6">
          No services yet. Add your first service above!
        </p>
      ) : (
        <div className="space-y-3">
          {services.map((service) => (
            <div key={service.id}
              className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3 border border-white/10">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-white font-medium">{service.title}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    service.is_active
                      ? 'bg-green-500/20 text-green-300'
                      : 'bg-white/10 text-white/40'
                  }`}>
                    {service.is_active ? 'Active' : 'Hidden'}
                  </span>
                </div>
                <p className="text-white/50 text-sm mt-0.5">
                  {service.duration_minutes} mins · ${Number(service.price).toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-3">
                <button
                  onClick={() => handleToggle(service.id, service.is_active)}
                  className="text-xs text-purple-300 hover:text-purple-200 border border-purple-500/30 px-3 py-1 rounded-lg transition"
                >
                  {service.is_active ? 'Hide' : 'Show'}
                </button>
                <button
                  onClick={() => handleDelete(service.id)}
                  className="text-xs text-red-300 hover:text-red-200 border border-red-500/30 px-3 py-1 rounded-lg transition"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
