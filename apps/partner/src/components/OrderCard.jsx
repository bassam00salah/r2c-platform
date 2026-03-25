import React, { useState } from 'react';
import { db } from "@r2c/shared/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ORDER_STATUS } from "@r2c/shared/constants/orderStatus";

const OrderCard = ({ order, onAccept, onReject, onReady, onView, showToast }) => {
  const [loading, setLoading] = useState(false);

  const handleStatusUpdate = async (newStatus) => {
    setLoading(true);
    try {
      if (!order?.id) return;
      const timestamps = {
        [ORDER_STATUS.ACCEPTED]: { acceptedAt: serverTimestamp() },
        [ORDER_STATUS.REJECTED]: { rejectedAt: serverTimestamp() },
        [ORDER_STATUS.READY]:    { readyAt:    serverTimestamp() },
      };
      await updateDoc(doc(db, "orders", order.id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
        ...timestamps[newStatus],
      });
      const labels = {
        [ORDER_STATUS.ACCEPTED]: 'تم قبول الطلب',
        [ORDER_STATUS.REJECTED]: 'تم رفض الطلب',
        [ORDER_STATUS.READY]:    'تم تجهيز الطلب',
      };
      showToast(labels[newStatus], newStatus === ORDER_STATUS.REJECTED ? 'error' : 'success');
    } catch (e) {
      console.error("Firebase Update Error:", e);
      showToast("خطأ في الاتصال بقاعدة البيانات", "error");
    } finally {
      setLoading(false);
    }
  };

  const isPending  = order.status === ORDER_STATUS.PENDING;
  const isAccepted = order.status === ORDER_STATUS.ACCEPTED;
  const isReady    = order.status === ORDER_STATUS.READY;
  const isDone     = order.status === ORDER_STATUS.COMPLETED;

  return (
    <div className="order-card-v2 animate-in fade-in zoom-in duration-300">
      {/* كود الطلب */}
      <div className="absolute top-4 left-4 bg-[#063b33] text-[#14b8a6] px-2 py-0.5 rounded text-[10px] font-mono border border-[#14b8a6]/30">
        #{order.id ? order.id.slice(-5).toUpperCase() : 'XXXXX'}
      </div>

      {/* شريط الحالة العلوي */}
      <div className="absolute top-4 right-4">
        {isPending  && <span className="bg-yellow-500/20 text-yellow-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-yellow-500/30">⏳ جديد</span>}
        {isAccepted && <span className="bg-blue-500/20 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-500/30">✅ مقبول</span>}
        {isReady    && <span className="bg-green-500/20 text-green-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-500/30">🍽️ جاهز</span>}
        {isDone     && <span className="bg-gray-500/20 text-gray-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-gray-500/30">✓ مُسلَّم</span>}
      </div>

      <div className="mt-6 text-center">
        <h3 className="text-xl font-black text-white mb-2 leading-tight">
          {order.offerName || '—'}
        </h3>
        <p className="text-[#ee7b26] text-sm font-bold flex items-center justify-center gap-1">
          <span className="text-xs">📍</span> {order.city || '—'}
        </p>
        <p className="text-slate-400 text-[10px] mt-1 font-semibold">
          🧭 العميل على بعد {order.distanceToUser || order.distance || '—'}
        </p>
        <div className="mt-4 mb-4">
          <span className="text-3xl font-black text-[#ee7b26] drop-shadow-sm">
            {order.price || order.totalPrice || '—'} <span className="text-sm font-normal">ر.س</span>
          </span>
        </div>

        {/* الأزرار حسب الحالة */}
        <div className="pt-4 border-t border-[#14b8a6]/10">
          {isDone && (
            <div className="bg-green-500/10 py-2 rounded-xl">
              <span className="text-green-400 text-xs font-bold flex items-center justify-center gap-1">
                ✓ تم التسليم
              </span>
            </div>
          )}

          {isPending && (
            <div className="flex gap-3">
              <button
                onClick={() => handleStatusUpdate(ORDER_STATUS.ACCEPTED)}
                disabled={loading}
                className="flex-[2] bg-[#ee7b26] hover:bg-[#d96a1f] text-[#110d35] font-black py-3 rounded-xl text-sm transition-all active:scale-95 shadow-lg shadow-orange-900/20 disabled:opacity-50"
              >
                {loading ? '⏳' : 'قبول الطلب ✅'}
              </button>
              <button
                onClick={() => handleStatusUpdate(ORDER_STATUS.REJECTED)}
                disabled={loading}
                className="flex-1 bg-[#8b151e]/20 hover:bg-[#8b151e]/40 text-red-400 px-4 py-3 rounded-xl text-xs font-bold transition-all border border-red-900/30 disabled:opacity-50"
              >
                رفض
              </button>
            </div>
          )}

          {isAccepted && (
            <div className="flex gap-3">
              <button
                onClick={() => handleStatusUpdate(ORDER_STATUS.READY)}
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-black py-3 rounded-xl text-sm transition-all active:scale-95 shadow-lg disabled:opacity-50"
              >
                {loading ? '⏳' : '🍽️ تم التجهيز'}
              </button>
              {onView && (
                <button
                  onClick={onView}
                  className="px-4 py-3 bg-[#1e293b] text-gray-300 rounded-xl text-xs font-bold border border-slate-700"
                >
                  تفاصيل
                </button>
              )}
            </div>
          )}

          {isReady && (
            <div className="bg-green-500/10 py-3 rounded-xl border border-green-500/20">
              <p className="text-green-400 text-sm font-black">🎉 جاهز — في انتظار مسح QR</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderCard;
