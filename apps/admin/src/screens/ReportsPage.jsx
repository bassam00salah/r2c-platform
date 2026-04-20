import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  AdminCard,
  EmptyState,
  Field,
  PageHeader,
  StatCard as SharedStatCard,
  COLORS,
  ghostButtonStyle,
  inputStyle,
  secondaryButtonStyle,
} from '../components/adminUi';

function parseDate(val) {
  if (!val) return null;
  if (typeof val.toDate === 'function') return val.toDate();
  if (val.seconds) return new Date(val.seconds * 1000);
  const d = new Date(val);
  return isNaN(d) ? null : d;
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
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

function getOrderRestaurantId(order) {
  return String(order?.restaurantId || order?.restaurant?.id || order?.restaurant?.restaurantId || '').trim();
}

function getOrderRestaurantName(order) {
  return String(order?.restaurantName || order?.restaurant?.name || order?.restaurant || '').trim();
}

function getOrderBranchId(order) {
  return String(order?.branchId || order?.branch?.id || '').trim();
}

function getOrderBranchName(order) {
  return String(order?.branchName || order?.branch?.name || order?.branch || '').trim();
}

function getOrderOfferId(order) {
  return String(order?.offerId || order?.offer?.id || '').trim();
}

function getOrderOfferName(order) {
  return String(order?.offerName || order?.offer?.name || '').trim();
}

function buildOptions({ items, getId, getName, getRestaurantId }) {
  const map = new Map();

  items.forEach(item => {
    const id = String(getId?.(item) || '').trim();
    const name = String(getName?.(item) || '').trim();
    const restaurantId = String(getRestaurantId?.(item) || '').trim();
    if (!id && !name) return;
    const key = id ? `id:${id}` : `name:${normalizeText(name)}`;
    if (!map.has(key)) {
      map.set(key, { value: key, label: name || id, id, name, restaurantId });
    }
  });

  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, 'ar'));
}

function matchesOption(orderId, orderName, selectedValue, options) {
  if (!selectedValue || selectedValue === 'all') return true;
  const selected = options.find(opt => opt.value === selectedValue);
  if (!selected) return true;

  const normalizedOrderId = String(orderId || '').trim();
  const normalizedOrderName = normalizeText(orderName);

  if (selected.id && normalizedOrderId === selected.id) return true;
  if (selected.name && normalizedOrderName === normalizeText(selected.name)) return true;
  return false;
}

function matchesTimeFilter(order, timeFilter, fromDate, toDate) {
  const date = parseDate(order.createdAt || order.timestamp);
  if (!date) return false;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today); monthAgo.setMonth(monthAgo.getMonth() - 1);

  if (timeFilter === 'today') return date >= today;
  if (timeFilter === 'week') return date >= weekAgo;
  if (timeFilter === 'month') return date >= monthAgo;
  if (timeFilter === 'custom') {
    let valid = true;
    if (fromDate) {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      if (date < from) valid = false;
    }
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      if (date > to) valid = false;
    }
    return valid;
  }
  return true;
}

