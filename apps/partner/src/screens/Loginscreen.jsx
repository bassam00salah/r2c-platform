import { useState } from 'react';
import Logo from '../components/logo';

const LoginScreen = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
  e.preventDefault()
  onLogin({ email, password })  // أضف password هنا
}

  return (
    <div className="min-h-screen bg-[#110d35] flex items-center justify-center p-6" dir="rtl">
      <div className="w-full max-w-md bg-[#1e293b] rounded-[2.5rem] p-8 border border-slate-700 shadow-2xl text-center">
        <Logo size={64} className="mx-auto mb-6" />
        <h1 className="text-2xl font-black text-white mt-4 mb-2 font-['Cairo']">بوابة شركاء R2C</h1>
        <p className="text-slate-400 mb-8 text-sm">سجل دخولك لإدارة طلبات فرعك</p>

        <form onSubmit={handleSubmit} className="space-y-4 text-right">
          <input
            type="email"
            placeholder="البريد الإلكتروني"
            required
            className="w-full bg-[#110d35] border-2 border-slate-700 rounded-2xl px-4 py-3 text-white outline-none focus:border-[#ee7b26] transition-all"
            onChange={e => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="كلمة المرور"
            required
            className="w-full bg-[#110d35] border-2 border-slate-700 rounded-2xl px-4 py-3 text-white outline-none focus:border-[#ee7b26] transition-all"
            onChange={e => setPassword(e.target.value)}
          />
          <button type="submit" className="w-full bg-[#ee7b26] text-white font-black py-4 rounded-2xl shadow-lg mt-4 active:scale-95 transition-transform">
            تسجيل الدخول
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;
