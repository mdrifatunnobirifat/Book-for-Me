'use client'

import { useState, useRef } from 'react'

interface Props {
  currentUrl: string
  onUpload: (url: string) => void
  label?: string
}

export default function ImageUpload({ currentUrl, onUpload, label = 'Shop Photo' }: Props) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(currentUrl)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, WebP, GIF)')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be under 10MB')
      return
    }

    setUploading(true)
    setError('')
    setSuccess(false)

    // Immediate local preview
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Failed to upload image')
      }

      setPreview(data.url)
      onUpload(data.url)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      setError(msg)
      setPreview(currentUrl)
    } finally {
      setUploading(false)
    }
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) uploadFile(f)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) uploadFile(f)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-slate-700 text-sm font-bold">{label}</label>
        {success && <span className="text-xs text-green-600 font-bold animate-fade-in">✅ Uploaded!</span>}
      </div>

      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200 overflow-hidden group ${
          dragOver
            ? 'border-sky-500 bg-sky-50 scale-[1.01]'
            : 'border-sky-200 hover:border-sky-400 hover:bg-sky-50/50 bg-white'
        }`}
        style={{ minHeight: 160 }}
      >
        {/* Background preview with blur */}
        {preview && (
          <img
            src={preview}
            alt="background preview"
            className="absolute inset-0 w-full h-full object-cover opacity-15 filter blur-xs group-hover:opacity-25 transition-opacity"
          />
        )}

        {/* Center content */}
        <div className="relative z-10 flex flex-col items-center justify-center p-6 text-center min-h-[160px]">
          {preview ? (
            <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-white shadow-xl mb-3 relative group/thumb">
              <img src={preview} alt="Shop cover" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center text-white text-xs font-semibold transition-opacity">
                Change
              </div>
            </div>
          ) : (
            <div className="w-16 h-16 bg-sky-100 text-sky-500 rounded-2xl flex items-center justify-center mb-3 text-3xl shadow-sm group-hover:scale-110 transition-transform">
              📸
            </div>
          )}

          {uploading ? (
            <div className="flex items-center gap-2 text-sky-600 font-semibold text-sm">
              <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
              <span>Uploading image...</span>
            </div>
          ) : (
            <>
              <p className="text-slate-700 text-sm font-bold">
                {preview ? 'Click or drag new image to replace' : 'Click or drag image to upload'}
              </p>
              <p className="text-slate-400 text-xs mt-1">
                Supports JPG, PNG, WebP · Max 10MB
              </p>
            </>
          )}
        </div>

        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </div>

      {error && (
        <p className="text-red-500 text-xs mt-2 bg-red-50 border border-red-100 p-2 rounded-lg flex items-center gap-1.5">
          <span>❌</span> {error}
        </p>
      )}
    </div>
  )
}
