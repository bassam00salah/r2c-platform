

const SetupScreen = ({ onComplete }) => {
  return (
    <div className="min-h-screen bg-[#110d35] flex items-center justify-center p-6 text-center font-['Cairo']" dir="rtl">
      <div className="max-w-md bg-[#1e293b] p-10 rounded-[3rem] border border-slate-700 shadow-2xl animate-in fade-in zoom-in duration-500">
        <div className="flex justify-center mb-8">
          <div className="text-6xl bg-[#0a4f44] w-24 h-24 flex items-center justify-center rounded-full border-4 border-emerald-500/20">🏁</div>
        </div>
        <h2 className="text-2xl font-black text-white mb-4 leading-tight">أهلاً بك في عائلة R2C</h2>
        <p className="text-slate-400 mb-10 leading-relaxed text-sm">
          أنت الآن جاهز لزيادة مبيعات مطعمك. تحتاج فقط لضبط إعدادات فرعك الأساسية لمرة واحدة لتبدأ في استقبال طلبات العملاء.
        </p>
        <button
          onClick={onComplete}
          className="w-full bg-[#ee7b26] text-white font-black py-4 rounded-2xl shadow-lg shadow-orange-900/20 active:scale-95 transition-all"
        >
          ابدأ رحلتك الآن 🚀
        </button>
      </div>
    </div>
  );
};

export default SetupScreen;
