import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { AdminCard, EmptyState, PageHeader, StatCard as SharedStatCard } from '../components/adminUi';

function parseDate(val) {
  if (!val) return null;
  if (typeof val.toDate === 'function') return val.toDate();
  if (val.seconds) return new Date(val.seconds * 1000);
  const d = new Date(val);
  return isNaN(d) ? null : d;
}

function ProgressBar({ value, max, color = '#ee7b26' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ background: '#f3f4f6', borderRadius: '99px', height: '8px', overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, background: color, height: '100%', borderRadius: '99px', transition: 'width 0.4s' }} />
    </div>
  );
}

function DualLineChart({ dailyCounts, dailyRevenue }) {
  const days = Object.keys(dailyCounts);
  const countVals = Object.values(dailyCounts);
  const revenueVals = Object.values(dailyRevenue);

  const maxCount = Math.max(...countVals, 1);
  const maxRevenue = Math.max(...revenueVals, 1);

  const W = 760, H = 180, PL = 42, PB = 36, PT = 16, PR = 16;
  const cW = W - PL - PR, cH = H - PB - PT;
  const stepX = cW / Math.max(days.length - 1, 1);

  const pointsCount = days.map((_, i) => ({ x: PL + i * stepX, y: PT + cH - (countVals[i] / maxCount) * cH }));
  const pointsRevenue = days.map((_, i) => ({ x: PL + i * stepX, y: PT + cH - (revenueVals[i] / maxRevenue) * cH }));

  const toPath = pts => pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', direction: 'ltr' }}>
      {[0.25, 0.5, 0.75, 1].map((r, i) => (
        <line key={i} x1={PL} y1={PT + cH - r * cH} x2={W - PR} y2={PT + cH - r * cH} stroke="#f0f0f0" strokeWidth="1" />
      ))}
      <path d={`${toPath(pointsCount)} L${pointsCount[pointsCount.length - 1].x},${PT + cH} L${PL},${PT + cH} Z`} fill="#ee7b26" opacity="0.08" />
      <path d={toPath(pointsCount)} fill="none" stroke="#ee7b26" strokeWidth="2.5" strokeLinejoin="round" />
      <path d={`${toPath(pointsRevenue)} L${pointsRevenue[pointsRevenue.length - 1].x},${PT + cH} L${PL},${PT + cH} Z`} fill="#10b981" opacity="0.08" />
      <path d={toPath(pointsRevenue)} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinejoin="round" strokeDasharray="5 3" />
      {pointsCount.map((p, i) => <circle key={`c${i}`} cx={p.x} cy={p.y} r="4" fill="#ee7b26" stroke="white" strokeWidth="1.5"><title>{`طلبات: ${countVals[i]}`}</title></circle>)}
      {pointsRevenue.map((p, i) => <circle key={`r${i}`} cx={p.x} cy={p.y} r="4" fill="#10b981" stroke="white" strokeWidth="1.5"><title>{`إيرادات: ${revenueVals[i].toFixed(0)} ر.س`}</title></circle>)}
      {days.map((d, i) => <text key={i} x={PL + i * stepX} y={H - 4} fontSize="8" fill="#9ca3af" textAnchor="middle">{d}</text>)}
      <text x={PL - 4} y={PT + cH} fontSize="8" fill="#9ca3af" textAnchor="end">0</text>
      <text x={PL - 4} y={PT + cH / 2} fontSize="8" fill="#9ca3af" textAnchor="end">{Math.round(maxCount / 2)}</text>
      <text x={PL - 4} y={PT + 4} fontSize="8" fill="#9ca3af" textAnchor="end">{maxCount}</text>
      <line x1={PL} y1={PT + cH} x2={W - PR} y2={PT + cH} stroke="#e5e7eb" strokeWidth="1.5" />
    </svg>
  );
}

