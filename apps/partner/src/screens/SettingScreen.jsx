import { useState, useEffect } from 'react';
import { db } from '@r2c/shared';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import Logo from '../components/logo';

const SettingsScreen = ({ branchId, setCurrentScreen, onLogout, showToast }) => {
  const [branchName, setBranchName]   = useState('')
  const [address, setAddress]         = useState('')
  const [city, setCity]               = useState('')
  const [restaurantName, setRestaurantName] = useState('')
  const [isActive, setIsActive]       = useState(true)
  const [saving, setSaving]           = useState(false)
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    if (!branchId) return
    setLoading(true)
    getDoc(doc(db, 'branches', branchId)).then(async snap => {
      if (!snap.exists()) return
      const data = snap.data()
      setBranchName(data.name     || '')
      setAddress(data.address     || '')
      setCity(data.city           || '')
      setIsActive(data.status === 'active')

      // جلب اسم المطعم
      if (data.restaurantId) {
        try {
          const rSnap = await getDoc(doc(db, 'restaurants', data.restaurantId))
          if (rSnap.exists()) setRestaurantName(rSnap.data().name || '')
        } catch (e) { /* ignore */ }
      }
    }).catch(err => console.error(err))
    .finally(() => setLoading(false))
  }, [branchId])

  const handleSave = async () => {
    if (!branchId) return
    setSaving(true)
    try {
      await updateDoc(doc(db, 'branches', branchId), {
        name:    branchName.trim(),
        address: address.trim(),
        city:    city.trim(),
        status:  isActive ? 'active' : 'inactive',
      })
      showToast('تم حفظ التعديلات ✅', 'success')
    } catch (err) {
      console.error(err)
      showToast('حدث خطأ أثناء الحفظ', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#110d35] p-6 text-right font-['Cairo'] text-white pb-24" dir="rtl">

      {/* Header */}
      <div className="flex justify-between items-center mb-8 max-w-2xl mx-auto">
        <button onClick={() => setCurrentScreen('dashboard')} className="text-[#ee7b26] font-bold hover:text-orange-400 transition-colors">
          ← العودة
        </button>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black">إعدادات الفرع</h1>
          <Logo size={40} />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-10 h-10 border-4 border-[#ee7b26] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="max-w-2xl mx-auto bg-[#1e293b] p-8 rounded-[2.5rem] border border-slate-700 shadow-2xl">
          <h2 className="text-xl font-bold mb-8 text-center text-[#ee7b26]">بيانات الفرع التشغيلية</h2>

          <div className="space-y-6">

            {/* اسم المطعم (للعرض فقط) */}
            {restaurantName && (
              <div className="bg-[#110d35] p-4 rounded-2xl border border-slate-700">
                <p className="text-xs text-slate-400 mb-1">المطعم</p>
                <p className="font-black text-[#ee7b26] text-lg">{restaurantName}</p>
              </div>
            )}

            {/* استقبال الطلبات */}
            <div className="bg-[#110d35] p-5 rounded-2xl flex items-center justify-between border border-slate-700">
              <p className="text-xs text-slate-400">تحكم في حالة الفرع</p>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold">استقبال الطلبات</span>
                <div
                  onClick={() => setIsActive(v => !v)}
                  className="relative cursor-pointer transition-all"
                  style={{
                    width: 48, height: 26, borderRadius: 13,
                    background: isActive ? '#ee7b26' : '#374151',
                  }}
                >
                  <div style={{
                    width: 20, height: 20, background: 'white', borderRadius: '50%',
                    position: 'absolute', top: 3,
                    right: isActive ? 3 : 25,
                    transition: 'right 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  }} />
                </div>
              </div>
            </div>

            {/* الحقول */}
            {[
              { label: 'اسم الفرع',  value: branchName,  setter: setBranchName  },
              { label: 'العنوان',    value: address,      setter: setAddress     },
              { label: 'المدينة',    value: city,         setter: setCity        },
            ].map(({ label, value, setter }) => (
              <div key={label}>
                <label className="text-xs text-slate-400 block mb-2 mr-1">{label}</label>
                <input
                  value={value}
                  onChange={e => setter(e.target.value)}
                  placeholder={label}
                  className="w-full bg-[#110d35] border border-slate-700 rounded-2xl px-4 py-3 outline-none focus:border-[#ee7b26] transition-all text-white"
                />
              </div>
            ))}

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-[#ee7b26] hover:bg-[#d96a1f] text-white font-black py-4 rounded-2xl shadow-lg mt-2 active:scale-95 transition-all disabled:opacity-60"
            >
              {saving ? '⏳ جاري الحفظ...' : 'حفظ التغييرات 💾'}
            </button>

            <button
              onClick={onLogout}
              className="w-full bg-red-900/30 text-red-400 font-bold py-4 rounded-2xl border border-red-900/20 hover:bg-red-900/50 transition-colors"
            >
              تسجيل الخروج 👋
            </button>

          </div>
        </div>
      )}
    </div>
  )
}

export default SettingsScreen
