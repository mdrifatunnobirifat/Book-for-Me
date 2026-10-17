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
  const [itemType, setItemType] = useState<'product' | 'service'>('service')
  const [unit, setUnit] = useState('item')
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

    // Encode unit in description if product
    const descWithUnit = itemType === 'product'
      ? `${unit ? `[Unit: ${unit}] ` : ''}${description}`.trim()
      : description

    const { error: err } = await supabase.from('services').insert({
      provider_id: providerId,
      title,
      duration_minutes: itemType === 'product' ? 0 : duration,
      price: parseFloat(price) || 0,
      description: descWithUnit || null,
    })

    if (err) {
      setError(err.message)
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
    if (confirm('Delete this item from catalog?')) {
      await supabase.from('services').delete().eq('id', id)
      onRefresh()
    }
  }

  const handleToggle = async (id: string, current: boolean) => {
    await supabase.from('services').update({ is_active: !current }).eq('id', id)
    onRefresh()
  }

  return (
    <div className="glass rounded-3xl p-6 md:p-8 shadow-xl border border-sky-100">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <span>🛒</span> Products & Services Catalog
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">
            Add grocery items, medicines, or medical & salon consultation sessions
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-shimmer text-xs px-4 py-2.5 rounded-xl font-bold flex items-center gap-1.5"
        >
          {showForm ? '✕ Cancel' : '+ Add Item / Service'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-sky-50/80 rounded-2xl p-5 mb-6 border border-sky-200 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-800 text-sm">Add New Catalog Item</h3>
            <div className="bg-white p-1 rounded-xl border border-sky-200 flex text-xs">
              <button
                type="button"
                onClick={() => setItemType('product')}
                className={`px-3 py-1 rounded-lg font-bold transition ${
                  itemType === 'product' ? 'bg-sky-500 text-white' : 'text-slate-600 hover:text-sky-600'
                }`}
              >
                🛒 Physical Product / Grocery
              </button>
              <button
                type="button"
                onClick={() => setItemType('service')}
                className={`px-3 py-1 rounded-lg font-bold transition ${
                  itemType === 'service' ? 'bg-sky-500 text-white' : 'text-slate-600 hover:text-sky-600'
                }`}
              >
                🏥 Service / Appointment
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-600 text-xs bg-red-50 border border-red-200 px-3 py-2 rounded-xl">
              ❌ {error}
            </p>
          )}

          <div>
            <label className="block text-slate-700 text-xs font-bold mb-1.5">
              {itemType === 'product' ? 'Product Name *' : 'Service / Consultation Title *'}
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder={
                itemType === 'product'
                  ? 'e.g. Fresh Milk 1L, Organic Apples, Bread Pack'
                  : 'e.g. General Medical Consultation, Dental Checkup'
              }
              className="sky-input text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 text-xs font-bold mb-1.5">Price ($) *</label>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="9.99"
                className="sky-input text-sm"
              />
            </div>

            {itemType === 'product' ? (
              <div>
                <label className="block text-slate-700 text-xs font-bold mb-1.5">Selling Unit</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="sky-input text-sm"
                >
                  <option value="item">per Item / Piece</option>
                  <option value="kg">per Kilogram (kg)</option>
                  <option value="g">per 500 grams</option>
                  <option value="liter">per Liter (L)</option>
                  <option value="pack">per Pack / Box</option>
                  <option value="bottle">per Bottle</option>
                  <option value="strip">per Medicine Strip</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-slate-700 text-xs font-bold mb-1.5">Session Duration</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="sky-input text-sm"
                >
                  {[15, 20, 30, 45, 60, 90, 120].map((d) => (
                    <option key={d} value={d}>
                      {d} minutes
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-slate-700 text-xs font-bold mb-1.5">Description & Details</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                itemType === 'product'
                  ? 'Brand, weight, expiry, organic certification, etc.'
                  : 'What is included in this medical session or treatment...'
              }
              rows={2}
              className="sky-input text-sm resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-shimmer py-3 text-sm font-bold disabled:opacity-50 rounded-xl"
          >
            {loading ? 'Adding...' : itemType === 'product' ? '➕ Add Product to Store' : '➕ Save Service Slot'}
          </button>
        </form>
      )}

      {services.length === 0 ? (
        <div className="text-center py-14 bg-sky-50/50 rounded-2xl border border-dashed border-sky-200">
          <p className="text-4xl mb-2">🛍️</p>
          <p className="text-slate-500 text-sm font-semibold">Your store catalog is empty.</p>
          <p className="text-slate-400 text-xs mt-1">Add your grocery items, retail products, or medical services above!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((svc) => {
            const isProduct = svc.duration_minutes === 0
            return (
              <div
                key={svc.id}
                className="bg-white rounded-2xl p-4 border border-slate-100 hover:border-sky-200 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm">{isProduct ? '🛒' : '⏱️'}</span>
                      <h4 className="font-extrabold text-slate-800 text-sm">{svc.title}</h4>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        svc.is_active
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {svc.is_active ? 'In Stock' : 'Hidden'}
                    </span>
                  </div>
                  {svc.description && (
                    <p className="text-slate-500 text-xs mb-3 line-clamp-2">{svc.description}</p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-sky-600 font-black text-base">${Number(svc.price).toFixed(2)}</span>
                    <span className="text-slate-400 text-xs ml-1.5 font-semibold">
                      {isProduct ? 'product' : `${svc.duration_minutes} min`}
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleToggle(svc.id, svc.is_active)}
                      className="text-xs text-sky-600 hover:text-sky-800 font-semibold px-2 py-1 bg-sky-50 rounded-lg hover:bg-sky-100 transition"
                    >
                      {svc.is_active ? 'Hide' : 'Show'}
                    </button>
                    <button
                      onClick={() => handleDelete(svc.id)}
                      className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1 bg-rose-50 rounded-lg hover:bg-rose-100 transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
