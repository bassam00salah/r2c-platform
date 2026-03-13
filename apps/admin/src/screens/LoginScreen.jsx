import { useState } from 'react';
import { useApp } from '../context/AppContext';

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
    } catch (e) {
      setError('بيانات الدخول غير صحيحة');
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #15487d 0%, #1a5c9e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: 'white', borderRadius: '20px', padding: '48px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, #ee7b26, #ff9a4a)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', margin: '0 auto 16px' }}>⚡</div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1a1a2e', marginBottom: '8px' }}>لوحة الإدارة</h1>
          <p style={{ color: '#666' }}>منصة R2C</p>
        </div>
        {error && <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '12px', marginBottom: '16px', color: '#dc2626', textAlign: 'center' }}>{error}</div>}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>البريد الإلكتروني</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@r2c.com" style={{ width: '100%', padding: '12px 16px', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '16px', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>كلمة المرور</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handleLogin()} style={{ width: '100%', padding: '12px 16px', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '16px', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <button onClick={handleLogin} disabled={loading} style={{ width: '100%', padding: '14px', background: loading ? '#ccc' : 'linear-gradient(135deg, #ee7b26, #ff9a4a)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'جاري الدخول...' : 'دخول'}
        </button>
      </div>
    </div>
  );
}
