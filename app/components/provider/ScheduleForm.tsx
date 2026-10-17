'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface WorkingHour {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  is_day_off: boolean
}

interface Props {
  providerId: string
  workingHours: WorkingHour[]
  onRefresh: () => void
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function ScheduleForm({ providerId, workingHours, onRefresh }: Props) {
  const [saving, setSaving] = useState<number | null>(null)
  const supabase = createClient()

  const getDay = (dayIndex: number) =>
    workingHours.find((h) => h.day_of_week === dayIndex)

  const handleSave = async (
    dayIndex: number,
    startTime: string,
    endTime: string,
    isDayOff: boolean
  ) => {
    setSaving(dayIndex)
    const existing = getDay(dayIndex)

    if (existing) {
      await supabase
        .from('working_hours')
        .update({ start_time: startTime, end_time: endTime, is_day_off: isDayOff })
        .eq('id', existing.id)
    } else {
      await supabase.from('working_hours').insert({
        provider_id: providerId,
        day_of_week: dayIndex,
        start_time: startTime,
        end_time: endTime,
        is_day_off: isDayOff,
      })
    }

    setSaving(null)
    onRefresh()
  }

  return (
    <div className="glass rounded-2xl p-6 shadow-xl border border-sky-100">
      <div className="mb-6">
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
          <span>🗓️</span> Weekly Working Hours
        </h2>
        <p className="text-slate-400 text-xs mt-0.5">
          Customers will only be able to book slots during your active working hours
        </p>
      </div>

      <div className="space-y-3">
        {DAYS.map((day, index) => {
          const existing = getDay(index)
          const isDayOff = existing?.is_day_off ?? (index === 0 || index === 6)
          const startTime = existing?.start_time?.slice(0, 5) ?? '09:00'
          const endTime = existing?.end_time?.slice(0, 5) ?? '17:00'

          return (
            <DayRow
              key={day}
              day={day}
              dayIndex={index}
              isDayOff={isDayOff}
              startTime={startTime}
              endTime={endTime}
              saving={saving === index}
              onSave={handleSave}
            />
          )
        })}
      </div>
    </div>
  )
}

function DayRow({
  day,
  dayIndex,
  isDayOff,
  startTime,
  endTime,
  saving,
  onSave,
}: {
  day: string
  dayIndex: number
  isDayOff: boolean
  startTime: string
  endTime: string
  saving: boolean
  onSave: (dayIndex: number, start: string, end: string, off: boolean) => void
}) {
  const [off, setOff] = useState(isDayOff)
  const [start, setStart] = useState(startTime)
  const [end, setEnd] = useState(endTime)

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-3.5 border transition-all duration-200 ${
        off
          ? 'bg-slate-50/70 border-slate-200 opacity-60'
          : 'bg-white border-sky-100 hover:border-sky-300 hover:shadow-md'
      }`}
    >
      {/* Day Name */}
      <div className="w-28 font-bold text-slate-800 text-sm flex items-center gap-2">
        <span>{off ? '☕' : '💼'}</span> {day}
      </div>

      {/* Day Off Toggle */}
      <button
        type="button"
        onClick={() => {
          setOff(!off)
          onSave(dayIndex, start, end, !off)
        }}
        className={`text-xs px-3.5 py-1.5 rounded-full border font-bold transition-all ${
          off
            ? 'bg-rose-100 border-rose-300 text-rose-700'
            : 'bg-emerald-100 border-emerald-300 text-emerald-700'
        }`}
      >
        {off ? '🔴 Day Off' : '🟢 Open for Bookings'}
      </button>

      {/* Time Inputs */}
      {!off ? (
        <div className="flex items-center gap-2">
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="sky-input text-xs py-1.5 px-3"
          />
          <span className="text-slate-400 text-xs font-semibold">to</span>
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="sky-input text-xs py-1.5 px-3"
          />
          <button
            type="button"
            onClick={() => onSave(dayIndex, start, end, off)}
            disabled={saving}
            className="btn-shimmer text-xs px-4 py-2 rounded-xl font-bold ml-2"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      ) : (
        <span className="text-slate-400 text-xs italic">Closed all day</span>
      )}
    </div>
  )
}
