import { useEffect, useMemo, useState } from 'react'
import { db } from '@r2c/shared'
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore'
import Logo from '../components/logo'

const rowBaseClass =
  'w-full rounded-[22px] border border-[#ece7df] bg-white px-4 py-4 text-right text-[#1f2937] outline-none transition-all placeholder:text-[#9ca3af] focus:border-[#ee7b26] focus:ring-4 focus:ring-[#ee7b26]/10'

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

function setPreferredDashboardTab(tabKey) {
  try {
    window.sessionStorage.setItem('partnerDashboardActiveTab', tabKey)
  } catch (error) {
    console.warn('تعذر حفظ التبويب المطلوب للداشبورد:', error)
  }
}

function OrdersMenuDrawer({
  isOpen,
  onClose,
  counts,
  activeScreen,
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
              {tabItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setPreferredDashboardTab(item.key)
                    setCurrentScreen('dashboard')
                    onClose()
                  }}
                  className="group relative mb-2 flex w-full items-center gap-3 rounded-2xl border border-[#efefef] bg-white px-4 py-3.5 text-right transition-all hover:bg-[#fafafa]"
                >
                  <span className="absolute right-0 top-2 bottom-2 w-1 rounded-full bg-transparent transition-colors group-hover:bg-[#f2f2f2]" />
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="text-[15px] font-extrabold text-[#2b2b2b]">{item.label}</div>
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
              ))}
            </div>

            <div className="mt-4 border-t border-[#efefef] pt-4">
              {utilityItems.map((item) => {
                const isActive = activeScreen === item.key

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      item.onClick()
                      onClose()
                    }}
                    className={`mb-2 flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-right transition-colors ${
                      isActive
                        ? 'border-[#f4d1b7] bg-[#fff8f1]'
                        : 'border-[#efefef] bg-white hover:bg-[#fafafa]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[17px] text-[#5a5a5a]">{item.icon}</span>
                      <span className={`text-[15px] font-bold ${isActive ? 'text-[#c45d12]' : 'text-[#2b2b2b]'}`}>
                        {item.label}
                      </span>
                    </div>
                    <span className={`${isActive ? 'text-[#c45d12]' : 'text-[#a9a9a9]'}`}>←</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

const SettingsScreen = ({
  branchId,
  setCurrentScreen,
  onLogout,
  showToast,
  orders = [],
}) => {
  const [branchName, setBranchName] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [restaurantName, setRestaurantName] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [statusSaving, setStatusSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [partnerProfile, setPartnerProfile] = useState(null)

  useEffect(() => {
    if (!branchId) {
      setLoading(false)
      setPartnerProfile(null)
      return undefined
    }

    let isMounted = true
    const branchRef = doc(db, 'branches', branchId)

    const unsubscribe = onSnapshot(
      branchRef,
      async (snap) => {
        if (!snap.exists()) {
          if (isMounted) {
            setLoading(false)
            setPartnerProfile(null)
          }
          return
        }

        const data = snap.data() || {}
        let restaurantNameValue = data.restaurantName || ''
        let restaurantLogo = resolveRestaurantLogo(data)

        if (data.restaurantId) {
          try {
            const rSnap = await getDoc(doc(db, 'restaurants', data.restaurantId))
            if (rSnap.exists()) {
              const restaurantData = rSnap.data() || {}
              restaurantNameValue = restaurantData.name || restaurantNameValue
              restaurantLogo = resolveRestaurantLogo(restaurantData) || restaurantLogo
            }
          } catch (error) {
            console.error('خطأ في جلب بيانات المطعم:', error)
          }
        }

        if (!isMounted) return

        setBranchName(data.name || '')
        setAddress(data.address || '')
        setCity(data.city || '')
        setRestaurantName(restaurantNameValue || '')
        setIsActive(data.status !== 'inactive')
        setPartnerProfile({
          id: snap.id,
          ...data,
          restaurantName: restaurantNameValue,
          restaurantLogo,
        })
        setLoading(false)
      },
      (error) => {
        console.error(error)
        if (isMounted) {
          setLoading(false)
          showToast?.('تعذر تحميل بيانات الإعدادات', 'error')
        }
      }
    )

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [branchId, showToast])

  const counts = useMemo(
    () => ({
      new: orders.filter((order) => String(order?.status || '').trim().toLowerCase() === 'pending').length,
      accepted: orders.filter((order) => ['accepted', 'ready'].includes(String(order?.status || '').trim().toLowerCase())).length,
      completed: orders.filter((order) => String(order?.status || '').trim().toLowerCase() === 'completed').length,
    }),
    [orders]
  )

  const drawerProfile = useMemo(() => {
    if (!partnerProfile) return partnerProfile
    return {
      ...partnerProfile,
      status: isActive ? 'active' : 'inactive',
      restaurantName: restaurantName || partnerProfile.restaurantName,
    }
  }, [partnerProfile, isActive, restaurantName])

  const branchState = getBranchStateMeta(drawerProfile, branchId)

  const statusMeta = useMemo(() => {
    if (isActive) {
      return {
        title: 'الفرع مفتوح الآن',
        subtitle: 'يتم استقبال الطلبات الجديدة من تطبيق المستخدم.',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dotClass: 'bg-emerald-500',
        buttonClass:
          'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 active:scale-[0.99]',
        buttonText: 'إيقاف الطلبات مؤقتًا',
      }
    }

    return {
      title: 'الفرع متوقف مؤقتًا',
      subtitle: 'لن يظهر الفرع للمستخدمين حتى تعيد تشغيل استقبال الطلبات.',
      badgeClass: 'bg-red-50 text-red-700 border-red-200',
      dotClass: 'bg-red-500',
      buttonClass:
        'bg-[#ee7b26]/10 text-[#c45d12] border-[#f3c39d] hover:bg-[#ee7b26]/15 active:scale-[0.99]',
      buttonText: 'إعادة تشغيل استقبال الطلبات',
    }
  }, [isActive])

  const handleToggleOrders = async () => {
    if (!branchId || statusSaving) return

    const nextValue = !isActive
    const previousValue = isActive

    setIsActive(nextValue)
    setStatusSaving(true)

    try {
      await updateDoc(doc(db, 'branches', branchId), {
        status: nextValue ? 'active' : 'inactive',
      })

      showToast?.(
        nextValue ? 'تم تشغيل استقبال الطلبات ✅' : 'تم إيقاف استقبال الطلبات مؤقتًا ⛔',
        'success'
      )
    } catch (error) {
      console.error(error)
      setIsActive(previousValue)
      showToast?.('تعذر تغيير حالة استقبال الطلبات', 'error')
    } finally {
      setStatusSaving(false)
    }
  }

  const handleSave = async () => {
    if (!branchId || saving) return

    setSaving(true)
    try {
      await updateDoc(doc(db, 'branches', branchId), {
        name: branchName.trim(),
        address: address.trim(),
        city: city.trim(),
      })
      showToast?.('تم حفظ بيانات الفرع ✅', 'success')
    } catch (error) {
      console.error(error)
      showToast?.('حدث خطأ أثناء حفظ بيانات الفرع', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f5f1] pb-24 text-right font-['Cairo'] text-[#1f2937]" dir="rtl">
      <OrdersMenuDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        counts={counts}
        activeScreen="settings"
        setCurrentScreen={setCurrentScreen}
        partnerProfile={drawerProfile}
        branchState={branchState}
      />

      <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6">
        <div className="mb-5 overflow-hidden rounded-[28px] border border-[#e9e9e9] bg-white shadow-[0_12px_34px_rgba(15,23,42,0.06)]">
          <div className="border-b border-[#ededed] bg-white px-4 pt-4 pb-4 md:px-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-[#e6e6e6] bg-white text-[#333] shadow-sm transition-colors hover:bg-[#fafafa]"
                  aria-label="فتح القائمة"
                >
                  ☰
                </button>

                <div className="min-w-0">
                  <h1 className="truncate text-[20px] font-black leading-none text-[#1f1f1f] md:text-[24px]">
                    الإعدادات
                  </h1>
                  <p className="mt-2 truncate text-[13px] text-[#787878]">
                    إدارة حالة الفرع وبياناته التشغيلية
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div
                  className={`inline-flex h-11 items-center gap-2 rounded-2xl border px-4 text-[13px] font-black ${branchState.badgeClass}`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${branchState.dotClass}`} />
                  {branchState.shortLabel}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentScreen('dashboard')}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#e6e6e6] bg-white px-4 text-[14px] font-black text-[#333] shadow-sm transition-colors hover:bg-[#fafafa]"
                >
                  العودة
                </button>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-[28px] border border-[#ebe4d8] bg-white px-6 py-20 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
            <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-[#ee7b26] border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-[30px] border border-[#ebe4d8] bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.06)] sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="mb-2 text-sm font-bold text-[#9a7b5d]">حالة التشغيل</p>
                  <div
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-bold ${statusMeta.badgeClass}`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${statusMeta.dotClass}`} />
                    <span>{statusMeta.title}</span>
                  </div>
                </div>

                <div className="rounded-2xl bg-[#faf7f2] px-3 py-2 text-left text-xs text-[#8b8f97]">
                  {restaurantName ? (
                    <>
                      <div className="font-bold text-[#111827]">{restaurantName}</div>
                      <div>{branchName || 'الفرع'}</div>
                    </>
                  ) : (
                    <div>{branchName || 'الفرع'}</div>
                  )}
                </div>
              </div>

              <div className="rounded-[24px] border border-[#f0e7da] bg-[#fcfbf9] p-4 sm:p-5">
                <p className="text-base font-black text-[#111827]">{statusMeta.title}</p>
                <p className="mt-1 text-sm leading-7 text-[#6b7280]">{statusMeta.subtitle}</p>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isActive}
                      aria-label={isActive ? 'الفرع مفتوح' : 'الفرع متوقف'}
                      onClick={handleToggleOrders}
                      disabled={statusSaving}
                      className={`relative h-9 w-[72px] rounded-full border transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        isActive
                          ? 'border-[#ee7b26]/35 bg-[#ee7b26]'
                          : 'border-[#d7dbe2] bg-[#d1d5db]'
                      }`}
                    >
                      <span
                        className={`absolute top-1 h-7 w-7 rounded-full bg-white shadow-md transition-all ${
                          isActive ? 'right-1' : 'right-[36px]'
                        }`}
                      />
                    </button>

                    <div>
                      <p className="text-sm font-bold text-[#111827]">استقبال الطلبات</p>
                      <p className="text-xs text-[#8b8f97]">
                        {isActive ? 'مفعّل حاليًا' : 'متوقف حاليًا'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleToggleOrders}
                    disabled={statusSaving}
                    className={`rounded-2xl border px-4 py-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${statusMeta.buttonClass}`}
                  >
                    {statusSaving ? 'جارٍ التنفيذ...' : statusMeta.buttonText}
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-[30px] border border-[#ebe4d8] bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.06)] sm:p-6">
              <div className="mb-5">
                <h2 className="text-lg font-black text-[#111827]">بيانات الفرع</h2>
                <p className="mt-1 text-sm text-[#6b7280]">
                  يمكنك تعديل اسم الفرع والعنوان والمدينة دون تغيير أي وظائف أخرى.
                </p>
              </div>

              {restaurantName && (
                <div className="mb-4 rounded-[22px] border border-[#efe6d8] bg-[#fffaf5] px-4 py-4">
                  <p className="mb-1 text-xs font-bold text-[#a27c53]">المطعم</p>
                  <p className="text-lg font-black text-[#1f2937]">{restaurantName}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="mb-2 mr-1 block text-sm font-bold text-[#6b7280]">اسم الفرع</label>
                  <input
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    placeholder="اسم الفرع"
                    className={rowBaseClass}
                  />
                </div>

                <div>
                  <label className="mb-2 mr-1 block text-sm font-bold text-[#6b7280]">العنوان</label>
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="العنوان"
                    className={rowBaseClass}
                  />
                </div>

                <div>
                  <label className="mb-2 mr-1 block text-sm font-bold text-[#6b7280]">المدينة</label>
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="المدينة"
                    className={rowBaseClass}
                  />
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 rounded-2xl bg-[#ee7b26] px-4 py-4 text-sm font-black text-white shadow-[0_12px_25px_rgba(238,123,38,0.25)] transition hover:bg-[#d96a1f] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? 'جارٍ حفظ البيانات...' : 'حفظ بيانات الفرع'}
                </button>

                <button
                  onClick={onLogout}
                  className="rounded-2xl border border-[#f2d0d0] bg-[#fff5f5] px-4 py-4 text-sm font-bold text-[#c24141] transition hover:bg-[#ffecec] sm:min-w-[170px]"
                >
                  تسجيل الخروج
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SettingsScreen
