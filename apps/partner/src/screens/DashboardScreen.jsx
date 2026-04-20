import { useState, useEffect, useRef } from 'react'
import { db } from '@r2c/shared'
import { ORDER_STATUS } from '@r2c/shared/constants/orderStatus'
import { doc, getDoc, onSnapshot } from 'firebase/firestore'
import OrderCard from '../components/OrderCard'
import Logo from '../components/logo'

function getInitialDashboardTab() {
  try {
    const storedTab = window.sessionStorage.getItem('partnerDashboardActiveTab')
    return ['new', 'accepted', 'completed'].includes(storedTab) ? storedTab : 'new'
  } catch (error) {
    console.warn('تعذر قراءة التبويب المحفوظ للداشبورد:', error)
    return 'new'
  }
}

function resolveRestaurantLogo(source = {}) {
  return (
    source?.logoUrl ||
    source?.logo ||
    source?.imageUrl ||
    source?.photo ||
    source?.photoUrl ||
    source?.image ||
    source?.thumbnailUrl ||
    ''
  )
}

function RestaurantLogoAvatar({ logoUrl, alt }) {
  return (
    <div className="relative h-14 w-14 overflow-hidden rounded-full border border-[#ededed] bg-white p-1 shadow-sm">
      {logoUrl ? (
        <>
          <img
            src={logoUrl}
            alt={alt || 'لوجو المطعم'}
            className="h-full w-full rounded-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
              const fallback = e.currentTarget.parentElement?.querySelector('[data-logo-fallback="true"]')
              if (fallback) {
                fallback.classList.remove('hidden')
                fallback.classList.add('flex')
              }
            }}
          />
          <div
            data-logo-fallback="true"
            className="hidden h-full w-full items-center justify-center rounded-full bg-white"
          >
            <Logo className="h-8" />
          </div>
        </>
      ) : (
        <div
          data-logo-fallback="true"
          className="flex h-full w-full items-center justify-center rounded-full bg-white"
        >
          <Logo className="h-8" />
        </div>
      )}
    </div>
  )
}

function getTabMeta(activeTab, counts) {
  return [
    {
      key: 'new',
      label: 'جديد',
      emptyText: 'لا توجد طلبات جديدة',
      count: counts.new,
    },
    {
      key: 'accepted',
      label: 'تحضير',
      emptyText: 'لا توجد طلبات تحت التحضير',
      count: counts.accepted,
    },
    {
      key: 'completed',
      label: 'مكتملة',
      emptyText: 'لا توجد طلبات مكتملة',
      count: counts.completed,
    },
  ].map((tab) => ({ ...tab, isActive: tab.key === activeTab }))
}

function getBranchStateMeta(profile, branchId) {
  if (!branchId) {
    return {
      isOpen: false,
      label: 'لا يوجد فرع مسجل',
      shortLabel: 'غير متاح',
      badgeClass: 'bg-[#fff1f1] text-[#d43a3a] border-[#ffd6d6]',
      dotClass: 'bg-[#ef4444]',
    }
  }

  if (!profile) {
    return {
      isOpen: false,
      label: 'جاري قراءة حالة الفرع...',
      shortLabel: 'جارٍ التحميل',
      badgeClass: 'bg-[#f4f4f5] text-[#666] border-[#e5e7eb]',
      dotClass: 'bg-[#9ca3af]',
    }
  }

  const normalizedStatus = String(profile.status || '').trim().toLowerCase()

  if (['inactive', 'closed', 'paused', 'busy', 'off', 'stopped'].includes(normalizedStatus)) {
    return {
      isOpen: false,
      label: 'استقبال الطلبات متوقف حاليًا',
      shortLabel: 'متوقف',
      badgeClass: 'bg-[#fff7ed] text-[#c45d12] border-[#f3c39d]',
      dotClass: 'bg-[#ee7b26]',
    }
  }

  if (['active', 'open', 'online', 'available', ''].includes(normalizedStatus)) {
    return {
      isOpen: true,
      label: 'الفرع مفتوح ويستقبل الطلبات',
      shortLabel: 'مفتوح',
      badgeClass: 'bg-[#eef9f1] text-[#178b4b] border-[#caebd5]',
      dotClass: 'bg-[#18a957]',
    }
  }

  return {
    isOpen: true,
    label: 'حالة الفرع غير معروفة بدقة',
    shortLabel: normalizedStatus || 'غير محددة',
    badgeClass: 'bg-[#fff7ed] text-[#c45d12] border-[#f3c39d]',
    dotClass: 'bg-[#ee7b26]',
  }
}

