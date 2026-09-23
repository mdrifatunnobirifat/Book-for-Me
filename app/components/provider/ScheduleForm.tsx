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
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
      <h2 className="text-xl font-bold text-white mb-5">🗓️ Weekly Schedule</h2>
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
  day, dayIndex, isDayOff, startTime, endTime, saving, onSave
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
    <div className={`flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 border transition ${
      off ? 'bg-white/5 border-white/10 opacity-60' : 'bg-white/5 border-white/10'
    }`}>
      {/* Day Name */}
      <div className="w-24 text-white font-medium text-sm">{day}</div>

      {/* Day Off Toggle */}
      <button
        onClick={() => {
          setOff(!off)
          onSave(dayIndex, start, end, !off)
        }}
        className={`text-xs px-3 py-1 rounded-lg border transition ${
          off
            ? 'bg-red-500/20 border-red-500/40 text-red-300'
            : 'bg-green-500/20 border-green-500/40 text-green-300'
        }`}
      >
        {off ? '🔴 Day Off' : '🟢 Working'}
      </button>

      {/* Time Inputs */}
      {!off && (
        <>
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="bg-white/10 border border-white/20 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          <span className="text-white/40 text-sm">to</span>
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="bg-white/10 border border-white/20 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          <button
            onClick={() => onSave(dayIndex, start, end, off)}
            disabled={saving}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs px-4 py-1.5 rounded-lg transition"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </>
      )}
    </div>
  )
}
