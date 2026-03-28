import { useState } from 'react';
import { useApp } from '../context/AppContext';

const STATUS_MAP = {
  pending:   { label: 'انتظار',       color: '#f59e0b' },
  accepted:  { label: 'مقبول',        color: '#10b981' },
  cancelled: { label: 'ملغي',         color: '#ef4444' },
  completed: { label: 'مكتمل',        color: '#3b82f6' },
  timeout:   { label: 'انتهت المهلة', color: '#8b5cf6' },
};

function parseDate(val) {
  if (!val) return null;
  if (typeof val.toDate === 'function') return val.toDate();
  if (val.seconds) return new Date(val.seconds * 1000);
  const d = new Date(val);
  return isNaN(d) ? null : d;
}

export default function OrdersPage() {
  const { orders } = useApp();
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('الكل');
  const [dateFilter,   setDateFilter]   = useState('الكل');

  // ── فلترة حسب التاريخ ───────────────────────────────────────────────────
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today); monthAgo.setMonth(monthAgo.getMonth() - 1);

  const dateFilters = [
    { label: 'الكل',        fn: () => true },
    { label: 'اليوم',       fn: (o) => { const d = parseDate(o.createdAt || o.timestamp); return d && d >= today; } },
    { label: 'هذا الأسبوع', fn: (o) => { const d = parseDate(o.createdAt || o.timestamp); return d && d >= weekAgo; } },
    { label: 'هذا الشهر',   fn: (o) => { const d = parseDate(o.createdAt || o.timestamp); return d && d >= monthAgo; } },
  ];

  const activeDateFn = dateFilters.find(f => f.label === dateFilter)?.fn || (() => true);

  const filtered = [...orders]
  .sort((a, b) => {
    const da = parseDate(a.createdAt || a.timestamp) || new Date(0)
    const db = parseDate(b.createdAt || b.timestamp) || new Date(0)
    return db - da
  })
  .filter(o => {
    const matchSearch =
      o.userName?.includes(search) ||
      o.offerName?.includes(search) ||
      o.id.includes(search);
    const matchStatus =
      statusFilter === 'الكل' ||
      STATUS_MAP[o.status]?.label === statusFilter;
    return matchSearch && matchStatus && activeDateFn(o);
  });

  // ── إحصائيات سريعة ──────────────────────────────────────────────────────
  const counts = {
    total:     orders.length,
    pending:   orders.filter(o => o.status === 'pending').length,
    completed: orders.filter(o => o.status === 'completed').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  };

  const totalRevenue = orders
    .filter(o => o.status === 'completed')
    .reduce((s, o) => s + (o.finalPrice || 0), 0);

  return (
    <div>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a1a2e', marginBottom: '24px' }}>
        الطلبات ({orders.length})
      </h2>

      {/* بطاقات إحصائية */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'إجمالي الطلبات', value: counts.total,     color: '#15487d', icon: '🛍' },
          { label: 'في الانتظار',    value: counts.pending,   color: '#f59e0b', icon: '⏳' },
          { label: 'مكتملة',         value: counts.completed, color: '#10b981', icon: '✅' },
          { label: 'الإيرادات',      value: `${totalRevenue.toFixed(0)} ر.س`, color: '#ee7b26', icon: '💰' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', background: s.color + '18', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: s.color }}>{s.value}</div>
              <div style={{ color: '#6b7280', fontSize: '12px' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* فلاتر الحالة */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {['الكل', 'انتظار', 'مقبول', 'مكتمل', 'ملغي'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            style={{ padding: '7px 16px', background: statusFilter === s ? '#ee7b26' : 'white', color: statusFilter === s ? 'white' : '#374151', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
            {s}
          </button>
        ))}
        <div style={{ width: '1px', background: '#e5e7eb', margin: '0 4px' }}></div>
        {dateFilters.map(f => (
          <button key={f.label} onClick={() => setDateFilter(f.label)}
            style={{ padding: '7px 16px', background: dateFilter === f.label ? '#15487d' : 'white', color: dateFilter === f.label ? 'white' : '#374151', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* بحث */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="🔍 بحث بالاسم أو العرض أو رقم الطلب..."
        style={{ width: '100%', padding: '10px 16px', border: '2px solid #e5e7eb', borderRadius: '10px', marginBottom: '16px', fontSize: '15px', boxSizing: 'border-box' }}
      />

      {/* الجدول */}
      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['رقم الطلب', 'المستخدم', 'العرض', 'المبلغ', 'الحالة', 'التاريخ'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'right', color: '#374151', fontWeight: '600' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => {
              const s = STATUS_MAP[o.status] || { label: o.status, color: '#6b7280' };
              const date = parseDate(o.createdAt || o.timestamp);
              const dateStr = date ? date.toLocaleDateString('ar-SA') : '-';
              const timeStr = date ? date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '';
              return (
                <tr key={o.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '13px', fontFamily: 'monospace' }}>{o.id.slice(0, 10)}…</td>
                  <td style={{ padding: '12px 16px', fontWeight: '600' }}>{o.userName || '-'}</td>
                  <td style={{ padding: '12px 16px' }}>{o.offerName || '-'}</td>
                  <td style={{ padding: '12px 16px', fontWeight: '600', color: '#10b981' }}>
                    {o.finalPrice != null ? `${o.finalPrice} ر.س` : '-'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: s.color + '20', color: s.color, padding: '4px 10px', borderRadius: '20px', fontSize: '13px', fontWeight: '600' }}>
                      {s.label}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '13px' }}>
                    {dateStr}<br />
                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>{timeStr}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px', color: '#9ca3af' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
            لا توجد طلبات تطابق الفلاتر المحددة
          </div>
        )}
      </div>

      <div style={{ marginTop: '12px', color: '#9ca3af', fontSize: '13px', textAlign: 'left' }}>
        يُعرض {filtered.length} من {orders.length} طلب
      </div>
    </div>
  );
}
