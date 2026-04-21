import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { AdminCard, EmptyState, PageHeader, PillButton, StatCard, TableCard, inputStyle as uiInputStyle, tableCellStyle, tableHeaderStyle } from '../components/adminUi';

const STATUS_MAP = {
  pending:   { label: 'انتظار',       color: '#f59e0b' },
  accepted:  { label: 'مقبول',        color: '#10b981' },
  cancelled: { label: 'ملغي',         color: '#ef4444' },
  completed: { label: 'مكتمل',        color: '#3b82f6' },
  rejected:  { label: 'مرفوض',        color: '#dc2626' },
  timeout:   { label: 'انتهت المهلة', color: '#8b5cf6' },
};

function parseDate(val) {
  if (!val) return null;
  if (typeof val.toDate === 'function') return val.toDate();
  if (val.seconds) return new Date(val.seconds * 1000);
  const d = new Date(val);
  return isNaN(d) ? null : d;
}

function OrdersChart({ orders }) {
  const data = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      days.push({ date: d, label: d.toLocaleDateString('ar-SA', { weekday: 'short', day: 'numeric' }), completed: 0, cancelled: 0, rejected: 0, other: 0 });
    }
    orders.forEach(o => {
      const d = parseDate(o.createdAt || o.timestamp);
      if (!d) return;
      const ds = new Date(d); ds.setHours(0, 0, 0, 0);
      const idx = days.findIndex(day => day.date.getTime() === ds.getTime());
      if (idx === -1) return;
      if (o.status === 'completed') days[idx].completed++;
      else if (o.status === 'cancelled') days[idx].cancelled++;
      else if (o.status === 'rejected') days[idx].rejected++;
      else days[idx].other++;
    });
    return days;
  }, [orders]);

  const maxVal = Math.max(...data.map(d => d.completed + d.cancelled + d.rejected + d.other), 1);
  const W = 700, H = 150, PL = 30, PB = 32, PT = 12, PR = 12;
  const cW = W - PL - PR, cH = H - PB - PT;
  const bW = Math.floor(cW / data.length) - 6;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', direction: 'ltr' }}>
      {[0.5, 1].map((r, i) => (
        <g key={i}>
          <line x1={PL} y1={PT + cH - r * cH} x2={W - PR} y2={PT + cH - r * cH} stroke="#f0f0f0" strokeWidth="1" />
          <text x={PL - 4} y={PT + cH - r * cH + 4} fontSize="8" fill="#bbb" textAnchor="end">{Math.round(r * maxVal)}</text>
        </g>
      ))}
      {data.map((d, i) => {
        const x = PL + i * (cW / data.length) + 2;
        const base = PT + cH;
        const total = d.completed + d.cancelled + d.rejected + d.other;
        const hC = (d.completed / maxVal) * cH;
        const hX = (d.cancelled / maxVal) * cH;
        const hR = (d.rejected  / maxVal) * cH;
        const hO = (d.other     / maxVal) * cH;
        return (
          <g key={i}>
            {hO > 0 && <rect x={x} y={base - hC - hX - hR - hO} width={bW} height={hO} fill="#f59e0b" rx="2" opacity="0.8"><title>{`أخرى: ${d.other}`}</title></rect>}
            {hR > 0 && <rect x={x} y={base - hC - hX - hR} width={bW} height={hR} fill="#dc2626" rx="2" opacity="0.85"><title>{`مرفوض: ${d.rejected}`}</title></rect>}
            {hX > 0 && <rect x={x} y={base - hC - hX} width={bW} height={hX} fill="#ef4444" rx="2" opacity="0.85"><title>{`ملغي: ${d.cancelled}`}</title></rect>}
            {hC > 0 && <rect x={x} y={base - hC} width={bW} height={hC} fill="#3b82f6" rx="2" opacity="0.9"><title>{`مكتمل: ${d.completed}`}</title></rect>}
            {total > 0 && <text x={x + bW / 2} y={base - hC - hX - hR - hO - 3} fontSize="8" fill="#374151" textAnchor="middle" fontWeight="bold">{total}</text>}
            <text x={x + bW / 2} y={H - 4} fontSize="8" fill="#9ca3af" textAnchor="middle">{d.label}</text>
          </g>
        );
      })}
      <line x1={PL} y1={PT + cH} x2={W - PR} y2={PT + cH} stroke="#e5e7eb" strokeWidth="1.5" />
    </svg>
  );
}

