import React from 'react';
import Logo from '../components/logo';

const ReportsScreen = ({ setCurrentScreen }) => {
  return (
    <div className="min-h-screen bg-[#110d35] p-6 text-right font-['Cairo'] text-white" dir="rtl">
      <div className="flex justify-between items-center mb-10 max-w-7xl mx-auto">
        <button onClick={() => setCurrentScreen('dashboard')} className="text-[#ee7b26] font-bold">← العودة</button>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black">التقارير</h1>
          <Logo size={40} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-7xl mx-auto mb-8">
        {[
          { label: "إجمالي الطلبات", value: "154", color: "text-white" },
          { label: "مقبولة يدوياً", value: "42", color: "text-orange-400" },
          { label: "قبول تلقائي", value: "112", color: "text-blue-400" },
          { label: "تم التسليم", value: "148", color: "text-green-400" }
        ].map((stat, i) => (
          <div key={i} className="bg-[#1e293b] p-6 rounded-3xl border border-slate-700 text-center shadow-xl">
            <p className="text-xs text-slate-400 mb-2">{stat.label}</p>
            <p className={`text-4xl font-black ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
        <div className="bg-[#1e293b] p-6 rounded-3xl border border-slate-700 shadow-xl">
          <h2 className="font-bold mb-6 text-lg">تحليل الأداء</h2>
          <div className="space-y-6">
            {["معدل القبول", "نسبة الإتمام", "سرعة التسليم"].map(label => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-[#ee7b26]">94%</span>
                  <span className="text-slate-300">{label}</span>
                </div>
                <div className="w-full bg-[#110d35] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#ee7b26] h-full w-[94%] shadow-[0_0_10px_#ee7b26]"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsScreen;
