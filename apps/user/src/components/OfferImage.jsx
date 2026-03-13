export default function OfferImage({ offer, size = 'medium', showWatermark = false }) {
    const sizes = {
        small:      'w-24 h-24',
        medium:     'w-full h-48',
        large:      'w-full h-64',
        fullscreen: 'w-full h-full',
    }
    const cls = sizes[size] || sizes.medium

    const isVideo =
        offer?.videoUrl ||
        offer?.imageUrl?.match(/\.(mp4|webm|mov)(\?.*)?$/i)

    // ✅ العلامة المائية بألوان اللوجو الطبيعية (بدون filter)
    const watermark = (size === 'fullscreen' || showWatermark) && (
        <img
            src="/logo.png"
            alt=""
            style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '55%',
                maxWidth: 220,
                opacity: 0.22,
                pointerEvents: 'none',
                userSelect: 'none',
                zIndex: 5,
            }}
        />
    )

    if (isVideo) {
        return (
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <video
                    src={offer.videoUrl || offer.imageUrl}
                    className={cls}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    autoPlay muted loop playsInline
                />
                {watermark}
            </div>
        )
    }

    if (offer?.imageUrl) {
        return (
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <img
                    src={offer.imageUrl}
                    alt={offer.name || 'عرض'}
                    className={cls}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { e.target.style.display = 'none' }}
                />
                {watermark}
            </div>
        )
    }

    const emoji = offer?.emoji || '🍽️'
    return (
        <div
            className={cls}
            style={{
                position: 'relative', width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            }}
        >
            <span style={{ fontSize: size === 'small' ? '2.5rem' : '5rem' }}>{emoji}</span>
            {watermark}
        </div>
    )
}