function PieChart({ completed, cancelled, pending }) {
  const total = completed + cancelled + pending;
  if (total === 0) return <div style={{ textAlign: 'center', color: '#9ca3af', padding: '24px' }}>لا توجد بيانات</div>;

  const slices = [
    { value: completed, color: '#3b82f6', label: 'مكتمل' },
    { value: cancelled, color: '#ef4444', label: 'ملغي' },
    { value: pending, color: '#f59e0b', label: 'انتظار' },
  ].filter(s => s.value > 0);

  const R = 70, CX = 90, CY = 90;
  let startAngle = -Math.PI / 2;
  const paths = slices.map(slice => {
    const angle = (slice.value / total) * 2 * Math.PI;
    const endAngle = startAngle + angle;
    const x1 = CX + R * Math.cos(startAngle);
    const y1 = CY + R * Math.sin(startAngle);
    const x2 = CX + R * Math.cos(endAngle);
    const y2 = CY + R * Math.sin(endAngle);
    const large = angle > Math.PI ? 1 : 0;
    const d = `M${CX},${CY} L${x1.toFixed(2)},${y1.toFixed(2)} A${R},${R} 0 ${large} 1 ${x2.toFixed(2)},${y2.toFixed(2)} Z`;
    startAngle = endAngle;
    return { ...slice, d };
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <svg viewBox="0 0 180 180" style={{ width: 140, height: 140, flexShrink: 0 }}>
        {paths.map((s, i) => <path key={i} d={s.d} fill={s.color} stroke="white" strokeWidth="2"><title>{s.label}: {s.value}</title></path>)}
        <circle cx={CX} cy={CY} r="36" fill="white" />
        <text x={CX} y={CY - 6} fontSize="16" fontWeight="bold" fill="#1a1a2e" textAnchor="middle">{total}</text>
        <text x={CX} y={CY + 12} fontSize="8" fill="#9ca3af" textAnchor="middle">طلبات</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {slices.map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: 12, height: 12, background: s.color, borderRadius: '50%', flexShrink: 0 }} />
            <span style={{ fontSize: '13px', color: '#374151', fontWeight: '600' }}>{s.label}</span>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>{s.value} ({Math.round((s.value / total) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function exportReportCSV(stats, orders) {
  const rows = [
    ['تقرير R2C — ' + new Date().toLocaleDateString('ar-SA')],
    [],
    ['الإيرادات الإجمالية', stats.totalRevenue.toFixed(2) + ' ر.س'],
    ['إيرادات هذا الشهر', stats.monthRevenue.toFixed(2) + ' ر.س'],
    ['إيرادات هذا الأسبوع', stats.weekRevenue.toFixed(2) + ' ر.س'],
    ['متوسط قيمة الطلب', stats.avgOrder + ' ر.س'],
    ['إجمالي الطلبات', orders.length],
    ['طلبات مكتملة', stats.completedCount],
    ['طلبات ملغية', stats.cancelledCount],
    ['معدل الإكمال', stats.completionRate + '%'],
    [],
    ['يوم', 'عدد الطلبات'],
    ...Object.entries(stats.dailyCounts).map(([day, count]) => [day, count]),
    [],
    ['العرض', 'عدد الطلبات'],
    ...stats.topOffers.map(([name, count]) => [name, count]),
    [],
    ['المطعم', 'عدد الطلبات'],
    ...stats.topRestaurants.map(([name, count]) => [name, count]),
  ];
  const csv = '\uFEFF' + rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `report_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const { orders, restaurants, offers, branches } = useApp();

  const stats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today); monthAgo.setMonth(monthAgo.getMonth() - 1);

    const completed = orders.filter(o => o.status === 'completed');
    const cancelled = orders.filter(o => o.status === 'cancelled');
    const pending = orders.filter(o => o.status === 'pending');
    const todayOrders = orders.filter(o => { const d = parseDate(o.createdAt || o.timestamp); return d && d >= today; });
    const weekOrders = orders.filter(o => { const d = parseDate(o.createdAt || o.timestamp); return d && d >= weekAgo; });
    const monthOrders = orders.filter(o => { const d = parseDate(o.createdAt || o.timestamp); return d && d >= monthAgo; });

    const totalRevenue = completed.reduce((s, o) => s + (o.finalPrice || 0), 0);
    const weekRevenue = completed.filter(o => { const d = parseDate(o.createdAt || o.timestamp); return d && d >= weekAgo; }).reduce((s, o) => s + (o.finalPrice || 0), 0);
    const monthRevenue = completed.filter(o => { const d = parseDate(o.createdAt || o.timestamp); return d && d >= monthAgo; }).reduce((s, o) => s + (o.finalPrice || 0), 0);
    const avgOrder = completed.length > 0 ? (totalRevenue / completed.length).toFixed(1) : 0;
    const completionRate = orders.length > 0 ? Math.round((completed.length / orders.length) * 100) : 0;
    const cancellationRate = orders.length > 0 ? Math.round((cancelled.length / orders.length) * 100) : 0;

    const offerCount = {};
    orders.forEach(o => { const k = o.offerName || o.offerId || 'غير محدد'; offerCount[k] = (offerCount[k] || 0) + 1; });
    const topOffers = Object.entries(offerCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const restCount = {};
    orders.forEach(o => { const k = o.restaurantName || o.restaurantId || 'غير محدد'; restCount[k] = (restCount[k] || 0) + 1; });
    const topRestaurants = Object.entries(restCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const dailyCounts = {};
    const dailyRevenue = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' });
      dailyCounts[key] = 0;
      dailyRevenue[key] = 0;
    }
    orders.forEach(o => {
      const d = parseDate(o.createdAt || o.timestamp);
      if (!d) return;
      const key = d.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' });
      if (key in dailyCounts) {
        dailyCounts[key]++;
        if (o.status === 'completed') dailyRevenue[key] += o.finalPrice || 0;
      }
    });

    return {
      totalRevenue, weekRevenue, monthRevenue, avgOrder,
      completionRate, cancellationRate,
      todayOrders: todayOrders.length, weekOrders: weekOrders.length, monthOrders: monthOrders.length,
      topOffers, topRestaurants, dailyCounts, dailyRevenue,
      completedCount: completed.length, cancelledCount: cancelled.length, pendingCount: pending.length,
    };
  }, [orders]);

  const maxDaily = Math.max(...Object.values(stats.dailyCounts), 1);

  return (
    <div dir="rtl">
      <PageHeader
        icon="📊"
        title="التقارير والإحصائيات"
        description="تم الإبقاء على كل الرسوم والإحصائيات والتصدير CSV كما في النسخة التي رفعتِها، مع تنسيق بصري موحد فقط."
        badge="لوحة تحليلات"
        action={
          <button onClick={() => exportReportCSV(stats, orders)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '11px 18px', background: '#15487d', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', boxShadow: '0 8px 20px rgba(21,72,125,0.18)' }}>
            ⬇️ تصدير التقرير CSV
          </button>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '14px', marginBottom: '28px' }}>
        <SharedStatCard icon="💰" label="إجمالي الإيرادات" value={`${stats.totalRevenue.toFixed(0)} ر.س`} color="#10b981" />
        <SharedStatCard icon="📅" label="إيرادات الشهر" value={`${stats.monthRevenue.toFixed(0)} ر.س`} sub="آخر 30 يوم" color="#ee7b26" />
        <SharedStatCard icon="📆" label="إيرادات الأسبوع" value={`${stats.weekRevenue.toFixed(0)} ر.س`} sub="آخر 7 أيام" color="#15487d" />
        <SharedStatCard icon="🛍" label="إجمالي الطلبات" value={orders.length} color="#8b5cf6" />
        <SharedStatCard icon="☀️" label="طلبات اليوم" value={stats.todayOrders} color="#f59e0b" />
        <SharedStatCard icon="📈" label="متوسط قيمة الطلب" value={`${stats.avgOrder} ر.س`} color="#3b82f6" />
      </div>

      <AdminCard style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '16px', flexWrap: 'wrap' }}>
          <h3 style={{ fontWeight: 'bold', color: '#1a1a2e', margin: 0 }}>📈 الأداء — آخر 14 يوماً</h3>
          <div style={{ display: 'flex', gap: '16px', fontSize: '12px', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#6b7280' }}><span style={{ width: 20, height: 3, background: '#ee7b26', display: 'inline-block', borderRadius: 2 }} /> عدد الطلبات</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#6b7280' }}><span style={{ width: 20, height: 0, borderTop: '3px dashed #10b981', display: 'inline-block' }} /> الإيرادات</span>
          </div>
        </div>
        <DualLineChart dailyCounts={stats.dailyCounts} dailyRevenue={stats.dailyRevenue} />
      </AdminCard>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        <AdminCard>
          <h3 style={{ fontWeight: 'bold', marginBottom: '20px', color: '#1a1a2e' }}>معدلات الأداء</h3>
          <div style={{ display: 'grid', gap: '16px' }}>
            {[
              { label: 'معدل الإكمال', value: stats.completionRate, count: stats.completedCount, color: '#10b981' },
              { label: 'معدل الإلغاء', value: stats.cancellationRate, count: stats.cancelledCount, color: '#ef4444' },
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
        </AdminCard>

        <AdminCard>
          <h3 style={{ fontWeight: 'bold', marginBottom: '20px', color: '#1a1a2e' }}>توزيع حالات الطلبات</h3>
          <PieChart completed={stats.completedCount} cancelled={stats.cancelledCount} pending={stats.pendingCount} />
        </AdminCard>
      </div>

      <AdminCard style={{ marginBottom: '24px' }}>
        <h3 style={{ fontWeight: 'bold', marginBottom: '20px', color: '#1a1a2e' }}>نشاط المنصة</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px' }}>
          {[
            { icon: '🍽', label: 'المطاعم المسجلة', value: restaurants.length, color: '#15487d' },
            { icon: '📍', label: 'الفروع النشطة', value: branches.length, color: '#ee7b26' },
            { icon: '🎁', label: 'العروض المتاحة', value: offers.filter(o => o.status !== 'inactive').length, color: '#10b981' },
            { icon: '📦', label: 'طلبات هذا الشهر', value: stats.monthOrders, color: '#8b5cf6' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: '#f9fafb', borderRadius: '12px', border: '1px solid #edf0f5' }}>
              <span style={{ fontSize: '14px', fontWeight: '600' }}>{item.icon} {item.label}</span>
              <span style={{ fontWeight: 'bold', color: item.color, fontSize: '20px' }}>{item.value}</span>
            </div>
          ))}
        </div>
      </AdminCard>

      <AdminCard style={{ marginBottom: '24px' }}>
        <h3 style={{ fontWeight: 'bold', marginBottom: '20px', color: '#1a1a2e' }}>الطلبات — آخر 7 أيام</h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: '120px' }}>
          {Object.entries(stats.dailyCounts).slice(-7).map(([day, count]) => (
            <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#374151' }}>{count}</span>
              <div style={{ width: '100%', height: `${maxDaily > 0 ? Math.max((count / maxDaily) * 90, count > 0 ? 8 : 4) : 4}px`, background: count > 0 ? '#ee7b26' : '#e5e7eb', borderRadius: '8px 8px 0 0', transition: 'height 0.3s' }} />
              <span style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center', whiteSpace: 'nowrap' }}>{day}</span>
            </div>
          ))}
        </div>
      </AdminCard>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <AdminCard>
          <h3 style={{ fontWeight: 'bold', marginBottom: '16px', color: '#1a1a2e' }}>🏆 أكثر العروض طلباً</h3>
          {stats.topOffers.length === 0 ? <EmptyState text="لا توجد بيانات" style={{ padding: '20px' }} /> : stats.topOffers.map(([name, count], i) => (
            <div key={name} style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ fontWeight: '600', fontSize: '14px' }}>#{i + 1} {name}</span>
                <span style={{ color: '#ee7b26', fontWeight: 'bold' }}>{count}</span>
              </div>
              <ProgressBar value={count} max={stats.topOffers[0]?.[1] || 1} color="#ee7b26" />
            </div>
          ))}
        </AdminCard>

        <AdminCard>
          <h3 style={{ fontWeight: 'bold', marginBottom: '16px', color: '#1a1a2e' }}>🍽 أكثر المطاعم طلباً</h3>
          {stats.topRestaurants.length === 0 ? <EmptyState text="لا توجد بيانات" style={{ padding: '20px' }} /> : stats.topRestaurants.map(([name, count], i) => (
            <div key={name} style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ fontWeight: '600', fontSize: '14px' }}>#{i + 1} {name}</span>
                <span style={{ color: '#15487d', fontWeight: 'bold' }}>{count}</span>
              </div>
              <ProgressBar value={count} max={stats.topRestaurants[0]?.[1] || 1} color="#15487d" />
            </div>
          ))}
        </AdminCard>
      </div>
    </div>
  );
}
