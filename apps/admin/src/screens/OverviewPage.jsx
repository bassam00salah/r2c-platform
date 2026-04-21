import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { AdminCard, EmptyState, PageHeader, StatCard, TableCard, tableCellStyle, tableHeaderStyle } from '../components/adminUi';

function parseDate(val) {
  if (!val) return null;
  if (typeof val.toDate === 'function') return val.toDate();
  if (val.seconds) return new Date(val.seconds * 1000);
  const d = new Date(val);
  return isNaN(d) ? null : d;
}

const STATUS_MAP = {
  pending: { label: 'انتظار', color: '#f59e0b' },
  accepted: { label: 'مقبول', color: '#10b981' },
  cancelled: { label: 'ملغي', color: '#ef4444' },
  completed: { label: 'مكتمل', color: '#3b82f6' },
};

function OrdersBarChart({ orders }) {
  const chartData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push({
        date: d,
        label: d.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' }),
        weekday: d.toLocaleDateString('ar-SA', { weekday: 'short' }),
        completed: 0,
        cancelled: 0,
        pending: 0,
      });
    }
    orders.forEach(o => {
      const d = parseDate(o.createdAt || o.timestamp);
      if (!d) return;
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const idx = days.findIndex(day => day.date.getTime() === dayStart.getTime());
      if (idx === -1) return;
      if (o.status === 'completed') days[idx].completed++;
      else if (o.status === 'cancelled') days[idx].cancelled++;
      else days[idx].pending++;
    });
    return days;
  }, [orders]);

  const maxVal = Math.max(...chartData.map(d => d.completed + d.cancelled + d.pending), 1);
  const W = 780, H = 180, PAD_L = 36, PAD_B = 40, PAD_T = 16, PAD_R = 16;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_B - PAD_T;
  const barW = Math.floor(chartW / chartData.length) - 4;
  const gridLines = [0.25, 0.5, 0.75, 1].map(ratio => ({
    y: PAD_T + chartH - ratio * chartH,
    val: Math.round(ratio * maxVal),
  }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', direction: 'ltr' }}>
      {gridLines.map((g, i) => (
        <g key={i}>
          <line x1={PAD_L} y1={g.y} x2={W - PAD_R} y2={g.y} stroke="#f0f0f0" strokeWidth="1" />
          <text x={PAD_L - 6} y={g.y + 4} fontSize="9" fill="#9ca3af" textAnchor="end">{g.val}</text>
        </g>
      ))}
      {chartData.map((d, i) => {
        const x = PAD_L + i * (chartW / chartData.length) + 2;
        const totalRaw = d.completed + d.cancelled + d.pending;
        const base = PAD_T + chartH;
        const hCompleted = totalRaw > 0 ? (d.completed / maxVal) * chartH : 0;
        const hCancelled = totalRaw > 0 ? (d.cancelled / maxVal) * chartH : 0;
        const hPending = totalRaw > 0 ? (d.pending / maxVal) * chartH : 0;
        return (
          <g key={i}>
            {hCompleted > 0 && (
              <rect x={x} y={base - hCompleted - hCancelled - hPending} width={barW} height={hCompleted} fill="#3b82f6" rx="2" opacity="0.9">
                <title>{`مكتمل: ${d.completed}`}</title>
              </rect>
            )}
            {hCancelled > 0 && (
              <rect x={x} y={base - hCancelled - hPending} width={barW} height={hCancelled} fill="#ef4444" rx="2" opacity="0.85">
                <title>{`ملغي: ${d.cancelled}`}</title>
              </rect>
            )}
            {hPending > 0 && (
              <rect x={x} y={base - hPending} width={barW} height={hPending} fill="#f59e0b" rx="2" opacity="0.85">
                <title>{`انتظار: ${d.pending}`}</title>
              </rect>
            )}
            {totalRaw > 0 && (
              <text x={x + barW / 2} y={base - hCompleted - hCancelled - hPending - 3} fontSize="8" fill="#374151" textAnchor="middle" fontWeight="bold">{totalRaw}</text>
            )}
            <text x={x + barW / 2} y={H - 4} fontSize="8" fill="#9ca3af" textAnchor="middle">{d.weekday}</text>
          </g>
        );
      })}
      <line x1={PAD_L} y1={PAD_T + chartH} x2={W - PAD_R} y2={PAD_T + chartH} stroke="#e5e7eb" strokeWidth="1.5" />
    </svg>
  );
}

