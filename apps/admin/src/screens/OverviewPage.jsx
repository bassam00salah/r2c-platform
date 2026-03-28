import { useApp } from '../context/AppContext';

// ── تحويل التاريخ بشكل صحيح سواء كان Timestamp أو string ─────────────────
function parseDate(val) {
  if (!val) return null;
  if (typeof val.toDate === 'function') return val.toDate();
  if (val.seconds) return new Date(val.seconds * 1000);
  const d = new Date(val);
  return isNaN(d) ? null : d;
}

const STATUS_MAP = {
  pending:   { label: 'انتظار',  color: '#f59e0b' },
  accepted:  { label: 'مقبول',   color: '#10b981' },
  cancelled: { label: 'ملغي',    color: '#ef4444' },
  completed: { label: 'مكتمل',   color: '#3b82f6' },
};

export default function OverviewPage() {
  const { restaurants, orders, offers, branches } = useApp();

  const totalRevenue = orders
    .filter(o => o.status === 'completed')
    .reduce((sum, o) => sum + (o.price || o.finalPrice || 0), 0);

  // ✅ يدعم createdAt و timestamp معاً
  const todayOrders = orders.filter(o => {
    const d = parseDate(o.createdAt || o.timestamp);
    return d && d.toDateString() === new Date().toDateString();
  });

  const stats = [
    { label: 'المطاعم',       value: restaurants.length,                                    icon: '🍽', color: '#15487d' },
    { label: 'الفروع',        value: branches.length,                                       icon: '📍', color: '#ee7b26' },
    { label: 'العروض النشطة', value: offers.filter(o => o.status !== 'inactive').length,    icon: '🎁', color: '#10b981' },
    { label: 'إجمالي الطلبات',value: orders.length,                                         icon: '🛍', color: '#8b5cf6' },
    { label: 'طلبات اليوم',   value: todayOrders.length,                                    icon: '📅', color: '#f59e0b' },
    { label: 'الإيرادات',     value: `${totalRevenue.toFixed(0)} ر.س`,                      icon: '💰', color: '#ef4444' },
  ];

  return (
    <div>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px', color: '#1a1a2e' }}>
        لوحة التحكم
      </h2>

      {/* إحصائيات */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {stats.map((s, i) => (
          <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '52px', height: '52px', background: s.color + '20', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: s.color }}>{s.value}</div>
              <div style={{ color: '#6b7280', fontSize: '14px' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* آخر الطلبات */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#1a1a2e' }}>
          آخر الطلبات
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['رقم الطلب', 'المستخدم', 'العرض', 'الحالة', 'التاريخ'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'right', color: '#374151', fontWeight: '600', fontSize: '14px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...orders]
  .sort((a, b) => {
    const da = parseDate(a.createdAt || a.timestamp) || new Date(0)
    const db = parseDate(b.createdAt || b.timestamp) || new Date(0)
    return db - da
  })
  .slice(0, 10)
  .map(o => {
              const s = STATUS_MAP[o.status] || { label: o.status, color: '#6b7280' };
              // ✅ يدعم createdAt و timestamp معاً
              const date = parseDate(o.createdAt || o.timestamp);
              const dateStr = date ? date.toLocaleDateString('ar-SA') : '-';
              return (
                <tr key={o.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 12px', color: '#6b7280', fontSize: '13px' }}>{o.id.slice(0, 8)}...</td>
                  <td style={{ padding: '10px 12px' }}>{o.userName || '-'}</td>
                  <td style={{ padding: '10px 12px' }}>{o.offerName || '-'}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ background: s.color + '20', color: s.color, padding: '4px 10px', borderRadius: '20px', fontSize: '13px', fontWeight: '600' }}>
                      {s.label}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', color: '#6b7280' }}>{dateStr}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {orders.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px', color: '#9ca3af' }}>لا توجد طلبات</div>
        )}
      </div>
    </div>
  );
}
