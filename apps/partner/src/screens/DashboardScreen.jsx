import React, { useState, useEffect, useRef, useCallback } from "react";
import { usePartnerOrders, db } from "@r2c/shared";
import { ORDER_STATUS } from "@r2c/shared/constants/orderStatus";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import OrderCard from "../components/OrderCard";
import Logo from "../components/logo";

// ── قائمة الأقسام الجانبية ──────────────────────────────────────────────────
function OrdersMenuDrawer({ isOpen, onClose, counts, activeTab, onSelectTab }) {
  const tabs = [
    { key: "new",       label: "جديدة",   icon: "🆕", color: "bg-red-500",    count: counts.new },
    { key: "accepted",  label: "مقبولة",  icon: "✅", color: "bg-blue-500",   count: counts.accepted },
    { key: "completed", label: "مُسلَّمة", icon: "📦", color: "bg-green-500",  count: counts.completed },
  ];

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-72 bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "translate-x-full"}`}
        dir="rtl"
      >
        {/* Header */}
        <div className="bg-[#1e2337] text-white p-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black">📋 أقسام الطلبات</h2>
            <p className="text-xs text-gray-400 mt-0.5">اختر القسم للعرض</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tabs List */}
        <div className="p-4 space-y-3">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => { onSelectTab(tab.key); onClose(); }}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all border-2
                ${activeTab === tab.key
                  ? "border-[#ee7b26] bg-[#ee7b26]/10"
                  : "border-gray-100 bg-gray-50 hover:bg-gray-100"}`}
            >
              <div className={`w-10 h-10 rounded-xl ${tab.color} flex items-center justify-center text-white text-lg shadow-sm flex-shrink-0`}>
                {tab.icon}
              </div>
              <div className="flex-1 text-right">
                <div className={`font-black text-base ${activeTab === tab.key ? "text-[#ee7b26]" : "text-[#1e2337]"}`}>
                  {tab.label}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {tab.count} {tab.count === 1 ? "طلب" : "طلبات"}
                </div>
              </div>
              {tab.count > 0 && (
                <span className={`${tab.color} text-white text-xs font-bold px-2.5 py-1 rounded-full min-w-[28px] text-center`}>
                  {tab.count}
                </span>
              )}
              {activeTab === tab.key && (
                <span className="text-[#ee7b26] text-lg">◀</span>
              )}
            </button>
          ))}
        </div>

        {/* Summary */}
        <div className="mx-4 mt-2 bg-gray-50 rounded-2xl p-4 border border-gray-100">
          <div className="text-xs text-gray-500 font-bold mb-2">ملخص اليوم</div>
          <div className="flex justify-between text-center">
            <div>
              <div className="text-2xl font-black text-red-500">{counts.new}</div>
              <div className="text-xs text-gray-400">جديدة</div>
            </div>
            <div className="w-px bg-gray-200"></div>
            <div>
              <div className="text-2xl font-black text-blue-500">{counts.accepted}</div>
              <div className="text-xs text-gray-400">مقبولة</div>
            </div>
            <div className="w-px bg-gray-200"></div>
            <div>
              <div className="text-2xl font-black text-green-500">{counts.completed}</div>
              <div className="text-xs text-gray-400">مُسلَّمة</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── تشغيل صوت تنبيه عند ورود طلب جديد ──────────────────────────────────────
function playAlertSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const beep = (freq, start, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.4, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };
    beep(880, 0,    0.15);
    beep(660, 0.2,  0.15);
    beep(880, 0.4,  0.15);
    beep(1100, 0.6, 0.3);
  } catch (e) {
    console.warn('Audio not available:', e);
  }
}

