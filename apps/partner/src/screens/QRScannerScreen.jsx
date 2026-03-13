import React, { useState, useEffect, useRef } from 'react';
// استيراد المكتبة - تأكد من تنفيذ npm install html5-qrcode في مجلد apps/partner
import { Html5QrcodeScanner } from 'html5-qrcode';
// استيراد معالج الطلبات من المجلد المشترك
import { handleQRScan } from '@r2c/shared/utils/orderHandlers';

const QRScannerScreen = ({ setCurrentScreen, showToast, partnerProfile }) => {
  const [scannerStatus, setScannerStatus] = useState('starting');
  const [manualCode, setManualCode] = useState('');
  const scannerInstanceRef = useRef(null);
  const mountedRef = useRef(true);

  // استخراج معرف الفرع (branchId) من ملف الشريك
  const branchId = partnerProfile?.branchId || partnerProfile?.uid;

  useEffect(() => {
    mountedRef.current = true;

    const startScanner = async () => {
      try {
        // إنشاء مثيل جديد للماسح الضوئي
        const scanner = new Html5QrcodeScanner(
          'qr-reader',
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          },
          /* verbose= */ false
        );

        scannerInstanceRef.current = scanner;

        scanner.render(
          async (decodedText) => {
            if (!mountedRef.current) return;

            // تنفيذ عملية التحقق من الكود عبر Firestore
            const result = await handleQRScan(decodedText, branchId);

            if (result.success) {
              setScannerStatus('success');
              showToast(result.message, 'success');
              if (mountedRef.current) {
                // العودة للوحة التحكم بعد نجاح العملية
                setTimeout(() => setCurrentScreen('dashboard'), 2000);
              }
            } else {
              showToast(result.message, 'error');
            }
          },
          (err) => {
            // تجاهل أخطاء الإطارات الفردية أثناء البحث عن كود
            if (scannerStatus !== 'active') setScannerStatus('active');
          }
        );
      } catch (err) {
        console.error("Scanner Start Error:", err);
        if (mountedRef.current) setScannerStatus('error');
      }
    };

    // تشغيل الماسح الضوئي
    startScanner();

    // تنظيف الذاكرة وإغلاق الكاميرا عند مغادرة الشاشة
    return () => {
      mountedRef.current = false;
      if (scannerInstanceRef.current) {
        try {
          scannerInstanceRef.current.clear().catch(error => {
            console.error("Failed to clear scanner on unmount", error);
          });
        } catch (e) {
          console.warn("Scanner cleanup error", e);
        }
      }
    };
  }, [branchId, showToast, setCurrentScreen]);

  const handleManualSubmit = async () => {
    const code = manualCode.trim();
    if (!code) {
      showToast('يرجى إدخال كود الطلب يدوياً', 'error');
      return;
    }

    const result = await handleQRScan(code, branchId);

    if (result.success) {
      setScannerStatus('success');
      showToast(result.message, 'success');
      setTimeout(() => setCurrentScreen('dashboard'), 2000);
    } else {
      showToast(result.message, 'error');
    }
  };

  // واجهة عرض النجاح عند تأكيد الطلب
  if (scannerStatus === 'success') {
    return (
      <div className="fixed inset-0 bg-green-900 flex flex-col items-center justify-center z-50 p-6 text-center animate-in fade-in duration-500">
        <div className="text-8xl mb-6 bounce-in">✅</div>
        <h1 className="text-3xl font-black text-green-400 mb-2">تم التأكيد!</h1>
        <p className="text-green-200 text-lg">تم تحديث حالة الطلب وتسليمه بنجاح</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6 pb-24 font-sans text-right" dir="rtl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">ماسح الكود</h1>
          <p className="text-sm text-gray-500">ضع كود QR الخاص بالعميل أمام الكاميرا</p>
        </div>
        <button
          onClick={() => setCurrentScreen('dashboard')}
          className="bg-gray-100 text-gray-600 px-4 py-2 rounded-xl font-bold hover:bg-gray-200 transition-colors"
        >
          إلغاء
        </button>
      </div>

      <div className="relative mx-auto max-w-md">
        <div
          id="qr-reader"
          className="overflow-hidden rounded-3xl border-4 border-gray-100 shadow-2xl bg-black aspect-square"
        ></div>

        {scannerStatus === 'starting' && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 rounded-3xl z-10">
             <div className="text-center">
                <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-white">جاري تشغيل الكاميرا...</p>
             </div>
          </div>
        )}

        {scannerStatus === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-50 rounded-3xl z-10 p-6 text-center">
             <div>
                <p className="text-red-600 font-bold mb-2">تعذر الوصول للكاميرا</p>
                <p className="text-sm text-red-400">يرجى التأكد من منح صلاحيات الكاميرا أو استخدام الإدخال اليدوي أدناه.</p>
             </div>
          </div>
        )}
      </div>

      <div className="mt-8 bg-gray-50 p-6 rounded-3xl border border-gray-100 max-w-md mx-auto">
        <h2 className="text-xs font-bold text-gray-400 mb-4 text-center uppercase tracking-widest">إدخال يدوي للطلب</h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="أدخل رمز الطلب هنا"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            className="flex-1 bg-white border-2 border-gray-200 rounded-2xl px-4 py-3 outline-none focus:border-green-500 transition-all text-center font-mono text-lg"
            dir="ltr"
          />
          <button
            onClick={handleManualSubmit}
            className="bg-green-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-green-200 active:scale-95 transition-transform"
          >
            تأكيد
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRScannerScreen;
