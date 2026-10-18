'use client'

export interface StatCardProps {
  label: string
  value: number
  icon: string
  color: string
  subtext?: string
}

export default function StatCard({ label, value, icon, color, subtext }: StatCardProps) {
  return (
    <div className="glass rounded-3xl p-5 text-center shadow-lg border border-sky-100 hover:shadow-xl transition-all hover:-translate-y-0.5">
      <span className="text-2xl mb-1 block">{icon}</span>
      <p className={`text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r ${color}`}>
        {value}
      </p>
      <p className="text-slate-600 text-xs font-bold mt-1">{label}</p>
      {subtext && <p className="text-[10px] text-slate-400 mt-0.5">{subtext}</p>}
    </div>
  )
}
