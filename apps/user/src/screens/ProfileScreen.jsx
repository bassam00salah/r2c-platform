import { useApp } from '../contexts'
import { auth } from '@r2c/shared'
import { signOut } from 'firebase/auth'

export default function ProfileScreen() {
    const { profileData, setBottomNav, setCurrentScreen, viewMode } = useApp()

    const handleSignOut = () => {
        signOut(auth).then(() => setCurrentScreen('auth'))
    }

    return (
        <div className="min-h-screen bg-white pb-24">
            <div className="sticky top-0 bg-white border-b border-gray-100 z-10 p-4 shadow-sm">
                <button
                    onClick={() => { setBottomNav('home'); setCurrentScreen(viewMode) }}
                    className="text-gray-700 text-2xl mb-4 font-bold"
                >←</button>
                <h1 className="text-2xl font-bold text-[#15487d] text-center">إدارة الحساب</h1>
            </div>

            <div className="p-8 flex flex-col items-center bg-gray-50 border-b border-gray-100">
                {profileData?.photoURL ? (
                    <img src={profileData.photoURL} alt="Profile" className="w-28 h-28 rounded-full mb-4 shadow-lg border-4 border-white object-cover" />
                ) : (
                    <div className="w-28 h-28 bg-gradient-to-br from-[#ee7b26] to-[#d96b1a] rounded-full flex items-center justify-center text-5xl mb-4 shadow-lg border-4 border-white">👤</div>
                )}
                <h2 className="text-2xl font-bold mb-1">{profileData?.name}</h2>
                {profileData?.email && (
                    <p className="text-gray-500 font-semibold" dir="ltr">{profileData.email}</p>
                )}
            </div>

            <div className="p-6 space-y-4">
                <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="bg-orange-50 w-10 h-10 rounded-full flex items-center justify-center text-[#ee7b26] text-xl">👤</div>
                        <div className="flex flex-col">
                            <span className="text-gray-400 text-xs font-bold">الاسم</span>
                            <span className="font-bold text-gray-800">{profileData?.name}</span>
                        </div>
                    </div>
                </div>

                {profileData?.email && (
                    <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="bg-orange-50 w-10 h-10 rounded-full flex items-center justify-center text-[#ee7b26] text-xl">✉️</div>
                            <div className="flex flex-col">
                                <span className="text-gray-400 text-xs font-bold">البريد الإلكتروني</span>
                                <span className="font-bold text-gray-800" dir="ltr">{profileData.email}</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-50 w-10 h-10 rounded-full flex items-center justify-center text-blue-500 text-xl">🎧</div>
                        <span className="font-bold text-gray-800">الدعم الفني والمساعدة</span>
                    </div>
                    <span className="text-gray-400 text-xl">←</span>
                </div>

                <div
                    onClick={handleSignOut}
                    className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-red-100 transition-colors mt-8"
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