const DashboardScreen = ({ branchId, setCurrentScreen, showToast }) => {
  const { orders = [], loading = false } = usePartnerOrders(branchId) || {};
  const [activeTab, setActiveTab]           = useState("new");
  const [partnerProfile, setPartnerProfile] = useState(null);
  const [drawerOpen, setDrawerOpen]         = useState(false);

  // ── تتبع الطلبات الجديدة للتنبيه الصوتي ─────────────────────────────────
  const seenOrdersRef = useRef(new Set());
  const isFirstLoadRef = useRef(true);

 useEffect(() => {
    if (!branchId) return;
    // تم تغيير partners إلى branches ليتطابق مع قاعدة بياناتك
    getDoc(doc(db, "branches", branchId)).then(snap => {
      if (snap.exists()) {
        setPartnerProfile(snap.data());
      } else {
        console.warn("وثيقة الفرع غير موجودة في قاعدة البيانات لهذا الـ branchId");
      }
    }).catch(err => console.error("خطأ في جلب بيانات الفرع:", err));
  }, [branchId]);

  useEffect(() => {
    if (loading) return;

    if (isFirstLoadRef.current) {
      orders.forEach(o => seenOrdersRef.current.add(o.id));
      isFirstLoadRef.current = false;
      return;
    }

    orders.forEach(o => {
      if (o.status === ORDER_STATUS.PENDING && !seenOrdersRef.current.has(o.id)) {
        seenOrdersRef.current.add(o.id);
        playAlertSound();
        showToast('🔔 طلب جديد وارد!', 'success');
      }
      if (!seenOrdersRef.current.has(o.id)) {
        seenOrdersRef.current.add(o.id);
      }
    });
  }, [orders, loading]);

  const newCount       = orders.filter(o => o.status === ORDER_STATUS.PENDING).length;
  const acceptedCount  = orders.filter(o => o.status === ORDER_STATUS.ACCEPTED).length;
  const completedCount = orders.filter(o => o.status === ORDER_STATUS.COMPLETED).length;

  const filteredOrders = orders.filter(o => {
    if (activeTab === "new")       return o.status === ORDER_STATUS.PENDING;
    if (activeTab === "accepted")  return o.status === ORDER_STATUS.ACCEPTED || o.status === ORDER_STATUS.READY;
    if (activeTab === "completed") return o.status === ORDER_STATUS.COMPLETED;
    return false;
  });

  const isListening = !!branchId;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#ee7b26] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 pb-24 font-sans text-gray-800" dir="rtl">

      {/* ── Drawer القائمة الجانبية ─────────────────────────────────────── */}
      <OrdersMenuDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        counts={{ new: newCount, accepted: acceptedCount, completed: completedCount }}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-start mb-6 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">

        {/* الجانب الأيمن: اللوجو والبيانات */}
        <div className="flex flex-col">
          {/* الصف الأول: اللوجو وعنوان طلبات اليوم */}
          <div className="flex items-center gap-3 mb-2">
            <div dir="ltr" className="flex items-center">
              <Logo className="h-8" />
            </div>
            <span className="text-gray-300 mx-1">|</span>
            <h1 className="text-xl font-bold text-[#ee7b26]">طلبات اليوم</h1>
          </div>

          {/* الصف الثاني: اسم المطعم والفرع ثم حالة الاتصال */}
          <div className="pr-1">

            {/* التعديل هنا: إضافة نصوص بديلة لاكتشاف المشكلة */}
            <p className="text-[#1e2337] font-bold text-lg mb-1 min-h-[28px]">
              {!partnerProfile ? (
                <span className="text-gray-400 text-sm">⏳ جاري تحميل بيانات المطعم...</span>
              ) : (
                <>
                  {partnerProfile.restaurantName || <span className="text-red-400 text-sm">⚠️ (اسم المطعم مفقود)</span>}
                  <span className="text-gray-500 font-normal text-sm mx-2">
                    ({partnerProfile.name || "الفرع مفقود"})
                  </span>
                </>
              )}
            </p>

            <div className="flex items-center gap-1.5 mt-1">
              <span className="relative flex h-2.5 w-2.5">
                {isListening && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75"></span>}
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isListening ? "bg-[#10b981]" : "bg-[#ef4444]"}`}></span>
              </span>
              <span className={`text-xs font-bold ${isListening ? "text-[#10b981]" : "text-[#ef4444]"}`}>
                {isListening ? "مُتصل — يستقبل الطلبات" : "غير متصل"}
              </span>
            </div>
          </div>
        </div>

        {/* الجانب الأيسر: الأزرار */}
        <div className="flex gap-2">
          <button onClick={() => setDrawerOpen(true)}
            className="relative bg-[#ee7b26] hover:bg-[#d96b1a] transition-colors text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm">
            ☰ القائمة
            {newCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {newCount}
              </span>
            )}
          </button>
          <button onClick={() => setCurrentScreen("settings")}
            className="bg-[#1e2337] hover:bg-gray-800 transition-colors text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm">
            ⚙ الإعدادات
          </button>
          <button onClick={() => setCurrentScreen("reports")}
            className="bg-[#1e2337] hover:bg-gray-800 transition-colors text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm">
            📊 التقارير
          </button>
        </div>
      </div>
      {/* ──────────────────────────────────────────────────────────────── */}

      {/* Tabs */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <button onClick={() => setActiveTab("new")}
          className={`flex-1 py-3 rounded-2xl font-black text-sm transition-all shadow-sm
            ${activeTab === "new" ? "bg-red-600 text-white" : "bg-[#1e2337] text-gray-300 hover:bg-gray-800"}`}>
          جديدة {newCount > 0 && (
            <span className="bg-white text-red-600 rounded-full px-2 mr-1 text-xs font-bold">{newCount}</span>
          )}
        </button>
        <button onClick={() => setActiveTab("accepted")}
          className={`flex-1 py-3 rounded-2xl font-black text-sm transition-all shadow-sm
            ${activeTab === "accepted" ? "bg-[#1e2337] text-white ring-2 ring-offset-2 ring-[#1e2337]" : "bg-[#1e2337] text-gray-300 hover:bg-gray-800"}`}>
          مقبولة {acceptedCount > 0 && `(${acceptedCount})`}
        </button>
        <button onClick={() => setActiveTab("completed")}
          className={`flex-1 py-3 rounded-2xl font-black text-sm transition-all shadow-sm
            ${activeTab === "completed" ? "bg-[#1e2337] text-white ring-2 ring-offset-2 ring-[#1e2337]" : "bg-[#1e2337] text-gray-300 hover:bg-gray-800"}`}>
          مُسلَّمة {completedCount > 0 && `(${completedCount})`}
        </button>
        <button onClick={() => setCurrentScreen("qrScanner")}
          className="bg-green-500 hover:bg-green-600 transition-colors text-white px-5 rounded-2xl font-black text-sm shadow-sm flex items-center gap-1">
          ⚡ مسح QR
        </button>
      </div>

      {/* Orders grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOrders.length === 0 ? (
          <div className="col-span-full text-center py-20">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-gray-400 text-xl font-medium">لا توجد طلبات في هذا القسم</p>
          </div>
        ) : filteredOrders.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            onView={() => setCurrentScreen("orderDetail", order)}
            showToast={showToast}
          />
        ))}
      </div>
    </div>
  );
};

export default DashboardScreen;