function exportCSV(orders) {
  const rows = [
    ['رقم الطلب', 'المستخدم', 'العرض', 'المبلغ', 'الحالة', 'التاريخ'],
    ...orders.map(o => {
      const s = STATUS_MAP[o.status]?.label || o.status;
      const date = parseDate(o.createdAt || o.timestamp);
      const dateStr = date ? date.toLocaleDateString('ar-SA') + ' ' + date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '-';
      return [o.id, o.userName || '-', o.offerName || '-', o.finalPrice ?? '-', s, dateStr];
    }),
  ];
  const csv = '\uFEFF' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function OrdersPage() {
  const { orders } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('الكل');
  const [dateFilter, setDateFilter] = useState('الكل');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showChart, setShowChart] = useState(true);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today); monthAgo.setMonth(monthAgo.getMonth() - 1);

  const quickDateFilters = [
    { label: 'الكل', fn: () => true },
    { label: 'اليوم', fn: (o) => { const d = parseDate(o.createdAt || o.timestamp); return d && d >= today; } },
    { label: 'هذا الأسبوع', fn: (o) => { const d = parseDate(o.createdAt || o.timestamp); return d && d >= weekAgo; } },
    { label: 'هذا الشهر', fn: (o) => { const d = parseDate(o.createdAt || o.timestamp); return d && d >= monthAgo; } },
  ];
  const activeDateFn = quickDateFilters.find(f => f.label === dateFilter)?.fn || (() => true);

  const filtered = useMemo(() => {
    return [...orders]
      .sort((a, b) => {
        const da = parseDate(a.createdAt || a.timestamp) || new Date(0);
        const db = parseDate(b.createdAt || b.timestamp) || new Date(0);
        return db - da;
      })
      .filter(o => {
        const matchSearch = o.userName?.includes(search) || o.offerName?.includes(search) || o.id.includes(search);
        const matchStatus =
          statusFilter === 'الكل' ||
          STATUS_MAP[o.status]?.label === statusFilter ||
          (statusFilter === 'الملغية والمرفوضة' && (o.status === 'cancelled' || o.status === 'rejected'));

        let matchCustomDate = true;
        if (fromDate || toDate) {
          const d = parseDate(o.createdAt || o.timestamp);
          if (!d) return false;
          if (fromDate) {
            const from = new Date(fromDate); from.setHours(0, 0, 0, 0);
            if (d < from) matchCustomDate = false;
          }
          if (toDate) {
            const to = new Date(toDate); to.setHours(23, 59, 59, 999);
            if (d > to) matchCustomDate = false;
          }
          return matchSearch && matchStatus && matchCustomDate;
        }

        return matchSearch && matchStatus && activeDateFn(o);
      });
  }, [orders, search, statusFilter, dateFilter, fromDate, toDate, activeDateFn]);

  const counts = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    completed: orders.filter(o => o.status === 'completed').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
    rejected: orders.filter(o => o.status === 'rejected').length,
  };

  const totalRevenue = orders.filter(o => o.status === 'completed').reduce((s, o) => s + (o.finalPrice || 0), 0);
  const statusButtons = ['الكل', 'انتظار', 'مقبول', 'مكتمل', 'ملغي', 'مرفوض', 'الملغية والمرفوضة', 'انتهت المهلة'];

  return (
    <div>
      <PageHeader
        icon="📦"
        title={`الطلبات (${orders.length})`}
        description=""
        badge="إدارة العمليات"
        action={
          <button
            onClick={() => exportCSV(filtered)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '11px 18px', background: '#15487d', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', boxShadow: '0 8px 20px rgba(21,72,125,0.18)' }}
          >
            ⬇️ تصدير CSV ({filtered.length})
          </button>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'إجمالي', value: counts.total, color: '#15487d', icon: '🛍' },
          { label: 'انتظار', value: counts.pending, color: '#f59e0b', icon: '⏳' },
          { label: 'مكتملة', value: counts.completed, color: '#10b981', icon: '✅' },
          { label: 'ملغية', value: counts.cancelled, color: '#ef4444', icon: '❌' },
          { label: 'مرفوضة', value: counts.rejected, color: '#dc2626', icon: '🚫' },
        ].map((s, i) => (
          <StatCard key={i} icon={s.icon} label={s.label} value={s.value} color={s.color} />
        ))}
      </div>

      <AdminCard style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '14px' }}>
          <h3 style={{ fontWeight: 'bold', color: '#1a1a2e', margin: 0, fontSize: '15px' }}>📊 الطلبات — آخر 7 أيام</h3>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '10px', fontSize: '11px', flexWrap: 'wrap' }}>
              {[{ color: '#3b82f6', label: 'مكتمل' }, { color: '#ef4444', label: 'ملغي' }, { color: '#dc2626', label: 'مرفوض' }, { color: '#f59e0b', label: 'أخرى' }].map(l => (
                <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#6b7280' }}>
                  <span style={{ width: 9, height: 9, background: l.color, borderRadius: 2, display: 'inline-block' }} />
                  {l.label}
                </span>
              ))}
            </div>
            <button onClick={() => setShowChart(!showChart)} style={{ padding: '6px 12px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '10px', cursor: 'pointer', fontSize: '12px', color: '#6b7280', fontWeight: 700 }}>
              {showChart ? 'إخفاء' : 'إظهار'}
            </button>
          </div>
        </div>
        {showChart && <OrdersChart orders={orders} />}
      </AdminCard>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
        {statusButtons.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            style={{
              padding: '8px 14px',
              background: statusFilter === s ? (s === 'الملغية والمرفوضة' ? '#dc2626' : '#ee7b26') : 'white',
              color: statusFilter === s ? 'white' : '#374151',
              border: `1px solid ${s === 'الملغية والمرفوضة' ? '#fca5a5' : '#e5e7eb'}`,
              borderRadius: '999px', cursor: 'pointer', fontWeight: '700', fontSize: '13px',
            }}
          >
            {s === 'الملغية والمرفوضة' ? '🚫 الملغية والمرفوضة' : s}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: '600' }}>📅</span>
        {quickDateFilters.map(f => (
          <PillButton key={f.label} label={f.label} active={dateFilter === f.label && !fromDate && !toDate} onClick={() => { setDateFilter(f.label); setFromDate(''); setToDate(''); }} activeColor="#15487d" />
        ))}
        <div style={{ width: '1px', background: '#e5e7eb', height: '28px', margin: '0 6px' }} />
        <span style={{ fontSize: '13px', color: '#6b7280' }}>من:</span>
        <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setDateFilter(''); }} style={{ padding: '8px 10px', border: `1.5px solid ${fromDate ? '#15487d' : '#e5e7eb'}`, borderRadius: '10px', fontSize: '13px', cursor: 'pointer' }} />
        <span style={{ fontSize: '13px', color: '#6b7280' }}>إلى:</span>
        <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setDateFilter(''); }} style={{ padding: '8px 10px', border: `1.5px solid ${toDate ? '#15487d' : '#e5e7eb'}`, borderRadius: '10px', fontSize: '13px', cursor: 'pointer' }} />
        {(fromDate || toDate) && (
          <button onClick={() => { setFromDate(''); setToDate(''); setDateFilter('الكل'); }} style={{ padding: '8px 12px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '12px' }}>✕ مسح</button>
        )}
      </div>

      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="🔍 بحث بالاسم أو العرض أو رقم الطلب..."
        style={{ ...uiInputStyle, marginBottom: '16px' }}
      />

      <TableCard>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['رقم الطلب', 'المستخدم', 'العرض', 'المبلغ', 'الحالة', 'التاريخ'].map(h => (
                <th key={h} style={tableHeaderStyle()}>{h}</th>
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
                <tr key={o.id}>
                  <td style={tableCellStyle({ color: '#6b7280', fontSize: '13px', fontFamily: 'monospace' })}>{o.id.slice(0, 10)}…</td>
                  <td style={tableCellStyle({ fontWeight: '600' })}>{o.userName || '-'}</td>
                  <td style={tableCellStyle()}>{o.offerName || '-'}</td>
                  <td style={tableCellStyle({ fontWeight: '600', color: '#10b981' })}>{o.finalPrice != null ? `${o.finalPrice} ر.س` : '-'}</td>
                  <td style={tableCellStyle()}>
                    <span style={{ background: s.color + '20', color: s.color, padding: '4px 10px', borderRadius: '20px', fontSize: '13px', fontWeight: '600' }}>{s.label}</span>
                  </td>
                  <td style={tableCellStyle({ color: '#6b7280', fontSize: '13px' })}>
                    {dateStr}<br />
                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>{timeStr}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 ? <EmptyState icon="📭" text="لا توجد طلبات تطابق الفلاتر المحددة" /> : null}
      </TableCard>

      <div style={{ marginTop: '12px', color: '#9ca3af', fontSize: '13px', textAlign: 'left' }}>يُعرض {filtered.length} من {orders.length} طلب</div>
      <div style={{ marginTop: '8px', color: '#10b981', fontSize: '13px', fontWeight: 700 }}>إجمالي الإيرادات المكتملة: {totalRevenue.toFixed(0)} ر.س</div>
    </div>
  );
}
