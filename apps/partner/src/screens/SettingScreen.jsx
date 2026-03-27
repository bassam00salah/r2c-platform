
// التأكد من استيراد المكون من المسار الصحيح
import Logo from '../components/logo';

const SettingsScreen = ({ partnerProfile, setCurrentScreen, onLogout, showToast }) => {
  return (
    <div className="min-h-screen bg-[#110d35] p-6 text-right font-['Cairo'] text-white" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center mb-10 max-w-7xl mx-auto">
        <button
          onClick={() => setCurrentScreen('dashboard')}
          className="text-[#ee7b26] font-bold hover:text-orange-400 transition-colors"
        >
          ← العودة
        </button>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black">إعدادات الفرع</h1>
          <Logo size={40} />
        </div>
      </div>

      <div className="max-w-2xl mx-auto bg-[#1e293b] p-8 rounded-[2.5rem] border border-slate-700 shadow-2xl">
        <h2 className="text-xl font-bold mb-8 text-center text-[#ee7b26]">بيانات الفرع التشغيلية</h2>

        <div className="space-y-6">
          {/* خيار استقبال الطلبات */}
          <div className="bg-[#110d35] p-6 rounded-2xl flex items-center justify-between border border-slate-700 transition-all hover:border-slate-600">
            <div className="flex items-center gap-3">
              <div className="w-12 h-6 bg-[#ee7b26] rounded-full relative p-1 cursor-pointer shadow-inner">
                <div className="w-4 h-4 bg-white rounded-full absolute left-1"></div>
              </div>
              <span className="text-sm font-bold">استقبال الطلبات</span>
            </div>
            <p className="text-[10px] text-slate-500">تحكم في حالة الفرع الآن</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 block mb-2 mr-2">اسم الفرع</label>
              <input
                className="w-full bg-[#110d35] border border-slate-700 rounded-2xl px-4 py-3 outline-none focus:border-[#ee7b26] transition-all"
                defaultValue={partnerProfile?.name || "الرئيسي"}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-2 mr-2">العنوان</label>
              <input
                className="w-full bg-[#110d35] border border-slate-700 rounded-2xl px-4 py-3 outline-none focus:border-[#ee7b26] transition-all"
                defaultValue="القاهرة - مصر الجديدة"
              />
            </div>
          </div>

          <button
            onClick={() => showToast("تم حفظ التعديلات بنجاح", "success")}
            className="w-full bg-[#ee7b26] hover:bg-[#d96a1f] text-white font-black py-4 rounded-2xl shadow-lg mt-4 active:scale-95 transition-all shadow-orange-900/20"
          >
            حفظ التغييرات 💾
          </button>

          <button
            onClick={onLogout}
            className="w-full bg-red-900/30 text-red-400 font-bold py-4 rounded-2xl border border-red-900/20 hover:bg-red-900/50 transition-colors mt-2"
          >
            تسجيل الخروج 👋
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsScreen;