function OrdersMenuDrawer({
  isOpen,
  onClose,
  counts,
  activeTab,
  onSelectTab,
  setCurrentScreen,
  partnerProfile,
  branchState,
}) {
  const tabItems = [
    { key: 'new', label: 'الطلبات الحالية', subtitle: 'عرض الطلبات الجديدة', count: counts.new },
    { key: 'accepted', label: 'الطلبات تحت التحضير', subtitle: 'الطلبات المقبولة الجاري تجهيزها', count: counts.accepted },
    { key: 'completed', label: 'الطلبات المكتملة', subtitle: 'الطلبات التي تم تسليمها', count: counts.completed },
  ]

  const utilityItems = [
    { key: 'reports', label: 'التقارير', icon: '▤', onClick: () => setCurrentScreen('reports') },
    { key: 'settings', label: 'الإعدادات', icon: '⚙', onClick: () => setCurrentScreen('settings') },
    { key: 'qrScanner', label: 'مسح QR', icon: '⌁', onClick: () => setCurrentScreen('qrScanner') },
  ]

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px] transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 right-0 z-50 h-full w-[86%] max-w-[330px] border-l border-black/5 bg-white shadow-[0_18px_50px_rgba(0,0,0,0.18)] transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        dir="rtl"
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-[#ececec] bg-[#fcfcfc] px-5 pt-6 pb-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-3 flex items-center gap-3">
                  <RestaurantLogoAvatar
                    logoUrl={partnerProfile?.restaurantLogo}
                    alt={partnerProfile?.restaurantName || 'لوجو المطعم'}
                  />

                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-extrabold leading-6 text-[#232323]">
                      {partnerProfile?.restaurantName || 'اسم المطعم'}
                    </p>
                    <p className="truncate text-[13px] leading-5 text-[#6b6b6b]">
                      {partnerProfile?.name || 'بيانات الفرع'}
                    </p>
                  </div>
                </div>

                <div
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-bold ${branchState.badgeClass}`}
                >
                  <span className={`inline-block h-2.5 w-2.5 rounded-full ${branchState.dotClass}`} />
                  {branchState.label}
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="h-10 w-10 flex-shrink-0 rounded-full border border-[#ececec] text-[#444] transition-colors hover:bg-[#f7f7f7]"
                aria-label="إغلاق القائمة"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="mb-4">
              {tabItems.map((item) => {
                const isActive = activeTab === item.key
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      onSelectTab(item.key)
                      onClose()
                    }}
                    className={`group relative mb-2 flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-right transition-all ${
                      isActive
                        ? 'border-[#f4d1b7] bg-[#fff8f1] shadow-sm'
                        : 'border-[#efefef] bg-white hover:bg-[#fafafa]'
                    }`}
                  >
                    <span
                      className={`absolute right-0 top-2 bottom-2 w-1 rounded-full transition-colors ${
                        isActive ? 'bg-[#ee7b26]' : 'bg-transparent group-hover:bg-[#f2f2f2]'
                      }`}
                    />
                    <div className="min-w-0 flex-1 pr-2">
                      <div className={`text-[15px] font-extrabold ${isActive ? 'text-[#232323]' : 'text-[#2b2b2b]'}`}>
                        {item.label}
                      </div>
                      <div className="mt-1 text-[12px] leading-5 text-[#8a8a8a]">{item.subtitle}</div>
                    </div>
                    <div
                      className={`min-w-[34px] rounded-full px-2 py-1 text-center text-[12px] font-extrabold ${
                        item.count > 0 ? 'bg-[#ee7b26] text-white' : 'bg-[#f3f3f3] text-[#808080]'
                      }`}
                    >
                      {item.count}
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="mt-4 border-t border-[#efefef] pt-4">
              {utilityItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    item.onClick()
                    onClose()
                  }}
                  className="mb-2 flex w-full items-center justify-between rounded-2xl border border-[#efefef] bg-white px-4 py-3.5 text-right transition-colors hover:bg-[#fafafa]"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[17px] text-[#5a5a5a]">{item.icon}</span>
                    <span className="text-[15px] font-bold text-[#2b2b2b]">{item.label}</span>
                  </div>
                  <span className="text-[#a9a9a9]">←</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

// --- نظام التنبيه الصوتي المستمر ---
let alertAudioContext = null
let alertLoopTimer = null
let alertActive = false

function playAlertBeep() {
  try {
    if (!alertAudioContext) {
      alertAudioContext = new (window.AudioContext || window.webkitAudioContext)()
    }
    const ctx = alertAudioContext
    const beep = (freq, start, duration) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.4, ctx.currentTime + start)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration)
      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + duration)
    }
    beep(880, 0, 0.15)
    beep(660, 0.2, 0.15)
    beep(880, 0.4, 0.15)
    beep(1100, 0.6, 0.3)
  } catch (error) {
    console.warn('Audio not available:', error)
  }
}

function startContinuousAlert() {
  if (alertActive) return
  alertActive = true
  playAlertBeep()
  alertLoopTimer = setInterval(() => {
    if (alertActive) playAlertBeep()
  }, 2500)
}

function stopContinuousAlert() {
  alertActive = false
  if (alertLoopTimer) {
    clearInterval(alertLoopTimer)
    alertLoopTimer = null
  }
}

const DashboardScreen = ({
  branchId,
  setCurrentScreen,
  showToast,
  orders = [],
  ordersLoading: loading = false,
}) => {
  const [activeTab, setActiveTab] = useState(getInitialDashboardTab)
  const [partnerProfile, setPartnerProfile] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isAlertActive, setIsAlertActive] = useState(false)

  const seenOrdersRef = useRef(new Set())
  const isFirstLoadRef = useRef(true)
  const pendingAlertOrdersRef = useRef(new Set())

  useEffect(() => {
    try {
      const storedTab = window.sessionStorage.getItem('partnerDashboardActiveTab')
      if (['new', 'accepted', 'completed'].includes(storedTab)) {
        setActiveTab(storedTab)
        window.sessionStorage.removeItem('partnerDashboardActiveTab')
      }
    } catch (error) {
      console.warn('تعذر تطبيق التبويب المحفوظ للداشبورد:', error)
    }
  }, [])

  useEffect(() => {
    if (!branchId) {
      setPartnerProfile(null)
      return undefined
    }

    let isMounted = true
    const branchRef = doc(db, 'branches', branchId)

    const unsubscribe = onSnapshot(
      branchRef,
      async (snap) => {
        if (!snap.exists()) {
          if (isMounted) setPartnerProfile(null)
          return
        }

        const branchData = { id: snap.id, ...snap.data() }
        let restaurantName = branchData.restaurantName || ''
        let restaurantLogo = resolveRestaurantLogo(branchData)

        if (branchData.restaurantId) {
          try {
            const restSnap = await getDoc(doc(db, 'restaurants', branchData.restaurantId))
            if (restSnap.exists()) {
              const restaurantData = restSnap.data() || {}
              restaurantName = restaurantData.name || restaurantName
              restaurantLogo = resolveRestaurantLogo(restaurantData) || restaurantLogo
            }
          } catch (error) {
            console.warn('تعذّر جلب بيانات المطعم:', error)
          }
        }

        if (isMounted) {
          setPartnerProfile({
            ...branchData,
            restaurantName,
            restaurantLogo,
          })
        }
      },
      (error) => {
        console.error('خطأ في متابعة بيانات الفرع:', error)
      }
    )

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [branchId])

  useEffect(() => {
    if (loading) return

    if (isFirstLoadRef.current) {
      orders.forEach((order) => seenOrdersRef.current.add(order.id))
      isFirstLoadRef.current = false
      return
    }

    let hasPendingAlerts = false

    orders.forEach((order) => {
      if (order.status === ORDER_STATUS.PENDING && !seenOrdersRef.current.has(order.id)) {
        seenOrdersRef.current.add(order.id)
        pendingAlertOrdersRef.current.add(order.id)
        showToast('🔔 طلب جديد وارد!', 'success')
        hasPendingAlerts = true
      } else if (
        order.status === ORDER_STATUS.ACCEPTED &&
        order.autoAccepted === true &&
        pendingAlertOrdersRef.current.has(order.id)
      ) {
        // الطلب قُبل تلقائياً — استمر في التنبيه ولا تحذفه من pendingAlertOrdersRef
        hasPendingAlerts = true
      }

      if (!seenOrdersRef.current.has(order.id)) {
        seenOrdersRef.current.add(order.id)
      }
    })

    if (hasPendingAlerts) {
      startContinuousAlert()
      setIsAlertActive(true)
    }
  }, [orders, loading, showToast])

  // إيقاف التنبيه تلقائياً فقط إذا رُفضت جميع الطلبات (المقبولة تلقائياً تحتاج ضغط يدوي)
  useEffect(() => {
    if (!isAlertActive) return
    const stillAlive = orders.some((order) => {
      if (!pendingAlertOrdersRef.current.has(order.id)) return false
      // طلب لسه pending → استمر
      if (order.status === ORDER_STATUS.PENDING) return true
      // طلب قُبل تلقائياً → استمر حتى يضغط المطعم إيقاف
      if (order.status === ORDER_STATUS.ACCEPTED && order.autoAccepted === true) return true
      return false
    })
    if (!stillAlive) {
      stopContinuousAlert()
      setIsAlertActive(false)
      pendingAlertOrdersRef.current.clear()
    }
  }, [orders, isAlertActive])

  const handleStopAlert = () => {
    stopContinuousAlert()
    setIsAlertActive(false)
    pendingAlertOrdersRef.current.clear()
  }

  // إيقاف تنبيه طلب بعينه (القبول التلقائي) وتحريره لمساره الطبيعي
  const handleStopAlertForOrder = (orderId) => {
    pendingAlertOrdersRef.current.delete(orderId)
    // لو مفيش طلبات تانية محتاجة تنبيه → وقّف الكل
    const stillAlive = orders.some(
      (o) => pendingAlertOrdersRef.current.has(o.id) &&
        (o.status === ORDER_STATUS.PENDING ||
          (o.status === ORDER_STATUS.ACCEPTED && o.autoAccepted === true))
    )
    if (!stillAlive) {
      stopContinuousAlert()
      setIsAlertActive(false)
    }
  }

  const newCount = orders.filter((order) => {
    if (order.status === ORDER_STATUS.PENDING) return true
    if (
      order.status === ORDER_STATUS.ACCEPTED &&
      order.autoAccepted === true &&
      pendingAlertOrdersRef.current.has(order.id)
    ) return true
    return false
  }).length
  const acceptedCount = orders.filter(
    (order) => order.status === ORDER_STATUS.ACCEPTED || order.status === ORDER_STATUS.READY
  ).length
  const completedCount = orders.filter((order) => order.status === ORDER_STATUS.COMPLETED).length

  const filteredOrders = orders.filter((order) => {
    if (activeTab === 'new') {
      // الطلبات الجديدة + المقبولة تلقائياً التي لم يُوقف تنبيهها بعد
      if (order.status === ORDER_STATUS.PENDING) return true
      if (
        order.status === ORDER_STATUS.ACCEPTED &&
        order.autoAccepted === true &&
        pendingAlertOrdersRef.current.has(order.id)
      ) return true
      return false
    }
    if (activeTab === 'accepted') {
      // المقبولة تلقائياً بعد إيقاف التنبيه تنتقل هنا
      return order.status === ORDER_STATUS.ACCEPTED || order.status === ORDER_STATUS.READY
    }
    if (activeTab === 'completed') return order.status === ORDER_STATUS.COMPLETED
    return false
  })

  const counts = { new: newCount, accepted: acceptedCount, completed: completedCount }
  const tabs = getTabMeta(activeTab, counts)
  const emptyMessage = tabs.find((tab) => tab.key === activeTab)?.emptyText || 'لا توجد طلبات في هذا القسم'
  const branchState = getBranchStateMeta(partnerProfile, branchId)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f7f7]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-11 w-11 animate-spin rounded-full border-4 border-[#ee7b26] border-t-transparent" />
          <p className="text-sm font-bold text-[#7a7a7a]">جاري تحميل الطلبات...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f7f7f7] pb-24" dir="rtl">
      <OrdersMenuDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        counts={counts}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        setCurrentScreen={setCurrentScreen}
        partnerProfile={partnerProfile}
        branchState={branchState}
      />

      <div className="mx-auto w-full max-w-6xl px-3 pt-3 md:px-5 md:pt-5">
        <div className="overflow-hidden rounded-[28px] border border-[#e9e9e9] bg-white shadow-[0_12px_34px_rgba(15,23,42,0.06)]">
          <div className="border-b border-[#ededed] bg-white px-4 pt-4 pb-3 md:px-6">
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-[#e6e6e6] bg-white text-[#333] shadow-sm transition-colors hover:bg-[#fafafa]"
                aria-label="فتح القائمة"
              >
                ☰
              </button>

              <div className="min-w-0 flex-1 text-right">
                <div className="flex items-center justify-between gap-2">
                  <h1 className="text-[20px] font-black leading-none text-[#1f1f1f] md:text-[24px]">
                    الطلبات الحالية
                  </h1>
                  {isAlertActive && (
                    <button
                      type="button"
                      onClick={handleStopAlert}
                      className="flex animate-pulse items-center gap-1.5 rounded-xl bg-[#b33a3a] px-3 py-2 text-[12px] font-black text-white shadow-md transition-all hover:bg-[#922e2e] active:scale-95"
                      aria-label="إيقاف التنبيه الصوتي"
                    >
                      <span className="text-[16px] leading-none">🔕</span>
                      <span>إيقاف التنبيه</span>
                    </button>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap items-center justify-start gap-2 text-[13px] text-[#707070]">
                  <span className="font-bold text-[#2f2f2f]">
                    {partnerProfile?.restaurantName || 'اسم المطعم'}
                  </span>
                  <span>—</span>
                  <span>{partnerProfile?.name || 'اسم الفرع'}</span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${branchState.badgeClass}`}
                  >
                    <span className={`h-2 w-2 rounded-full ${branchState.dotClass}`} />
                    {branchState.shortLabel}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-b border-[#efefef] bg-white px-4 md:px-6">
            <div className="flex items-center gap-2 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative min-w-[112px] flex-1 whitespace-nowrap px-3 py-4 text-center text-[15px] font-black transition-colors md:min-w-[138px] ${
                    tab.isActive ? 'text-[#b33a3a]' : 'text-[#8d8d8d] hover:text-[#3d3d3d]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`mr-1 text-[13px] ${tab.isActive ? 'text-[#b33a3a]' : 'text-[#9f9f9f]'}`}>
                    {tab.count}
                  </span>
                  <span
                    className={`absolute bottom-0 right-3 left-3 h-[3px] rounded-full transition-all ${
                      tab.isActive ? 'bg-[#d85b5b]' : 'bg-transparent'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#fafafa] px-4 py-5 md:px-6 md:py-6">
            {filteredOrders.length === 0 ? (
              <div className="flex min-h-[58vh] flex-col items-center justify-center rounded-[26px] border border-dashed border-[#e5e5e5] bg-white text-center">
                <div className="mb-4 text-[64px] leading-none text-[#d6d6d6]">🛒</div>
                <p className="text-[19px] font-black text-[#c2c2c2]">{emptyMessage}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onView={() => setCurrentScreen('orderDetail', order)}
                    showToast={showToast}
                    isAutoAcceptedAlerting={
                      order.status === ORDER_STATUS.ACCEPTED &&
                      order.autoAccepted === true &&
                      pendingAlertOrdersRef.current.has(order.id)
                    }
                    onStopAlert={() => handleStopAlertForOrder(order.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardScreen
