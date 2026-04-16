import { useState } from 'react'
import { useApp } from '../contexts'
import { auth, db } from '@r2c/shared'
import { signOut, updateProfile } from 'firebase/auth'
import { doc, setDoc, updateDoc } from 'firebase/firestore'
import BackButton from '../components/BackButton'

// ── أيقونات SVG مدمجة ──────────────────────────────────────────────
const EditIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
    strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
    strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const SpinnerIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
    strokeLinecap="round" width="16" height="16"
    style={{ animation: 'spin 0.8s linear infinite' }}>
    <path d="M12 2a10 10 0 1 0 10 10" />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </svg>
)

// ── حقل قابل للتعديل ─────────────────────────────────────────────────
function EditableField({ icon, label, value, placeholder, onSave, type = 'text', dir = 'rtl' }) {
  const [editing, setEditing] = useState(false)
  const [inputVal, setInputVal] = useState(value || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!inputVal.trim()) { setError('لا يمكن ترك الحقل فارغاً'); return }
    setLoading(true)
    setError('')
    try {
      await onSave(inputVal.trim())
      setEditing(false)
    } catch (e) {
      setError('حدث خطأ، حاول مجدداً')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setInputVal(value || '')
    setError('')
    setEditing(false)
  }

  return (
    <div className={`bg-white border rounded-2xl overflow-hidden transition-all duration-200 ${
      editing ? 'border-[#ee7b26] shadow-md' : 'border-gray-100 shadow-sm'
    }`}>
      <div className="p-4 flex items-center gap-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0 transition-colors ${
          editing ? 'bg-orange-100' : 'bg-orange-50'
        }`}>
          {icon}
        </div>

        <div className="flex-1 min-w-0">
          <span className="text-gray-400 text-xs font-bold block mb-0.5">{label}</span>

          {editing ? (
            <input
              autoFocus
              type={type}
              dir={dir}
              value={inputVal}
              onChange={e => { setInputVal(e.target.value); setError('') }}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel() }}
              placeholder={placeholder}
              className="w-full font-bold text-gray-800 text-sm bg-transparent border-none outline-none placeholder-gray-300"
              style={{ fontFamily: 'inherit' }}
            />
          ) : (
            <span className={`font-bold text-sm block truncate ${value ? 'text-gray-800' : 'text-gray-300'}`} dir={dir}>
              {value || placeholder}
            </span>
          )}

          {error && <span className="text-red-500 text-xs mt-1 block">{error}</span>}
        </div>

        {/* أزرار التعديل / الحفظ / الإلغاء */}
        {editing ? (
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleCancel}
              disabled={loading}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
            >
              <CloseIcon />
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="w-8 h-8 rounded-full bg-[#ee7b26] flex items-center justify-center text-white hover:bg-[#d96b1a] transition-colors disabled:opacity-60"
            >
              {loading ? <SpinnerIcon /> : <CheckIcon />}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-orange-50 hover:text-[#ee7b26] transition-colors flex-shrink-0 border border-gray-100"
          >
            <EditIcon />
          </button>
        )}
      </div>
    </div>
  )
}

// ── الشاشة الرئيسية ───────────────────────────────────────────────────
export default function ProfileScreen() {
  const { profileData, setProfileData, setBottomNav, setCurrentScreen, viewMode } = useApp()
  const [successMsg, setSuccessMsg] = useState('')

  const showSuccess = (msg) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(''), 2500)
  }

  const handleSignOut = () => {
    signOut(auth).then(() => setCurrentScreen('auth'))
  }

  // ── دوال الحفظ لكل حقل ──────────────────────────────────────────
  const saveName = async (newName) => {
    await updateProfile(auth.currentUser, { displayName: newName })
    const userRef = doc(db, 'users', auth.currentUser.uid)
    await updateDoc(userRef, { name: newName })
    setProfileData(prev => ({ ...prev, name: newName }))
    showSuccess('تم تحديث الاسم بنجاح ✓')
  }

  const savePhone = async (newPhone) => {
    const userRef = doc(db, 'users', auth.currentUser.uid)
    await setDoc(userRef, { phone: newPhone }, { merge: true })
    setProfileData(prev => ({ ...prev, phone: newPhone }))
    showSuccess('تم حفظ رقم الهاتف ✓')
  }

  const saveAddress = async (newAddress) => {
    const userRef = doc(db, 'users', auth.currentUser.uid)
    await setDoc(userRef, { address: newAddress }, { merge: true })
    setProfileData(prev => ({ ...prev, address: newAddress }))
    showSuccess('تم حفظ العنوان ✓')
  }

  return (
    <div className="min-h-screen bg-white pb-24">

      {/* ── شريط العنوان ── */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-10 px-4 py-3 shadow-sm flex items-center gap-4">
        <BackButton onClick={() => { setBottomNav('home'); setCurrentScreen(viewMode) }} />
        <h1 className="text-xl font-bold text-[#15487d]">إدارة الحساب</h1>
      </div>

      {/* ── رسالة النجاح ── */}
      {successMsg && (
        <div
          className="mx-4 mt-4 bg-green-50 border border-green-200 text-green-700 text-sm font-bold rounded-xl px-4 py-3 text-center transition-all"
          style={{ animation: 'fadeSlide 0.3s ease' }}
        >
          {successMsg}
        </div>
      )}
      <style>{`@keyframes fadeSlide { from { opacity:0; transform:translateY(-6px) } to { opacity:1; transform:translateY(0) } }`}</style>

      {/* ── القسم العلوي: الصورة والاسم ── */}
      <div className="p-8 flex flex-col items-center bg-gray-50 border-b border-gray-100">
        {profileData?.photoURL ? (
          <img
            src={profileData.photoURL}
            alt="Profile"
            className="w-28 h-28 rounded-full mb-4 shadow-lg border-4 border-white object-cover"
          />
        ) : (
          <div className="w-28 h-28 bg-gradient-to-br from-[#ee7b26] to-[#d96b1a] rounded-full flex items-center justify-center text-5xl mb-4 shadow-lg border-4 border-white">
            👤
          </div>
        )}
        <h2 className="text-2xl font-bold mb-1">{profileData?.name}</h2>
        {profileData?.email && (
          <p className="text-gray-500 font-semibold" dir="ltr">{profileData.email}</p>
        )}
      </div>

      {/* ── قسم بيانات الحساب ── */}
      <div className="p-6 space-y-3">

        <p className="text-xs font-bold text-gray-400 mb-2 pr-1">بيانات الحساب</p>

        {/* الاسم */}
        <EditableField
          icon="👤"
          label="الاسم"
          value={profileData?.name}
          placeholder="أدخل اسمك"
          onSave={saveName}
        />

        {/* البريد الإلكتروني — قراءة فقط */}
        {profileData?.email && (
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-4 flex items-center gap-4">
            <div className="bg-orange-50 w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0">✉️</div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-gray-400 text-xs font-bold">البريد الإلكتروني</span>
              <span className="font-bold text-gray-800 text-sm truncate" dir="ltr">{profileData.email}</span>
            </div>
            <span className="text-xs text-gray-300 font-medium flex-shrink-0">غير قابل للتعديل</span>
          </div>
        )}

        {/* رقم الهاتف */}
        <EditableField
          icon="📱"
          label="رقم الهاتف"
          value={profileData?.phone}
          placeholder="أضف رقم هاتفك"
          onSave={savePhone}
          type="tel"
          dir="ltr"
        />

        {/* العنوان */}
        <EditableField
          icon="📍"
          label="العنوان"
          value={profileData?.address}
          placeholder="أضف عنوانك"
          onSave={saveAddress}
        />

      </div>

      {/* ── قسم الدعم والخروج ── */}
      <div className="px-6 space-y-3">

        <p className="text-xs font-bold text-gray-400 mb-2 pr-1">المزيد</p>

        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-4">
            <div className="bg-blue-50 w-10 h-10 rounded-full flex items-center justify-center text-blue-500 text-xl">🎧</div>
            <span className="font-bold text-gray-800">الدعم الفني والمساعدة</span>
          </div>
          <span className="text-gray-400 text-xl">←</span>
        </div>

        <div
          onClick={handleSignOut}
          className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-red-100 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-red-500 text-xl">🚪</div>
            <span className="text-red-600 font-bold">تسجيل الخروج من الحساب</span>
          </div>
          <span className="text-red-400 text-xl">←</span>
        </div>

      </div>
    </div>
  )
}
