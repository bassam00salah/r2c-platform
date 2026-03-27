import { useMemo } from 'react';
import { useApp } from '../context/AppContext';

function parseDate(val) {
  if (!val) return null;
  if (typeof val.toDate === 'function') return val.toDate();
  if (val.seconds) return new Date(val.seconds * 1000);
  const d = new Date(val);
  return isNaN(d) ? null : d;
}

// ── شريط تقدم بسيط ─────────────────────────────────────────────────────────
function ProgressBar({ value, max, color = '#ee7b26' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ background: '#f3f4f6', borderRadius: '99px', height: '8px', overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, background: color, height: '100%', borderRadius: '99px', transition: 'width 0.4s' }} />
    </div>
  );
}

// ── بطاقة إحصائية ──────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color = '#15487d' }) {
  return (
    <div style={{ background: 'white', borderRadius: '14px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={{ width: '52px', height: '52px', background: color + '18', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color }}>{value}</div>
        <div style={{ color: '#374151', fontWeight: '600', fontSize: '14px' }}>{label}</div>
        {sub && <div style={{ color: '#9ca3af', fontSize: '12px', marginTop: '2px' }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const { orders, restaurants, offers, branches } = useApp();

  const stats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const completed = orders.filter(o => o.status === 'completed');
    const cancelled = orders.filter(o => o.status === 'cancelled');
    const todayOrders = orders.filter(o => { const d = parseDate(o.createdAt || o.timestamp); return d && d >= today; });
    const weekOrders  = orders.filter(o => { const d = parseDate(o.createdAt || o.timestamp); return d && d >= weekAgo; });
    const monthOrders = orders.filter(o => { const d = parseDate(o.createdAt || o.timestamp); return d && d >= monthAgo; });

    const totalRevenue  = completed.reduce((s, o) => s + (o.finalPrice || 0), 0);
    const weekRevenue   = completed.filter(o => { const d = parseDate(o.createdAt || o.timestamp); return d && d >= weekAgo; }).reduce((s, o) => s + (o.finalPrice || 0), 0);
    const monthRevenue  = completed.filter(o => { const d = parseDate(o.createdAt || o.timestamp); return d && d >= monthAgo; }).reduce((s, o) => s + (o.finalPrice || 0), 0);
    const avgOrder      = completed.length > 0 ? (totalRevenue / completed.length).toFixed(1) : 0;
    const completionRate = orders.length > 0 ? Math.round((completed.length / orders.length) * 100) : 0;
    const cancellationRate = orders.length > 0 ? Math.round((cancelled.length / orders.length) * 100) : 0;

    // أكثر العروض طلباً
    const offerCount = {};
    orders.forEach(o => {
      const key = o.offerName || o.offerId || 'غير محدد';
      offerCount[key] = (offerCount[key] || 0) + 1;
    });
    const topOffers = Object.entries(offerCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // أكثر المطاعم طلباً
    const restCount = {};
    orders.forEach(o => {
      const key = o.restaurantName || o.restaurantId || 'غير محدد';
      restCount[key] = (restCount[key] || 0) + 1;
    });
    const topRestaurants = Object.entries(restCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // الطلبات حسب اليوم (آخر 7 أيام)
    const dailyCounts = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('ar-SA', { weekday: 'short', day: 'numeric' });
      dailyCounts[key] = 0;
    }
    orders.forEach(o => {
      const d = parseDate(o.createdAt || o.timestamp);
      if (d && d >= weekAgo) {
        const key = d.toLocaleDateString('ar-SA', { weekday: 'short', day: 'numeric' });
        if (key in dailyCounts) dailyCounts[key]++;
      }
    });

    return {
      totalRevenue, weekRevenue, monthRevenue, avgOrder,
      completionRate, cancellationRate,
      todayOrders: todayOrders.length,
      weekOrders: weekOrders.length,
      monthOrders: monthOrders.length,
      topOffers, topRestaurants, dailyCounts,
      completedCount: completed.length,
      cancelledCount: cancelled.length,
    };
  }, [orders]);

  const maxDaily = Math.max(...Object.values(stats.dailyCounts), 1);

  return (
    <div dir="rtl">
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a1a2e', marginBottom: '24px' }}>
        📊 التقارير والإحصائيات
      </h2>

      {/* ── البطاقات الرئيسية ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '28px' }}>
        <StatCard icon="💰" label="إجمالي الإيرادات"   value={`${stats.totalRevenue.toFixed(0)} ر.س`} color="#10b981" />
        <StatCard icon="📅" label="إيرادات الشهر"       value={`${stats.monthRevenue.toFixed(0)} ر.س`} sub="آخر 30 يوم"  color="#ee7b26" />
        <StatCard icon="📆" label="إيرادات الأسبوع"     value={`${stats.weekRevenue.toFixed(0)} ر.س`}  sub="آخر 7 أيام"  color="#15487d" />
        <StatCard icon="🛍" label="إجمالي الطلبات"      value={orders.length}       color="#8b5cf6" />
        <StatCard icon="☀️" label="طلبات اليوم"         value={stats.todayOrders}   color="#f59e0b" />
        <StatCard icon="📈" label="متوسط قيمة الطلب"   value={`${stats.avgOrder} ر.س`} color="#3b82f6" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>

        {/* ── معدلات الأداء ── */}
        <div style={{ background: 'white', borderRadius: '14px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.07)' }}>
          <h3 style={{ fontWeight: 'bold', marginBottom: '20px', color: '#1a1a2e' }}>معدلات الأداء</h3>
          <div style={{ display: 'grid', gap: '16px' }}>
            {[
              { label: 'معدل الإكمال',  value: stats.completionRate,  count: stats.completedCount, color: '#10b981' },
              { label: 'معدل الإلغاء',  value: stats.cancellationRate, count: stats.cancelledCount, color: '#ef4444' },
              { label: 'الطلبات هذا الأسبوع', value: Math.round((stats.weekOrders / Math.max(orders.length, 1)) * 100), count: stats.weekOrders, color: '#ee7b26' },
            ].map((item, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontWeight: '600', fontSize: '14px' }}>{item.label}</span>
                  <span style={{ fontWeight: 'bold', color: item.color }}>{item.value}% <span style={{ color: '#9ca3af', fontWeight: 'normal', fontSize: '12px' }}>({item.count})</span></span>
                </div>
                <ProgressBar value={item.value} max={100} color={item.color} />
              </div>
            ))}
          </div>
        </div>

        {/* ── نشاط المنصة ── */}
        <div style={{ background: 'white', borderRadius: '14px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.07)' }}>
          <h3 style={{ fontWeight: 'bold', marginBottom: '20px', color: '#1a1a2e' }}>نشاط المنصة</h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            {[
              { icon: '🍽', label: 'المطاعم المسجلة',  value: restaurants.length, color: '#15487d' },
              { icon: '📍', label: 'الفروع النشطة',     value: branches.length,    color: '#ee7b26' },
              { icon: '🎁', label: 'العروض المتاحة',    value: offers.filter(o => o.status !== 'inactive').length, color: '#10b981' },
              { icon: '📦', label: 'طلبات هذا الشهر',   value: stats.monthOrders,  color: '#8b5cf6' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f9fafb', borderRadius: '10px' }}>
                <span style={{ fontSize: '14px', fontWeight: '600' }}>{item.icon} {item.label}</span>
                <span style={{ fontWeight: 'bold', color: item.color, fontSize: '18px' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── الطلبات اليومية (آخر 7 أيام) ── */}
      <div style={{ background: 'white', borderRadius: '14px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.07)', marginBottom: '24px' }}>
        <h3 style={{ fontWeight: 'bold', marginBottom: '20px', color: '#1a1a2e' }}>الطلبات — آخر 7 أيام</h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: '120px' }}>
          {Object.entries(stats.dailyCounts).map(([day, count]) => (
            <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#374151' }}>{count}</span>
              <div style={{
                width: '100%',
                height: `${maxDaily > 0 ? Math.max((count / maxDaily) * 90, count > 0 ? 8 : 4) : 4}px`,
                background: count > 0 ? '#ee7b26' : '#e5e7eb',
                borderRadius: '6px 6px 0 0',
                transition: 'height 0.3s',
              }} />
              <span style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center', whiteSpace: 'nowrap' }}>{day}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        {/* ── أكثر العروض طلباً ── */}
        <div style={{ background: 'white', borderRadius: '14px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.07)' }}>
          <h3 style={{ fontWeight: 'bold', marginBottom: '16px', color: '#1a1a2e' }}>🏆 أكثر العروض طلباً</h3>
          {stats.topOffers.length === 0
            ? <p style={{ color: '#9ca3af', textAlign: 'center', padding: '20px' }}>لا توجد بيانات</p>
            : stats.topOffers.map(([name, count], i) => (
              <div key={name} style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontWeight: '600', fontSize: '14px' }}>#{i + 1} {name}</span>
                  <span style={{ color: '#ee7b26', fontWeight: 'bold' }}>{count}</span>
                </div>
                <ProgressBar value={count} max={stats.topOffers[0]?.[1] || 1} color="#ee7b26" />
              </div>
            ))
          }
        </div>

        {/* ── أكثر المطاعم طلباً ── */}
        <div style={{ background: 'white', borderRadius: '14px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.07)' }}>
          <h3 style={{ fontWeight: 'bold', marginBottom: '16px', color: '#1a1a2e' }}>🍽 أكثر المطاعم طلباً</h3>
          {stats.topRestaurants.length === 0
            ? <p style={{ color: '#9ca3af', textAlign: 'center', padding: '20px' }}>لا توجد بيانات</p>
            : stats.topRestaurants.map(([name, count], i) => (
              <div key={name} style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontWeight: '600', fontSize: '14px' }}>#{i + 1} {name}</span>
                  <span style={{ color: '#15487d', fontWeight: 'bold' }}>{count}</span>
                </div>
                <ProgressBar value={count} max={stats.topRestaurants[0]?.[1] || 1} color="#15487d" />
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}
