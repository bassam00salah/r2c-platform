import { useState } from 'react'
import { useApp } from '../context/AppContext'

// ✅ إصلاح: تعريف OrderQRModal كان مفقوداً تماماً
function OrderQRModal({ order, onClose }) {
    const qrUrl = order?.qrCode
        ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(order.qrCode)}`
        : null

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={onClose}
        >
            <div
                className="bg-white w-full max-w-md rounded-t-3xl p-6 pb-10"
                onClick={e => e.stopPropagation()}
            >
                {/* Handle */}
                <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />

                <h2 className="text-xl font-bold text-center mb-1">{order.restaurantName}</h2>
                <p className="text-gray-500 text-center text-sm mb-6">{order.offerName}</p>

                {/* Stepper */}
                <div className="flex justify-between items-center relative px-2 mb-6">
                    <div className="absolute top-4 left-4 right-4 h-1.5 bg-gray-100 rounded-full" />
                    {[
                        { label: 'بانتظار التأكيد', s: 1 },
                        { label: 'جاري التجهيز',   s: 2 },
                        { label: 'جاهز',            s: 3 },
                    ].map((st, i) => {
                        const step = getStep(order.status)
                        const active = step >= st.s
                        return (
                            <div key={i} className="flex flex-col items-center" style={{ zIndex: 2 }}>
                                <div style={{
                                    width: 32, height: 32, borderRadius: '50%',
                                    background: active ? '#ee7b26' : '#e5e7eb',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: active ? '#fff' : '#9ca3af',
                                    fontWeight: 800, fontSize: 13, marginBottom: 4,
                                    border: '2.5px solid #fff', boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                                }}>
                                    {active ? '✓' : i + 1}
                                </div>
                                <span style={{ fontSize: 10, fontWeight: 700, color: active ? '#374151' : '#9ca3af', textAlign: 'center' }}>
                                    {st.label}
                                </span>
                            </div>
                        )
                    })}
                </div>

                {/* QR Code */}
                {['accepted', 'ready'].includes(order.status) ? (
                    <div className="flex flex-col items-center">
                        {qrUrl ? (
                            <img src={qrUrl} alt="QR" className="w-52 h-52 rounded-2xl mb-3" />
                        ) : (
                            <div className="w-52 h-52 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                                <div className="spinner" style={{ width: 40, height: 40 }} />
                            </div>
                        )}
                        <p className="text-sm text-gray-500 text-center font-bold">أظهر هذا الكود للكاشير عند الاستلام</p>
                    </div>
                ) : (
                    <div className="text-center py-4 text-gray-400">
                        <div className="text-5xl mb-3">⏳</div>
                        <p className="font-bold">في انتظار قبول الفرع...</p>
                        <p className="text-sm mt-1">سيظهر QR الكود هنا بعد القبول</p>
                    </div>
                )}

                <button onClick={onClose} className="w-full mt-6 py-3 rounded-2xl bg-gray-100 font-bold text-gray-600">
                    إغلاق
                </button>
            </div>
        </div>
    )
}

function getStep(status) {
    if (status === 'pending')  return 1
    if (status === 'accepted')  return 2
    if (status === 'ready' || status === 'completed') return 3
    return 0
}

export default function OrdersScreen() {
    const { orders, activeOrdersTab, setActiveOrdersTab, setBottomNav, setCurrentScreen } = useApp()
    const [selectedOrderForModal, setSelectedOrderForModal] = useState(null)

    const currentOrders = orders.filter(o => ['pending', 'accepted', 'ready'].includes(o.status))
    const pastOrders    = orders.filter(o => ['completed', 'rejected'].includes(o.status))
    const displayOrders = activeOrdersTab === 'current' ? currentOrders : pastOrders

    return (
        <div className="min-h-screen bg-white text-gray-900 p-6 pb-24">
            <h2 className="text-3xl font-bold mb-6">طلباتي</h2>

            <div className="flex bg-gray-50 rounded-xl p-1 mb-6 border border-gray-100">
                <button
                    onClick={() => setActiveOrdersTab('current')}
                    className={`flex-1 py-3 rounded-lg font-bold transition-all ${activeOrdersTab === 'current' ? 'bg-[#ee7b26] text-white shadow-sm' : 'text-gray-500 bg-transparent hover:bg-gray-100'}`}
                >
                    الحالية ({currentOrders.length})
                </button>
                <button
                    onClick={() => setActiveOrdersTab('past')}
                    className={`flex-1 py-3 rounded-lg font-bold transition-all ${activeOrdersTab === 'past' ? 'bg-[#ee7b26] text-white shadow-sm' : 'text-gray-500 bg-transparent hover:bg-gray-100'}`}
                >
                    السابقة ({pastOrders.length})
                </button>
            </div>

            <div className="space-y-4">
                {displayOrders.length === 0 ? (
                    <div className="text-center text-gray-500 mt-16 bg-gray-50 p-10 rounded-2xl">
                        <div className="text-6xl mb-4">🍽️</div>
                        <p className="font-bold text-lg">لا توجد طلبات {activeOrdersTab === 'current' ? 'حالية' : 'سابقة'} حتى الآن</p>
                        <button
                            onClick={() => { setBottomNav('home'); setCurrentScreen('feed') }}
                            className="mt-4 text-[#ee7b26] font-bold underline"
                        >
                            تصفح العروض
                        </button>
                    </div>
                ) : (
                    displayOrders.map(order => {
                        const step    = getStep(order.status)
                        const isReady = order.status === 'ready'
                        return (
                            <div
                                key={order.id}
                                onClick={() => setSelectedOrderForModal(order)}
                                className="bg-white rounded-2xl p-4 border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                                style={{ borderColor: isReady ? '#10b981' : '#e5e7eb', position: 'relative', overflow: 'hidden' }}
                            >
                                {isReady && (
                                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, #10b981, #34d399)', borderRadius: '8px 8px 0 0' }} />
                                )}

                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-bold text-lg">{order.restaurantName}</h3>
                                        <p className="text-gray-500 text-sm">{order.offerName}</p>
                                    </div>
                                    <div className="text-left flex flex-col items-end gap-1">
                                        <div className="font-bold text-[#ee7b26] text-lg">{order.price} ر.س</div>
                                        <div className="text-xs text-gray-400">#{order.id.slice(-5).toUpperCase()}</div>
                                        {isReady && (
                                            <div style={{ background: '#10b981', color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 800 }}>
                                                جاهز 🎉
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Stepper */}
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                    <div className="flex justify-between items-center relative px-2">
                                        <div className="absolute top-4 left-4 right-4 h-1.5 bg-gray-100 rounded-full" style={{ zIndex: 0 }} />
                                        <div
                                            className="absolute top-4 right-4 h-1.5 rounded-full transition-all duration-700"
                                            style={{
                                                zIndex: 1,
                                                background: (order.status === 'ready' || order.status === 'completed') ? '#10b981' : '#ee7b26',
                                                width: step === 0 ? '0%' : step === 1 ? '0%' : step === 2 ? 'calc(50% - 1rem)' : 'calc(100% - 2rem)'
                                            }}
                                        />
                                        {[
                                            { label: 'بانتظار التأكيد', s: 1 },
                                            { label: 'جاري التجهيز',   s: 2 },
                                            { label: 'جاهز',           s: 3 },
                                        ].map((st, i) => {
                                            const active     = step >= st.s
                                            const isCurrent  = step === st.s && !['completed', 'ready', 'rejected'].includes(order.status)
                                            const dotColor   = active
                                                ? (order.status === 'ready' || order.status === 'completed') ? '#10b981' : '#ee7b26'
                                                : order.status === 'rejected' && i === 2 ? '#ef4444' : '#e5e7eb'
                                            return (
                                                <div key={i} className="flex flex-col items-center" style={{ zIndex: 2 }}>
                                                    <div style={{
                                                        width: 32, height: 32, borderRadius: '50%',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        background: dotColor,
                                                        color: active || (order.status === 'rejected' && i === 2) ? '#fff' : '#9ca3af',
                                                        fontWeight: 800, fontSize: 13, marginBottom: 4,
                                                        border: '2.5px solid #fff', boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                                                        animation: isCurrent ? 'spin 3s linear infinite' : 'none'
                                                    }}>
                                                        {active && !isCurrent ? '✓' : order.status === 'rejected' && i === 2 ? '✕' : i + 1}
                                                    </div>
                                                    <span style={{ fontSize: 10, fontWeight: 700, color: active ? '#374151' : '#9ca3af', textAlign: 'center' }}>
                                                        {st.label}
                                                    </span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                <div style={{ textAlign: 'center', marginTop: 10 }}>
                                    <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>
                                        {['accepted', 'ready'].includes(order.status) ? '👆 اضغط لعرض كيو آر كود الطلب' : '👆 اضغط لتتبع الطلب'}
                                    </span>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {/* Modal */}
            {selectedOrderForModal && (
                <OrderQRModal
                    order={selectedOrderForModal}
                    onClose={() => setSelectedOrderForModal(null)}
                />
            )}
        </div>
    )
}
