import React, { useState, useEffect, useRef, useCallback } from "react";
import { usePartnerOrders, db } from "@r2c/shared";
import { ORDER_STATUS } from "@r2c/shared/constants/orderStatus";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import OrderCard from "../components/OrderCard";
import Logo from "../components/logo";

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

  // ── تتبع الطلبات الجديدة للتنبيه الصوتي ─────────────────────────────────
  const seenOrdersRef = useRef(new Set());   // الطلبات التي رأيناها من قبل
  const isFirstLoadRef = useRef(true);        // تجاهل الـ snapshot الأول

  useEffect(() => {
    if (!branchId) return;
    getDoc(doc(db, "partners", branchId)).then(snap => {
      if (snap.exists()) setPartnerProfile(snap.data());
    });
  }, [branchId]);

  useEffect(() => {
    if (loading) return;

    // الـ snapshot الأول: نسجّل الطلبات الموجودة بدون تنبيه
    if (isFirstLoadRef.current) {
      orders.forEach(o => seenOrdersRef.current.add(o.id));
      isFirstLoadRef.current = false;
      return;
    }

    // أي طلب pending جديد لم نره من قبل → نُنبّه
    orders.forEach(o => {
      if (o.status === ORDER_STATUS.PENDING && !seenOrdersRef.current.has(o.id)) {
        seenOrdersRef.current.add(o.id);
        playAlertSound();
        showToast('🔔 طلب جديد وارد!', 'success');
      }
      // نسجّل كل الطلبات حتى لو غير pending
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
    <div className="min-h-screen p-4 md:p-6 pb-24" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-3">
          <Logo className="h-7" />
          <div>
            <h1 className="text-xl font-bold text-[#ee7b26]">طلبات اليوم</h1>
            {partnerProfile?.restaurantName && (
              <p className="text-gray-300 text-xs font-bold">
                {partnerProfile.restaurantName} - {partnerProfile.name}
              </p>
            )}
            {partnerProfile?.city && (
              <p className="text-gray-400 text-xs">📍 {partnerProfile.city}</p>
            )}
            <div className="flex items-center gap-1 mt-1">
              <span style={{
                width: 8, height: 8, borderRadius: "50%", display: "inline-block",
                background: isListening ? "#10b981" : "#ef4444",
                boxShadow: isListening ? "0 0 6px #10b981" : "0 0 6px #ef4444"
              }}></span>
              <span style={{ fontSize: 10, color: isListening ? "#10b981" : "#ef4444", fontWeight: 700 }}>
                {isListening ? "مُتصل — يستقبل الطلبات" : "غير متصل"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setCurrentScreen("settings")}
            className="bg-[#1e293b] border border-slate-700 text-white px-3 py-2 rounded-xl text-sm">
            ⚙ الإعدادات
          </button>
          <button onClick={() => setCurrentScreen("reports")}
            className="bg-[#1e293b] border border-slate-700 text-white px-3 py-2 rounded-xl text-sm">
            📊 التقارير
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <button onClick={() => setActiveTab("new")}
          className={`flex-1 py-3 rounded-2xl font-black text-sm transition-all
            ${activeTab === "new" ? "bg-red-600 text-white" : "bg-[#1e293b] text-gray-400"}`}>
          جديدة {newCount > 0 && (
            <span className="bg-white text-red-600 rounded-full px-2 mr-1 text-xs font-bold">{newCount}</span>
          )}
        </button>
        <button onClick={() => setActiveTab("accepted")}
          className={`flex-1 py-3 rounded-2xl font-black text-sm transition-all
            ${activeTab === "accepted" ? "bg-blue-700 text-white" : "bg-[#1e293b] text-gray-400"}`}>
          مقبولة {acceptedCount > 0 && `(${acceptedCount})`}
        </button>
        <button onClick={() => setActiveTab("completed")}
          className={`flex-1 py-3 rounded-2xl font-black text-sm transition-all
            ${activeTab === "completed" ? "bg-green-700 text-white" : "bg-[#1e293b] text-gray-400"}`}>
          مُسلَّمة {completedCount > 0 && `(${completedCount})`}
        </button>
        <button onClick={() => setCurrentScreen("qrScanner")}
          className="bg-green-600 text-white px-5 rounded-2xl font-black text-sm">
          ⚡ مسح QR
        </button>
      </div>

      {/* Orders grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOrders.length === 0 ? (
          <div className="col-span-full text-center py-20">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-gray-400 text-xl">لا توجد طلبات في هذا القسم</p>
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