function exportReportCSV(stats, orders, activeFilters) {
  const rows = [
    ['تقرير R2C — ' + new Date().toLocaleDateString('ar-SA')],
    ['المطعم', activeFilters.restaurant || 'الكل'],
    ['الفرع', activeFilters.branch || 'الكل'],
    ['العرض', activeFilters.offer || 'الكل'],
    ['الوقت', activeFilters.time || 'الكل'],
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

function FiltersSummary({ count, restaurant, branch, offer, time }) {
  const chips = [
    restaurant ? `المطعم: ${restaurant}` : null,
    branch ? `الفرع: ${branch}` : null,
    offer ? `العرض: ${offer}` : null,
    time ? `الوقت: ${time}` : null,
  ].filter(Boolean);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginTop: '16px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {chips.length > 0 ? chips.map(chip => (
          <span key={chip} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 12px', background: '#fff7ed', color: COLORS.primaryDark, border: '1px solid #fed7aa', borderRadius: '999px', fontSize: '12px', fontWeight: '700' }}>
            {chip}
          </span>
        )) : (
          <span style={{ color: '#6b7280', fontSize: '13px' }}>لا توجد فلاتر مفعلة حالياً</span>
        )}
      </div>
      <div style={{ fontWeight: '800', color: '#1a1a2e', fontSize: '14px' }}>
        يعرض الآن {count} طلب
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const { orders, restaurants, offers, branches } = useApp();

  const [restaurantFilter, setRestaurantFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [offerFilter, setOfferFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const restaurantOptions = useMemo(() => buildOptions({
    items: [
      ...restaurants,
      ...orders.map(order => ({ id: getOrderRestaurantId(order), name: getOrderRestaurantName(order) })),
    ],
    getId: item => item.id,
    getName: item => item.name,
  }), [restaurants, orders]);

  const selectedRestaurantOption = restaurantOptions.find(opt => opt.value === restaurantFilter) || null;

  const branchOptions = useMemo(() => {
    const combined = [
      ...branches.map(branch => ({
        id: branch.id,
        name: branch.name,
        restaurantId: branch.restaurantId,
      })),
      ...orders.map(order => ({
        id: getOrderBranchId(order),
        name: getOrderBranchName(order),
        restaurantId: getOrderRestaurantId(order),
      })),
    ];

    const built = buildOptions({
      items: combined,
      getId: item => item.id,
      getName: item => item.name,
      getRestaurantId: item => item.restaurantId,
    });

    if (!selectedRestaurantOption) return built;

    return built.filter(option => {
      if (!option.restaurantId) return true;
      if (selectedRestaurantOption.id && option.restaurantId === selectedRestaurantOption.id) return true;
      return false;
    });
  }, [branches, orders, selectedRestaurantOption]);

  const offerOptions = useMemo(() => {
    const combined = [
      ...offers.map(offer => ({
        id: offer.id,
        name: offer.name,
        restaurantId: offer.restaurantId,
      })),
      ...orders.map(order => ({
        id: getOrderOfferId(order),
        name: getOrderOfferName(order),
        restaurantId: getOrderRestaurantId(order),
      })),
    ];

    const built = buildOptions({
      items: combined,
      getId: item => item.id,
      getName: item => item.name,
      getRestaurantId: item => item.restaurantId,
    });

    if (!selectedRestaurantOption) return built;

    return built.filter(option => {
      if (!option.restaurantId) return true;
      if (selectedRestaurantOption.id && option.restaurantId === selectedRestaurantOption.id) return true;
      return false;
    });
  }, [offers, orders, selectedRestaurantOption]);

  useEffect(() => {
    if (branchFilter !== 'all' && !branchOptions.some(option => option.value === branchFilter)) {
      setBranchFilter('all');
    }
    if (offerFilter !== 'all' && !offerOptions.some(option => option.value === offerFilter)) {
      setOfferFilter('all');
    }
  }, [restaurantFilter, branchFilter, offerFilter, branchOptions, offerOptions]);

  useEffect(() => {
    if (timeFilter !== 'custom') {
      setFromDate('');
      setToDate('');
    }
  }, [timeFilter]);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesRestaurant = matchesOption(
        getOrderRestaurantId(order),
        getOrderRestaurantName(order),
        restaurantFilter,
        restaurantOptions,
      );

      const matchesBranch = matchesOption(
        getOrderBranchId(order),
        getOrderBranchName(order),
        branchFilter,
        branchOptions,
      );

      const matchesOffer = matchesOption(
        getOrderOfferId(order),
        getOrderOfferName(order),
        offerFilter,
        offerOptions,
      );

      const matchesTime = matchesTimeFilter(order, timeFilter, fromDate, toDate);

      return matchesRestaurant && matchesBranch && matchesOffer && matchesTime;
    });
  }, [orders, restaurantFilter, restaurantOptions, branchFilter, branchOptions, offerFilter, offerOptions, timeFilter, fromDate, toDate]);

  const stats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today); monthAgo.setMonth(monthAgo.getMonth() - 1);

    const completed = filteredOrders.filter(o => o.status === 'completed');
    const cancelled = filteredOrders.filter(o => o.status === 'cancelled');
    const pending = filteredOrders.filter(o => o.status === 'pending');
    const todayOrders = filteredOrders.filter(o => { const d = parseDate(o.createdAt || o.timestamp); return d && d >= today; });
    const weekOrders = filteredOrders.filter(o => { const d = parseDate(o.createdAt || o.timestamp); return d && d >= weekAgo; });
    const monthOrders = filteredOrders.filter(o => { const d = parseDate(o.createdAt || o.timestamp); return d && d >= monthAgo; });

    const totalRevenue = completed.reduce((sum, order) => sum + (order.finalPrice || order.price || 0), 0);
    const weekRevenue = completed.filter(o => { const d = parseDate(o.createdAt || o.timestamp); return d && d >= weekAgo; }).reduce((sum, order) => sum + (order.finalPrice || order.price || 0), 0);
    const monthRevenue = completed.filter(o => { const d = parseDate(o.createdAt || o.timestamp); return d && d >= monthAgo; }).reduce((sum, order) => sum + (order.finalPrice || order.price || 0), 0);
    const avgOrder = completed.length > 0 ? (totalRevenue / completed.length).toFixed(1) : 0;
    const completionRate = filteredOrders.length > 0 ? Math.round((completed.length / filteredOrders.length) * 100) : 0;
    const cancellationRate = filteredOrders.length > 0 ? Math.round((cancelled.length / filteredOrders.length) * 100) : 0;

    const offerCount = {};
    filteredOrders.forEach(order => {
      const key = getOrderOfferName(order) || getOrderOfferId(order) || 'غير محدد';
      offerCount[key] = (offerCount[key] || 0) + 1;
    });
    const topOffers = Object.entries(offerCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const restCount = {};
    filteredOrders.forEach(order => {
      const key = getOrderRestaurantName(order) || getOrderRestaurantId(order) || 'غير محدد';
      restCount[key] = (restCount[key] || 0) + 1;
    });
    const topRestaurants = Object.entries(restCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const dailyCounts = {};
    const dailyRevenue = {};
    for (let i = 13; i >= 0; i -= 1) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' });
      dailyCounts[key] = 0;
      dailyRevenue[key] = 0;
    }

    filteredOrders.forEach(order => {
      const d = parseDate(order.createdAt || order.timestamp);
      if (!d) return;
      const key = d.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' });
      if (key in dailyCounts) {
        dailyCounts[key] += 1;
        if (order.status === 'completed') dailyRevenue[key] += order.finalPrice || order.price || 0;
      }
    });

    return {
      totalRevenue,
      weekRevenue,
      monthRevenue,
      avgOrder,
      completionRate,
      cancellationRate,
      todayOrders: todayOrders.length,
      weekOrders: weekOrders.length,
      monthOrders: monthOrders.length,
      topOffers,
      topRestaurants,
      dailyCounts,
      dailyRevenue,
      completedCount: completed.length,
      cancelledCount: cancelled.length,
      pendingCount: pending.length,
    };
  }, [filteredOrders]);

  const maxDaily = Math.max(...Object.values(stats.dailyCounts), 1);

  const activeFilterLabels = {
    restaurant: (restaurantOptions.find(opt => opt.value === restaurantFilter)?.label) || '',
    branch: (branchOptions.find(opt => opt.value === branchFilter)?.label) || '',
    offer: (offerOptions.find(opt => opt.value === offerFilter)?.label) || '',
    time:
      timeFilter === 'today' ? 'اليوم'
      : timeFilter === 'week' ? 'آخر 7 أيام'
      : timeFilter === 'month' ? 'آخر 30 يوماً'
      : timeFilter === 'custom' ? (fromDate || toDate ? `${fromDate || '...'} ← ${toDate || '...'}` : 'نطاق مخصص')
      : '',
  };

  const clearFilters = () => {
    setRestaurantFilter('all');
    setBranchFilter('all');
    setOfferFilter('all');
    setTimeFilter('all');
    setFromDate('');
    setToDate('');
  };

  return (
    <div dir="rtl">
      <PageHeader
        icon="📊"
        title="التقارير والإحصائيات"
        description="أضيفت فلاتر بالمطعم والفرع والعرض والوقت، وأصبحت كل الإحصائيات والرسوم والتصدير تعتمد على النتائج بعد الفلترة."
        badge="لوحة تحليلات"
        action={
          <button onClick={() => exportReportCSV(stats, filteredOrders, activeFilterLabels)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '11px 18px', background: '#15487d', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', boxShadow: '0 8px 20px rgba(21,72,125,0.18)' }}>
            ⬇️ تصدير التقرير CSV
          </button>
        }
      />

      <AdminCard style={{ marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '14px' }}>
          <Field label="المطعم">
            <select value={restaurantFilter} onChange={e => setRestaurantFilter(e.target.value)} style={inputStyle}>
              <option value="all">كل المطاعم</option>
              {restaurantOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </Field>

          <Field label="الفرع">
            <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} style={inputStyle}>
              <option value="all">كل الفروع</option>
              {branchOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </Field>

          <Field label="العرض">
            <select value={offerFilter} onChange={e => setOfferFilter(e.target.value)} style={inputStyle}>
              <option value="all">كل العروض</option>
              {offerOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </Field>

          <Field label="الوقت">
            <select value={timeFilter} onChange={e => setTimeFilter(e.target.value)} style={inputStyle}>
              <option value="all">كل الفترات</option>
              <option value="today">اليوم</option>
              <option value="week">آخر 7 أيام</option>
              <option value="month">آخر 30 يوماً</option>
              <option value="custom">نطاق مخصص</option>
            </select>
          </Field>
        </div>

        {timeFilter === 'custom' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '14px', marginTop: '14px', alignItems: 'end' }}>
            <Field label="من تاريخ">
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="إلى تاريخ">
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={inputStyle} />
            </Field>
            <button onClick={clearFilters} style={{ ...secondaryButtonStyle, whiteSpace: 'nowrap' }}>إعادة تعيين الفلاتر</button>
          </div>
        ) : (
          <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={clearFilters} style={ghostButtonStyle}>إعادة تعيين الفلاتر</button>
          </div>
        )}

        <FiltersSummary count={filteredOrders.length} {...activeFilterLabels} />
      </AdminCard>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '14px', marginBottom: '28px' }}>
        <SharedStatCard icon="💰" label="إجمالي الإيرادات" value={`${stats.totalRevenue.toFixed(0)} ر.س`} color="#10b981" />
        <SharedStatCard icon="📅" label="إيرادات الشهر" value={`${stats.monthRevenue.toFixed(0)} ر.س`} sub="داخل النتائج الحالية" color="#ee7b26" />
        <SharedStatCard icon="📆" label="إيرادات الأسبوع" value={`${stats.weekRevenue.toFixed(0)} ر.س`} sub="داخل النتائج الحالية" color="#15487d" />
        <SharedStatCard icon="🛍" label="إجمالي الطلبات" value={filteredOrders.length} color="#8b5cf6" />
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
              { label: 'الطلبات هذا الأسبوع', value: Math.round((stats.weekOrders / Math.max(filteredOrders.length, 1)) * 100), count: stats.weekOrders, color: '#ee7b26' },
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
