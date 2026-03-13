import React from 'react';
// استخدام الاختصار المشترك لضمان الوصول الصحيح والمستقر لملفات Firebase
import { db } from "@r2c/shared/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";

const OrderCard = ({ order, showToast }) => {
  const handleStatusUpdate = async (newStatus) => {
    try {
      if (!order?.id) return;

      const orderRef = doc(db, "orders", order.id);
      await updateDoc(orderRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      showToast(`تم ${newStatus === 'accepted' ? 'قبول' : 'رفض'} الطلب بنجاح`, "success");
    } catch (e) {
      console.error("Firebase Update Error:", e);
      showToast("خطأ في الاتصال بقاعدة البيانات", "error");
    }
  };

  return (
    <div className="order-card-v2 animate-in fade-in zoom-in duration-300">
      {/* كود الطلب العلوي بصيغة مطابقة للصورة */}
      <div className="absolute top-4 left-4 bg-[#063b33] text-[#14b8a6] px-2 py-0.5 rounded text-[10px] font-mono border border-[#14b8a6]/30">
        #{order.id ? order.id.slice(-5).toUpperCase() : 'XXXXX'}
      </div>

      <div className="mt-4 text-center">
        <h3 className="text-xl font-black text-white mb-2 leading-tight">
          {order.offerName || 'ملوخية + كفتة + أرز'}
        </h3>

        <p className="text-[#ee7b26] text-sm font-bold flex items-center justify-center gap-1">
          <span className="text-xs">📍</span> {order.city || 'القاهرة'}
        </p>

        <p className="text-slate-400 text-[10px] mt-1 font-semibold">
           🧭 العميل على بعد {order.distance || '2.3'} كم
        </p>

        <div className="mt-4 mb-4">
          <span className="text-3xl font-black text-[#ee7b26] drop-shadow-sm">
            {order.totalPrice || '86'} <span className="text-sm font-normal">ر.س</span>
          </span>
        </div>

        {/* حالة الطلب في الأسفل مع الأزرار الملونة */}
        <div className="pt-4 border-t border-[#14b8a6]/10">
          {order.status === 'completed' ? (
            <div className="bg-green-500/10 py-2 rounded-xl">
              <span className="text-green-400 text-xs font-bold flex items-center justify-center gap-1">
                ✓ مُسلم منذ {order.timePassed || '119 س'}
              </span>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => handleStatusUpdate('accepted')}
                className="flex-[2] bg-[#ee7b26] hover:bg-[#d96a1f] text-[#110d35] font-black py-3 rounded-xl text-sm transition-all active:scale-95 shadow-lg shadow-orange-900/20"
              >
                قبول الطلب
              </button>
              <button
                onClick={() => handleStatusUpdate('rejected')}
                className="flex-1 bg-[#8b151e]/20 hover:bg-[#8b151e]/40 text-red-400 px-4 py-3 rounded-xl text-xs font-bold transition-all border border-red-900/30"
              >
                رفض
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderCard;
