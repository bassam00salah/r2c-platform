import { useState } from 'react';
import { useApp } from '../context/AppContext';

const STATUS_MAP = {
  pending:   { label: 'انتظار',       color: '#f59e0b' },
  accepted:  { label: 'مقبول',        color: '#10b981' },
  cancelled: { label: 'ملغي',         color: '#ef4444' },
  completed: { label: 'مكتمل',        color: '#3b82f6' },
  timeout:   { label: 'انتهت المهلة', color: '#8b5cf6' },
};

// ── تحويل التاريخ بشكل صحيح سواء كان Timestamp أو string ─────────────────
function parseDate(val) {
  if (!val) return null;
  if (typeof val.toDate === 'function') return val.toDate();       // Firestore Timestamp
  if (val.seconds) return new Date(val.seconds * 1000);            // Timestamp object
  const d = new Date(val);
  return isNaN(d) ? null : d;
}

export default function OrdersPage() {
  const { orders } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('الكل');

  const filtered = orders.filter(o => {
    const matchSearch =
      o.userName?.includes(search) ||
      o.offerName?.includes(search) ||
      o.id.includes(search);
    const matchStatus =
      statusFilter === 'الكل' ||
      STATUS_MAP[o.status]?.label === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a1a2e', marginBottom: '24px' }}>
        الطلبات ({orders.length})
      </h2>

      {/* فلاتر الحالة */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {['الكل', 'انتظار', 'مقبول', 'مكتمل', 'ملغي'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            style={{
              padding: '8px 16px',
              background: statusFilter === s ? '#ee7b26' : 'white',
              color: statusFilter === s ? 'white' : '#374151',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* بحث */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="بحث..."
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
              // ✅ يدعم createdAt و timestamp معاً
              const date = parseDate(o.createdAt || o.timestamp);
              const dateStr = date ? date.toLocaleDateString('ar-SA') : '-';
              return (
                <tr key={o.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '13px' }}>{o.id.slice(0, 10)}...</td>
                  <td style={{ padding: '12px 16px' }}>{o.userName || '-'}</td>
                  <td style={{ padding: '12px 16px' }}>{o.offerName || '-'}</td>
                  <td style={{ padding: '12px 16px', fontWeight: '600', color: '#10b981' }}>
                    {o.finalPrice ? `${o.finalPrice} ر.س` : '-'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: s.color + '20', color: s.color, padding: '4px 10px', borderRadius: '20px', fontSize: '13px', fontWeight: '600' }}>
                      {s.label}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#6b7280' }}>{dateStr}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px', color: '#9ca3af' }}>لا توجد طلبات</div>
        )}
      </div>
    </div>
  );
}