export default function OverviewPage() {
  const { restaurants, orders, offers, branches } = useApp();

  const totalRevenue = orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + (o.finalPrice || 0), 0);
  const todayOrders = orders.filter(o => {
    const d = parseDate(o.createdAt || o.timestamp);
    return d && d.toDateString() === new Date().toDateString();
  });

  const stats = [
    { label: 'المطاعم', value: restaurants.length, icon: '🍽', color: '#15487d' },
    { label: 'الفروع', value: branches.length, icon: '📍', color: '#ee7b26' },
    { label: 'العروض النشطة', value: offers.filter(o => o.status !== 'inactive').length, icon: '🎁', color: '#10b981' },
    { label: 'إجمالي الطلبات', value: orders.length, icon: '🛍', color: '#8b5cf6' },
    { label: 'طلبات اليوم', value: todayOrders.length, icon: '📅', color: '#f59e0b' },
    { label: 'الإيرادات', value: `${totalRevenue.toFixed(0)} ر.س`, icon: '💰', color: '#ef4444' },
  ];

  const latestOrders = [...orders]
    .sort((a, b) => {
      const da = parseDate(a.createdAt || a.timestamp) || new Date(0);
      const db = parseDate(b.createdAt || b.timestamp) || new Date(0);
      return db - da;
    })
    .slice(0, 10);

  return (
    <div>
      <PageHeader
        icon="📊"
        title="لوحة التحكم"
        description="نظرة سريعة على أداء المنصة والطلبات والعروض والمطاعم"
        badge="ملخص اليوم"
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {stats.map((s, i) => (
          <StatCard key={i} icon={s.icon} label={s.label} value={s.value} color={s.color} />
        ))}
      </div>

      <AdminCard style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '16px', flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: '17px', fontWeight: 'bold', color: '#1a1a2e', margin: 0 }}>📊 الطلبات — آخر 14 يوماً</h3>
          <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#6b7280', flexWrap: 'wrap' }}>
            {[
              { color: '#3b82f6', label: 'مكتمل' },
              { color: '#ef4444', label: 'ملغي' },
              { color: '#f59e0b', label: 'انتظار' },
            ].map(l => (
              <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: 10, height: 10, background: l.color, borderRadius: 2, display: 'inline-block' }} />
                {l.label}
              </span>
            ))}
          </div>
        </div>
        <OrdersBarChart orders={orders} />
      </AdminCard>

      <TableCard>
        <div style={{ padding: '24px 24px 14px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#1a1a2e' }}>آخر الطلبات</h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['رقم الطلب', 'المستخدم', 'العرض', 'الحالة', 'التاريخ'].map(h => (
                <th key={h} style={tableHeaderStyle()}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {latestOrders.map(o => {
              const s = STATUS_MAP[o.status] || { label: o.status, color: '#6b7280' };
              const date = parseDate(o.createdAt || o.timestamp);
              const dateStr = date ? date.toLocaleDateString('ar-SA') : '-';
              return (
                <tr key={o.id}>
                  <td style={tableCellStyle({ color: '#6b7280', fontSize: '13px', fontFamily: 'monospace' })}>{o.id.slice(0, 8)}...</td>
                  <td style={tableCellStyle({ fontWeight: 700 })}>{o.userName || '-'}</td>
                  <td style={tableCellStyle()}>{o.offerName || '-'}</td>
                  <td style={tableCellStyle()}>
                    <span style={{ background: s.color + '20', color: s.color, padding: '4px 10px', borderRadius: '20px', fontSize: '13px', fontWeight: '600' }}>{s.label}</span>
                  </td>
                  <td style={tableCellStyle({ color: '#6b7280' })}>{dateStr}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {latestOrders.length === 0 ? <EmptyState text="لا توجد طلبات" /> : null}
      </TableCard>
    </div>
  );
}
