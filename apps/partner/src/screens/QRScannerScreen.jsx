import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { handleQRScan } from '@r2c/shared/utils/orderHandlers';

const QRScannerScreen = ({ setCurrentScreen, showToast, branchId }) => {
  const [scannerStatus, setScannerStatus] = useState('requesting'); // requesting → starting → active → success | error
  const [manualCode, setManualCode]       = useState('');
  const scannerInstanceRef = useRef(null);
  const mountedRef         = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const initScanner = async () => {
      if (!branchId) {
        console.error('QRScannerScreen: branchId is undefined');
        setScannerStatus('error');
        return;
      }

      // ── 1. طلب إذن الكاميرا يدوياً أولاً (ضروري لـ Capacitor/Android) ──
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        stream.getTracks().forEach(t => t.stop());
      } catch (err) {
        console.error('Camera permission denied:', err);
        if (mountedRef.current) setScannerStatus('error');
        return;
      }

      if (!mountedRef.current) return;
      setScannerStatus('starting');

      // ── 2. تشغيل Html5Qrcode مباشرةً (بدون UI خاص به) ──
      try {
        const scanner = new Html5Qrcode('qr-reader', { verbose: false });
        scannerInstanceRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            // ── نجاح: تم قراءة QR ──
            if (!mountedRef.current) return;
            const result = await handleQRScan(decodedText, branchId);
            if (result.success) {
              setScannerStatus('success');
              showToast(result.message, 'success');
              if (mountedRef.current) setTimeout(() => setCurrentScreen('dashboard'), 2000);
            } else {
              showToast(result.message, 'error');
            }
          },
          () => { /* أخطاء الإطارات الفردية — طبيعية، نتجاهلها */ }
        );

        // ✅ start() انتهى = الكاميرا تعمل فعلاً الآن
        if (mountedRef.current) setScannerStatus('active');

      } catch (err) {
        console.error('Scanner Start Error:', err);
        if (mountedRef.current) setScannerStatus('error');
      }
    };

    initScanner();

    return () => {
      mountedRef.current = false;
      const scanner = scannerInstanceRef.current;
      if (scanner) {
        scanner.stop().catch(() => {}).finally(() => {
          scanner.clear().catch(() => {});
        });
        scannerInstanceRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  const handleManualSubmit = async () => {
    const code = manualCode.trim().toUpperCase(); // pickupCode دائماً أحرف كبيرة
    if (!code) {
      showToast('يرجى إدخال رمز الاستلام', 'error');
      return;
    }
    if (code.length < 4) {
      showToast('الرمز قصير جداً، تأكد من إدخاله كاملاً', 'error');
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

  // ── شاشة النجاح ──────────────────────────────────────────────────────────
  if (scannerStatus === 'success') {
    return (
      <div className="fixed inset-0 bg-green-900 flex flex-col items-center justify-center z-50 p-6 text-center">
        <div className="text-8xl mb-6">✅</div>
        <h1 className="text-3xl font-black text-green-400 mb-2">تم التأكيد!</h1>
        <p className="text-green-200 text-lg">تم تسليم الطلب بنجاح</p>
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
          className="bg-gray-100 text-gray-600 px-4 py-2 rounded-xl font-bold"
        >
          إلغاء
        </button>
      </div>

      <div className="relative mx-auto max-w-md">
        <div
          id="qr-reader"
          className="overflow-hidden rounded-3xl border-4 border-gray-100 shadow-2xl bg-black aspect-square"
        ></div>

        {/* طلب الإذن */}
        {scannerStatus === 'requesting' && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 rounded-3xl z-10">
            <div className="text-center px-4">
              <div className="text-5xl mb-4">📷</div>
              <p className="text-white font-bold mb-2">جاري طلب إذن الكاميرا...</p>
              <p className="text-gray-400 text-sm">يرجى الموافقة على طلب الكاميرا</p>
            </div>
          </div>
        )}

        {/* تشغيل الماسح */}
        {scannerStatus === 'starting' && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 rounded-3xl z-10">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-white">جاري تشغيل الكاميرا...</p>
            </div>
          </div>
        )}

        {/* خطأ */}
        {scannerStatus === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-50 rounded-3xl z-10 p-6 text-center">
            <div>
              <div className="text-4xl mb-3">🚫</div>
              <p className="text-red-600 font-bold mb-2">تعذر الوصول للكاميرا</p>
              <p className="text-sm text-red-400">يرجى منح صلاحية الكاميرا من إعدادات التطبيق</p>
            </div>
          </div>
        )}
      </div>

      {/* إدخال رمز الاستلام يدوياً */}
      <div className="mt-8 bg-gray-50 p-6 rounded-3xl border border-gray-100 max-w-md mx-auto">
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className="text-2xl">🔑</span>
          <h2 className="text-base font-black text-gray-700">إدخال رمز الاستلام</h2>
        </div>
        <p className="text-xs text-gray-400 text-center mb-4">
          أدخل الرمز المكوّن من 6 أحرف وأرقام الظاهر في تطبيق العميل
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="مثال: A3K7RX"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
            className="flex-1 bg-white border-2 border-gray-200 rounded-2xl px-4 py-3 outline-none focus:border-green-500 transition-all text-center font-mono text-2xl font-black tracking-widest"
            dir="ltr"
            maxLength={8}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
          />
          <button
            onClick={handleManualSubmit}
            className="bg-green-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg active:scale-95 transition-transform text-sm"
          >
            تأكيد
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRScannerScreen;
