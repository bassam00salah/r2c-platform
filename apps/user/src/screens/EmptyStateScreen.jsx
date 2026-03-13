import { useApp } from '../context/AppContext'

export default function EmptyStateScreen() {
    const { setCurrentScreen } = useApp()
    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
            <div className="text-8xl mb-8">🧭</div>
            <h1 className="text-3xl font-bold mb-4 text-center">لا توجد عروض قريبة منك حالياً</h1>
            <p className="text-[#ee7b26] text-center mb-8 font-bold">
                👍 نحن نعمل على توفير عروض رائعة في منطقتك قريباً!
            </p>
            <div className="relative mb-12">
                <div className="text-8xl">🗺️</div>
                <div className="absolute -top-4 -right-8 text-4xl animate-bounce">📍</div>
                <div className="absolute top-8 -left-8 text-3xl animate-pulse">📍</div>
            </div>
            <button
                onClick={() => setCurrentScreen('feed')}
                className="gradient-button text-white font-bold text-xl py-4 px-12 rounded-2xl w-full max-w-md mb-4 shadow-lg"
            >
                استكشف مناطق أخرى
            </button>
            <button className="bg-gray-50 border border-gray-200 text-gray-800 font-bold text-lg py-4 px-12 rounded-2xl w-full max-w-md flex items-center justify-center gap-3 shadow-sm">
                <span className="text-2xl">🔔</span>
                <span>أشعرني عند توفر عروض</span>
            </button>
        </div>
    )
}
