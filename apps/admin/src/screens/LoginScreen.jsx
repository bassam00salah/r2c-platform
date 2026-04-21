import { useState } from 'react';
import { useApp } from '../context/AppContext';
import logoSrc from '../assets/logo.png';

export default function LoginScreen() {
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch {
      setError('بيانات الدخول غير صحيحة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #15487d 0%, #1d5da1 50%, #ee7b26 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '980px', display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', background: 'rgba(255,255,255,0.96)', borderRadius: '28px', overflow: 'hidden', boxShadow: '0 24px 70px rgba(15,23,42,0.24)' }}>
        <div style={{ padding: '56px 48px', background: 'linear-gradient(180deg, #ffffff 0%, #fff8f3 100%)' }}>
          <img src={logoSrc} alt="R2C" style={{ width: '140px', height: 'auto', marginBottom: '22px' }} />
          <h1 style={{ fontSize: '34px', fontWeight: 800, color: '#1a1a2e', margin: 0 }}>لوحة الإدارة</h1>
          <p style={{ color: '#6b7280', marginTop: '12px', lineHeight: 1.9 }}>تسجيل الدخول لمديري التطبيقات والمطاعم</p>
          <div style={{ display: 'grid', gap: '12px', marginTop: '28px' }}>
            {['إدارة المطاعم والفروع والعروض من مكان واحد', 'الوصول السريع إلى التقارير والطلبات'].map((item, idx) => (
              <div key={idx} style={{ background: '#fff', border: '1px solid #edf0f5', borderRadius: '14px', padding: '14px 16px', color: '#374151', fontWeight: 600 }}>
                ✨ {item}
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '56px 40px', background: '#fff' }}>
          <div style={{ marginBottom: '28px' }}>
            <div style={{ color: '#ee7b26', fontWeight: 800, fontSize: '13px', marginBottom: '10px' }}>تسجيل دخول الإدارة</div>
            <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#1a1a2e', margin: 0 }}>مرحبًا بعودتك</h2>
            <p style={{ color: '#6b7280', marginTop: '10px' }}>أدخل البريد الإلكتروني وكلمة المرور للمتابعة.</p>
          </div>

          {error ? <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '12px', padding: '12px 14px', marginBottom: '18px', color: '#b91c1c', textAlign: 'center', fontWeight: 700 }}>{error}</div> : null}

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, color: '#374151' }}>البريد الإلكتروني</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@r2c.com" style={{ width: '100%', padding: '13px 16px', border: '1.5px solid #e5e7eb', borderRadius: '12px', fontSize: '16px', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, color: '#374151' }}>كلمة المرور</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handleLogin()} style={{ width: '100%', padding: '13px 16px', border: '1.5px solid #e5e7eb', borderRadius: '12px', fontSize: '16px', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <button onClick={handleLogin} disabled={loading} style={{ width: '100%', padding: '15px', background: loading ? '#cbd5e1' : 'linear-gradient(135deg, #ee7b26, #ff9a4a)', color: 'white', border: 'none', borderRadius: '14px', fontSize: '17px', fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 10px 24px rgba(238,123,38,0.25)' }}>
            {loading ? '⏳ جاري الدخول...' : 'دخول لوحة الإدارة'}
          </button>
        </div>
      </div>
    </div>
  );
}
