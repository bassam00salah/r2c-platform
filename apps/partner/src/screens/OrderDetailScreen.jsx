import React, { useState } from 'react';
import { db } from '@r2c/shared';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ORDER_STATUS } from '@r2c/shared/constants/orderStatus';
import Logo from '../components/logo';

const OrderDetailScreen = ({ order, setCurrentScreen, showToast }) => {
  const [loading, setLoading] = useState(false);
  if (!order) return null;

  const handleAction = async (status) => {
    setLoading(true);
    try {
      const updateData = {
        status,
        updatedAt: serverTimestamp(),
        ...(status === ORDER_STATUS.ACCEPTED && { acceptedAt: serverTimestamp() }),
        ...(status === ORDER_STATUS.REJECTED && { rejectedAt: serverTimestamp() }),
      };
      await updateDoc(doc(db, 'orders', order.id), updateData);
      const message = status === ORDER_STATUS.ACCEPTED ? 'تم قبول الطلب بنجاح' : 'تم رفض الطلب';
      const type    = status === ORDER_STATUS.ACCEPTED ? 'success' : 'error';
      showToast(message, type);
      setCurrentScreen('dashboard');
    } catch (err) {
      console.error('Error updating order:', err);
      showToast('حدث خطأ أثناء تحديث الطلب', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#110d35] p-6 text-right font-['Cairo'] text-white" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => setCurrentScreen('dashboard')}
          className="text-[#ee7b26] mb-8 font-bold flex items-center gap-2"
        >
          <span>→</span> العودة للوحة التحكم
        </button>

        <div className="bg-[#1e293b] p-8 rounded-[2.5rem] border border-slate-700 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl"></div>

          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-black">تفاصيل الطلب</h2>
            <span className="bg-[#063b33] text-emerald-400 px-4 py-1.5 rounded-xl font-mono text-sm border border-emerald-500/20">
              #{order.id}
            </span>
          </div>

          <div className="space-y-6 mb-12">
            <div className="bg-[#110d35] p-5 rounded-2xl border border-slate-700">
              <p className="text-xs text-slate-400 mb-1">الوجبة المطلوبة</p>
              <p className="text-xl font-black">{order.offerName}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#110d35] p-5 rounded-2xl border border-slate-700">
                <p className="text-xs text-slate-400 mb-1">المبلغ المطلوب</p>
                <p className="text-2xl font-black text-[#ee7b26]">{order.totalPrice || order.price} <span className="text-sm">ر.س</span></p>
              </div>
              <div className="bg-[#110d35] p-5 rounded-2xl border border-slate-700">
                <p className="text-xs text-slate-400 mb-1">طريقة الدفع</p>
                <p className="text-lg font-bold">نقداً عند الاستلام</p>
              </div>
            </div>

            <div className="bg-[#0a4f44]/20 p-5 rounded-2xl border border-emerald-500/10">
              <p className="text-xs text-emerald-400/60 mb-1">موقع العميل</p>
              <p className="text-sm font-bold">📍 {order.city} — يبعد عنك {order.distanceToUser || order.distance || '—'} </p>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => handleAction(ORDER_STATUS.ACCEPTED)}
              disabled={loading}
              className="flex-[2] bg-[#ee7b26] hover:bg-[#d96a1f] text-white font-black py-4 rounded-2xl shadow-xl shadow-orange-900/20 active:scale-95 transition-all text-lg disabled:opacity-50"
            >
              {loading ? '⏳ جاري التحديث...' : 'قبول الطلب ✅'}
            </button>
            <button
              onClick={() => handleAction(ORDER_STATUS.REJECTED)}
              disabled={loading}
              className="flex-1 bg-red-900/30 hover:bg-red-900/50 text-red-400 font-bold py-4 rounded-2xl border border-red-900/20 transition-all disabled:opacity-50"
            >
              رفض
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailScreen;
