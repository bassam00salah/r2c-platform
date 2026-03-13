import React, { useState, useEffect, useRef } from "react";
import { usePartnerOrders } from "@r2c/shared";
import { db } from "@r2c/shared";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import OrderCard from "../components/OrderCard";
import Logo from "../components/logo";

const DashboardScreen = ({ branchId, setCurrentScreen, showToast }) => {
  const { orders = [], loading = false } = usePartnerOrders(branchId) || {};
  const [activeTab, setActiveTab]           = useState("new");
  const [partnerProfile, setPartnerProfile] = useState(null);
  const [pendingAckOrders, setPendingAckOrders] = useState([]);
  const seenRef = useRef(new Set());

  useEffect(() => {
    if (!branchId) return;
    getDoc(doc(db, "partners", branchId)).then(snap => {
      if (snap.exists()) setPartnerProfile(snap.data());
    });
  }, [branchId]);

  useEffect(() => {
    orders.forEach(o => {
      if (o.status === "accepted" && !seenRef.current.has(o.id)) {
        seenRef.current.add(o.id);
        setPendingAckOrders(prev => [...prev, o.id]);
      }
    });
  }, [orders]);

  const handleAcknowledgeOrder = (orderId) => {
    setPendingAckOrders(prev => prev.filter(id => id !== orderId));
  };

  const handleAcceptOrder = async (orderId) => {
    await updateDoc(doc(db, "orders", orderId), { status: "accepted" });
    showToast("تم قبول الطلب");
  };

  const handleRejectOrder = async (orderId) => {
    await updateDoc(doc(db, "orders", orderId), { status: "rejected" });
    showToast("تم رفض الطلب", "error");
  };

  const handleReadyOrder = async (orderId) => {
    await updateDoc(doc(db, "orders", orderId), { status: "ready" });
    showToast("تم تجهيز الطلب");
  };

  const newCount       = orders.filter(o => o.status === "preparing").length;
  const acceptedCount  = orders.filter(o => o.status === "accepted").length;
  const completedCount = orders.filter(o => o.status === "completed").length;

  const filteredOrders = orders.filter(o => {
    if (activeTab === "new")       return o.status === "preparing";
    if (activeTab === "accepted")  return o.status === "accepted";
    if (activeTab === "completed") return o.status === "completed";
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

      {/* Auto-accept banners */}
      {pendingAckOrders.map(orderId => {
        const ord = orders.find(o => o.id === orderId);
        return (
          <div key={orderId} className="rounded-2xl p-4 mb-3 flex items-center justify-between gap-3"
            style={{ background: "linear-gradient(135deg,#7f1d1d,#991b1b)", border: "2px solid #ef4444" }}>
            <div>
              <p className="font-black text-sm text-red-300">⚡ تم قبول الطلب تلقائياً</p>
              {ord && (
                <p className="text-xs text-red-200 font-bold mt-1">
                  #{orderId.slice(-5).toUpperCase()} — {ord.offerName || "عرض"}
                </p>
              )}
            </div>
            <button onClick={() => handleAcknowledgeOrder(orderId)}
              className="bg-red-500 text-white rounded-xl px-3 py-2 font-black text-xs whitespace-nowrap">
              🔕 تم قبول الطلب<br />إيقاف التنبيه
            </button>
          </div>
        );
      })}

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
            ${activeTab === "accepted" ? "bg-gray-700 text-white" : "bg-[#1e293b] text-gray-400"}`}>
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
            onAccept={() => handleAcceptOrder(order.id)}
            onReject={() => handleRejectOrder(order.id)}
            onReady={() => handleReadyOrder(order.id)}
            onView={() => setCurrentScreen("orderDetail", order)}
            showToast={showToast}
          />
        ))}
      </div>
    </div>
  );
};

export default DashboardScreen;
