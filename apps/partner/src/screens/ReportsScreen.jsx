import { useMemo } from 'react';
import Logo from '../components/logo';

const ReportsScreen = ({ setCurrentScreen, orders = [] }) => {

  const stats = useMemo(() => {
    const total     = orders.length
    const accepted  = orders.filter(o => ['accepted','ready','completed'].includes(o.status)).length
    const completed = orders.filter(o => o.status === 'completed').length
    const rejected  = orders.filter(o => o.status === 'rejected').length
    const acceptRate = total > 0 ? Math.round((accepted / total) * 100) : 0
    const doneRate   = total > 0 ? Math.round((completed / total) * 100) : 0
    const rejectRate = total > 0 ? Math.round((rejected / total) * 100) : 0
    return { total, accepted, completed, rejected, acceptRate, doneRate, rejectRate }
  }, [orders])

  // آخر 7 أيام
  const last7Days = useMemo(() => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const label = d.toLocaleDateString('ar-SA', { weekday: 'short' })
      const count = orders.filter(o => {
        const t = o.createdAt?.toMillis?.() ?? 0
        const od = new Date(t)
        return od.toDateString() === d.toDateString()
      }).length
      days.push({ label, count })
    }
    return days
  }, [orders])

  const maxDay = Math.max(...last7Days.map(d => d.count), 1)

  return (
    <div className="min-h-screen bg-[#110d35] p-6 text-right font-['Cairo'] text-white pb-24" dir="rtl">
      <div className="flex justify-between items-center mb-8 max-w-2xl mx-auto">
        <button onClick={() => setCurrentScreen('dashboard')} className="text-[#ee7b26] font-bold">← العودة</button>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black">تقارير الفرع</h1>
          <Logo size={40} />
        </div>
      </div>

      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto mb-6">
        {[
          { label: 'إجمالي الطلبات', value: stats.total,     color: 'text-white'       },
          { label: 'مكتملة',         value: stats.completed,  color: 'text-green-400'   },
          { label: 'مقبولة',         value: stats.accepted,   color: 'text-orange-400'  },
          { label: 'مرفوضة',         value: stats.rejected,   color: 'text-red-400'     },
        ].map((s, i) => (
          <div key={i} className="bg-[#1e293b] p-5 rounded-3xl border border-slate-700 text-center">
            <p className="text-xs text-slate-400 mb-2">{s.label}</p>
            <p className={`text-4xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* تحليل الأداء */}
      <div className="bg-[#1e293b] p-6 rounded-3xl border border-slate-700 max-w-2xl mx-auto mb-6">
        <h2 className="font-bold mb-5 text-lg">تحليل الأداء</h2>
        <div className="space-y-5">
          {[
            { label: 'معدل القبول',   pct: stats.acceptRate },
            { label: 'نسبة الإتمام',  pct: stats.doneRate   },
            { label: 'نسبة الرفض',    pct: stats.rejectRate, color: '#ef4444' },
          ].map(({ label, pct, color = '#ee7b26' }) => (
            <div key={label}>
              <div className="flex justify-between text-xs mb-2">
                <span style={{ color }}>{pct}%</span>
                <span className="text-slate-300">{label}</span>
              </div>
              <div className="w-full bg-[#110d35] h-2 rounded-full overflow-hidden">
                <div style={{ width: `${pct}%`, background: color }} className="h-full rounded-full transition-all" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* آخر 7 أيام */}
      <div className="bg-[#1e293b] p-6 rounded-3xl border border-slate-700 max-w-2xl mx-auto">
        <h2 className="font-bold mb-5 text-lg">الطلبات — آخر 7 أيام</h2>
        {stats.total === 0 ? (
          <p className="text-slate-500 text-center py-6">لا توجد طلبات بعد</p>
        ) : (
          <div className="flex items-end justify-between gap-2 h-28">
            {last7Days.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-[#ee7b26] font-bold">{d.count || ''}</span>
                <div
                  className="w-full rounded-t-lg transition-all"
                  style={{
                    height: `${Math.round((d.count / maxDay) * 80) + 4}px`,
                    background: d.count > 0 ? '#ee7b26' : '#1e3a5f',
                    minHeight: 4,
                  }}
                />
                <span className="text-[10px] text-slate-500">{d.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ReportsScreen
