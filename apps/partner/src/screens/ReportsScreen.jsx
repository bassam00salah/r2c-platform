import { useEffect, useMemo, useState } from 'react'
import { db } from '@r2c/shared'
import { doc, getDoc, onSnapshot } from 'firebase/firestore'
import Logo from '../components/logo'
import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { FileOpener } from '@capacitor-community/file-opener'

const RANGE_OPTIONS = [
  { key: 'today', label: 'اليوم' },
  { key: '7d', label: 'آخر 7 أيام' },
  { key: '30d', label: 'آخر 30 يوم' },
  { key: 'all', label: 'كل الطلبات' },
]

const STATUS_OPTIONS = [
  { key: 'all', label: 'كل الحالات' },
  { key: 'pending', label: 'جديد' },
  { key: 'accepted', label: 'تحت التحضير' },
  { key: 'ready', label: 'جاهز' },
  { key: 'completed', label: 'مكتمل' },
  { key: 'rejected', label: 'مرفوض' },
]

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

function normalizeArabicDigits(value) {
  if (value == null) return ''

  return String(value)
    .replace(/[٠-٩]/g, (digit) => '٠١٢٣٤٥٦٧٨٩'.indexOf(digit))
    .replace(/[٫]/g, '.')
    .replace(/[٬,]/g, '')
}

function toNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (value == null) return 0

  const normalized = normalizeArabicDigits(value).replace(/[^0-9.-]/g, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function getOrderDate(order) {
  const raw =
    order?.createdAt ??
    order?.created_at ??
    order?.updatedAt ??
    order?.date ??
    order?.timestamp ??
    null

  if (!raw) return null

  if (typeof raw?.toDate === 'function') {
    const date = raw.toDate()
    return Number.isNaN(date?.getTime?.()) ? null : date
  }

  if (typeof raw?.toMillis === 'function') {
    const date = new Date(raw.toMillis())
    return Number.isNaN(date.getTime()) ? null : date
  }

  if (typeof raw === 'number') {
    const ms = raw < 1000000000000 ? raw * 1000 : raw
    const date = new Date(ms)
    return Number.isNaN(date.getTime()) ? null : date
  }

  if (typeof raw === 'string') {
    const date = new Date(raw)
    return Number.isNaN(date.getTime()) ? null : date
  }

  if (typeof raw === 'object' && typeof raw.seconds === 'number') {
    const date = new Date(raw.seconds * 1000)
    return Number.isNaN(date.getTime()) ? null : date
  }

  return null
}

function getOrderTotal(order) {
  return (
    toNumber(order?.totalPrice) ||
    toNumber(order?.price) ||
    toNumber(order?.total) ||
    toNumber(order?.amount) ||
    toNumber(order?.finalPrice) ||
    0
  )
}

function getDeliveryFee(order) {
  return (
    toNumber(order?.deliveryFee) ||
    toNumber(order?.shippingFee) ||
    toNumber(order?.delivery) ||
    0
  )
}

function getSubTotal(order) {
  return (
    toNumber(order?.subTotal) ||
    toNumber(order?.subtotal) ||
    Math.max(getOrderTotal(order) - getDeliveryFee(order), 0)
  )
}

function getStatusKey(status) {
  const value = String(status || '').trim().toLowerCase()

  if (value === 'pending') return 'pending'
  if (value === 'accepted') return 'accepted'
  if (value === 'ready') return 'ready'
  if (value === 'completed') return 'completed'
  if (value === 'rejected') return 'rejected'
  return value || 'unknown'
}

function getStatusLabel(status) {
  const key = getStatusKey(status)

  if (key === 'pending') return 'جديد'
  if (key === 'accepted') return 'تحت التحضير'
  if (key === 'ready') return 'جاهز'
  if (key === 'completed') return 'مكتمل'
  if (key === 'rejected') return 'مرفوض'
  return 'غير محدد'
}

function getStatusBadgeClass(status) {
  const key = getStatusKey(status)

  if (key === 'pending') return 'bg-[#fff7ed] text-[#c45d12] border-[#f3c39d]'
  if (key === 'accepted') return 'bg-[#eef4ff] text-[#2b63d9] border-[#cfe0ff]'
  if (key === 'ready') return 'bg-[#eff8ff] text-[#0f7aa8] border-[#cdeefe]'
  if (key === 'completed') return 'bg-[#eef9f1] text-[#178b4b] border-[#caebd5]'
  if (key === 'rejected') return 'bg-[#fff1f1] text-[#d43a3a] border-[#ffd6d6]'
  return 'bg-[#f4f4f5] text-[#666] border-[#e5e7eb]'
}

function formatCurrency(value) {
  return new Intl.NumberFormat('ar-EG', {
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value)
}

function formatPercent(value) {
  return `${Math.round(value)}%`
}

function formatDate(date) {
  if (!date) return 'غير متاح'

  return new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function getRangeStart(rangeKey) {
  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)

  if (rangeKey === 'today') return start
  if (rangeKey === '7d') {
    start.setDate(start.getDate() - 6)
    return start
  }
  if (rangeKey === '30d') {
    start.setDate(start.getDate() - 29)
    return start
  }

  return null
}

function buildTimelineData(filteredOrders, rangeKey) {
  const pointsCount = rangeKey === '30d' ? 10 : 7
  const now = new Date()
  const data = []

  for (let i = pointsCount - 1; i >= 0; i -= 1) {
    const day = new Date(now)
    day.setHours(0, 0, 0, 0)
    day.setDate(day.getDate() - i)

    const label = day.toLocaleDateString('ar-EG', {
      month: 'numeric',
      day: 'numeric',
    })

    const count = filteredOrders.filter((order) => {
      const orderDate = getOrderDate(order)
      return orderDate ? sameDay(orderDate, day) : false
    }).length

    data.push({ label, count })
  }

  return data
}

function getOrderItems(order) {
  if (Array.isArray(order?.items)) return order.items
  if (Array.isArray(order?.cartItems)) return order.cartItems
  if (Array.isArray(order?.products)) return order.products
  if (Array.isArray(order?.selectedItems)) return order.selectedItems
  return []
}

function getItemsCount(order) {
  const items = getOrderItems(order)
  return items.reduce((sum, item) => sum + (toNumber(item?.quantity) || 1), 0)
}

function getItemsSummary(order) {
  const items = getOrderItems(order)
  if (!items.length) return ''

  return items
    .map((item) => {
      const name = item?.name || item?.title || item?.productName || 'عنصر'
      const quantity = toNumber(item?.quantity) || 1
      return `${name} × ${quantity}`
    })
    .join(' | ')
}

function getCustomerName(order) {
  return (
    order?.customerName ||
    order?.userName ||
    order?.name ||
    order?.customer?.name ||
    'غير محدد'
  )
}

function getCustomerPhone(order) {
  return (
    order?.customerPhone ||
    order?.phone ||
    order?.mobile ||
    order?.customer?.phone ||
    'غير محدد'
  )
}

function getOrderCity(order) {
  return (
    order?.city ||
    order?.customerCity ||
    order?.branchCity ||
    order?.address?.city ||
    'غير محدد'
  )
}

function getOrderAddress(order) {
  if (typeof order?.address === 'string') return order.address

  return (
    order?.deliveryAddress ||
    order?.address?.street ||
    order?.address?.label ||
    order?.customerAddress ||
    ''
  )
}

function getOfferName(order) {
  return order?.offerName || order?.title || order?.name || 'عرض غير محدد'
}

function csvEscape(value) {
  const text = String(value ?? '')
  return `"${text.replace(/"/g, '""')}"`
}

function base64FromUtf8(text) {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

async function exportOrdersToExcelCompatibleCsv({ filteredOrders, selectedRange, selectedStatus }) {
  const headers = [
    'رقم الطلب',
    'الحالة',
    'التاريخ',
    'العميل',
    'رقم الهاتف',
    'المدينة',
    'العنوان',
    'اسم العرض',
    'عدد العناصر',
    'العناصر',
    'الإجمالي الفرعي',
    'رسوم التوصيل',
    'الإجمالي',
    'طريقة الدفع',
    'الفترة المختارة',
    'فلتر الحالة',
  ]

  const rows = filteredOrders.map((order) => [
    order?.id || order?.orderId || '',
    getStatusLabel(order?.status),
    formatDate(getOrderDate(order)),
    getCustomerName(order),
    getCustomerPhone(order),
    getOrderCity(order),
    getOrderAddress(order),
    getOfferName(order),
    getItemsCount(order),
    getItemsSummary(order),
    getSubTotal(order),
    getDeliveryFee(order),
    getOrderTotal(order),
    order?.paymentMethod || order?.paymentType || 'غير محدد',
    RANGE_OPTIONS.find((item) => item.key === selectedRange)?.label || selectedRange,
    STATUS_OPTIONS.find((item) => item.key === selectedStatus)?.label || selectedStatus,
  ])

  const csvContent = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n')
  const dateLabel = new Date().toISOString().slice(0, 10)
  const fileName = `reports-${dateLabel}.csv`

  if (Capacitor.isNativePlatform()) {
    const path = `reports/${fileName}`
    const base64Data = base64FromUtf8(`\uFEFF${csvContent}`)

    await Filesystem.writeFile({
      path,
      data: base64Data,
      directory: Directory.Cache,
      recursive: true,
    })

    const fileUriResult = await Filesystem.getUri({
      path,
      directory: Directory.Cache,
    })

    let opened = false

    try {
      await FileOpener.open({
        filePath: fileUriResult.uri,
        contentType: 'text/csv',
        openWithDefault: true,
      })
      opened = true
    } catch (openError) {
      console.warn('تعذر فتح ملف التقرير تلقائيًا، لكن تم حفظه بنجاح:', openError)
    }

    return {
      opened,
      fileName,
      uri: fileUriResult.uri,
    }
  }

  const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', fileName)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  return {
    opened: true,
    fileName,
    uri: url,
  }
}

function StatCard({ label, value, sublabel, accent = 'text-[#1f2937]' }) {
  return (
    <div className="rounded-[24px] border border-[#ececec] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="text-[12px] font-bold text-[#8b8b8b]">{label}</div>
      <div className={`mt-2 text-[28px] font-black leading-none ${accent}`}>{value}</div>
      {sublabel ? <div className="mt-2 text-[12px] text-[#9a9a9a]">{sublabel}</div> : null}
    </div>
  )
}

const ReportsScreen = ({ branchId, setCurrentScreen, orders = [] }) => {
  const [selectedRange, setSelectedRange] = useState('7d')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [isExporting, setIsExporting] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [partnerProfile, setPartnerProfile] = useState(null)

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

  const rangeStart = useMemo(() => getRangeStart(selectedRange), [selectedRange])

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const orderDate = getOrderDate(order)
      const statusKey = getStatusKey(order?.status)

      const matchesRange = !rangeStart || (orderDate && orderDate >= rangeStart)
      const matchesStatus = selectedStatus === 'all' || statusKey === selectedStatus

      return matchesRange && matchesStatus
    })
  }, [orders, rangeStart, selectedStatus])

  const stats = useMemo(() => {
    const total = filteredOrders.length
    const pending = filteredOrders.filter((order) => getStatusKey(order?.status) === 'pending').length
    const accepted = filteredOrders.filter((order) => getStatusKey(order?.status) === 'accepted').length
    const ready = filteredOrders.filter((order) => getStatusKey(order?.status) === 'ready').length
    const completed = filteredOrders.filter((order) => getStatusKey(order?.status) === 'completed').length
    const rejected = filteredOrders.filter((order) => getStatusKey(order?.status) === 'rejected').length
    const revenue = filteredOrders.reduce((sum, order) => sum + getOrderTotal(order), 0)
    const avgOrderValue = total > 0 ? revenue / total : 0
    const acceptBase = accepted + ready + completed
    const acceptRate = total > 0 ? (acceptBase / total) * 100 : 0
    const doneRate = total > 0 ? (completed / total) * 100 : 0
    const rejectRate = total > 0 ? (rejected / total) * 100 : 0

    return {
      total,
      pending,
      accepted,
      ready,
      completed,
      rejected,
      revenue,
      avgOrderValue,
      acceptRate,
      doneRate,
      rejectRate,
    }
  }, [filteredOrders])

  const timelineData = useMemo(
    () => buildTimelineData(filteredOrders, selectedRange),
    [filteredOrders, selectedRange]
  )

  const maxTimelineCount = Math.max(...timelineData.map((item) => item.count), 1)

  const topCities = useMemo(() => {
    const cityMap = new Map()

    filteredOrders.forEach((order) => {
      const city = getOrderCity(order)
      cityMap.set(city, (cityMap.get(city) || 0) + 1)
    })

    return [...cityMap.entries()]
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [filteredOrders])

  const topOffers = useMemo(() => {
    const offerMap = new Map()

    filteredOrders.forEach((order) => {
      const offerName = getOfferName(order)
      offerMap.set(offerName, (offerMap.get(offerName) || 0) + 1)
    })

    return [...offerMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [filteredOrders])

  const latestOrders = useMemo(() => {
    return [...filteredOrders]
      .sort((a, b) => {
        const timeA = getOrderDate(a)?.getTime?.() || 0
        const timeB = getOrderDate(b)?.getTime?.() || 0
        return timeB - timeA
      })
      .slice(0, 6)
  }, [filteredOrders])

  const counts = useMemo(
    () => ({
      new: orders.filter((order) => getStatusKey(order?.status) === 'pending').length,
      accepted: orders.filter((order) => {
        const status = getStatusKey(order?.status)
        return status === 'accepted' || status === 'ready'
      }).length,
      completed: orders.filter((order) => getStatusKey(order?.status) === 'completed').length,
    }),
    [orders]
  )

  const branchState = getBranchStateMeta(partnerProfile, branchId)

  const handleExport = async () => {
    try {
      setIsExporting(true)
      const result = await exportOrdersToExcelCompatibleCsv({ filteredOrders, selectedRange, selectedStatus })

      if (Capacitor.isNativePlatform()) {
        if (result?.opened) {
          alert(`تم تصدير التقرير وفتحه بنجاح\n${result.fileName}`)
        } else {
          alert(`تم حفظ التقرير بنجاح\n${result.fileName}\nقد لا يوجد تطبيق مثبت لفتح ملفات CSV تلقائيًا.`)
        }
      }
    } catch (err) {
      console.error('Export failed:', err)
      alert('فشل حفظ ملف التقرير، حاول مرة أخرى')
    } finally {
      setTimeout(() => setIsExporting(false), 500)
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f7f7] pb-24" dir="rtl">
      <OrdersMenuDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        counts={counts}
        activeScreen="reports"
        setCurrentScreen={setCurrentScreen}
        partnerProfile={partnerProfile}
        branchState={branchState}
      />

      <div className="mx-auto w-full max-w-6xl px-3 pt-3 md:px-5 md:pt-5">
        <div className="overflow-hidden rounded-[28px] border border-[#e9e9e9] bg-white shadow-[0_12px_34px_rgba(15,23,42,0.06)]">
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
                    تقارير الفرع
                  </h1>
                  <p className="mt-2 truncate text-[13px] text-[#787878]">
                    إحصائيات الطلبات والمبيعات
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
                  onClick={handleExport}
                  disabled={isExporting || filteredOrders.length === 0}
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#ee7b26] px-5 text-[14px] font-black text-white shadow-[0_10px_24px_rgba(238,123,38,0.22)] transition-all hover:translate-y-[-1px] hover:bg-[#df6f1d] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {isExporting ? 'جارٍ التصدير...' : 'تصدير Excel'}
                </button>

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

          <div className="border-b border-[#efefef] bg-[#fcfcfc] px-4 py-4 md:px-6">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr_auto]">
              <div>
                <div className="mb-2 text-[12px] font-extrabold text-[#7c7c7c]">الفترة الزمنية</div>
                <div className="flex flex-wrap gap-2">
                  {RANGE_OPTIONS.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setSelectedRange(option.key)}
                      className={`rounded-full border px-4 py-2 text-[13px] font-bold transition-colors ${
                        selectedRange === option.key
                          ? 'border-[#f4d1b7] bg-[#fff8f1] text-[#c45d12]'
                          : 'border-[#ececec] bg-white text-[#666] hover:bg-[#fafafa]'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 text-[12px] font-extrabold text-[#7c7c7c]">حالة الطلب</div>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setSelectedStatus(option.key)}
                      className={`rounded-full border px-4 py-2 text-[13px] font-bold transition-colors ${
                        selectedStatus === option.key
                          ? 'border-[#f4d1b7] bg-[#fff8f1] text-[#c45d12]'
                          : 'border-[#ececec] bg-white text-[#666] hover:bg-[#fafafa]'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-end">
                <div className="w-full rounded-[22px] border border-[#ececec] bg-white px-4 py-3 text-center shadow-sm">
                  <div className="text-[12px] font-bold text-[#8a8a8a]">عدد الطلبات بعد التصفية</div>
                  <div className="mt-1 text-[26px] font-black text-[#1f1f1f]">{stats.total}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#fafafa] px-4 py-5 md:px-6 md:py-6">
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
              <StatCard label="إجمالي الطلبات" value={stats.total} accent="text-[#1f2937]" />
              <StatCard
                label="إجمالي المبيعات"
                value={`${formatCurrency(stats.revenue)} ج.م`}
                accent="text-[#c45d12]"
              />
              <StatCard label="طلبات جديدة" value={stats.pending} accent="text-[#b45309]" />
              <StatCard
                label="تحت التحضير + جاهز"
                value={stats.accepted + stats.ready}
                sublabel={`جاهز للتسليم: ${stats.ready}`}
                accent="text-[#2563eb]"
              />
              <StatCard label="مكتملة" value={stats.completed} accent="text-[#15803d]" />
              <StatCard label="مرفوضة" value={stats.rejected} accent="text-[#dc2626]" />
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[26px] border border-[#ececec] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-[18px] font-black text-[#232323]">حركة الطلبات</h2>
                  <span className="text-[12px] font-bold text-[#8c8c8c]">
                    {RANGE_OPTIONS.find((item) => item.key === selectedRange)?.label}
                  </span>
                </div>

                {timelineData.every((item) => item.count === 0) ? (
                  <div className="flex min-h-[220px] items-center justify-center rounded-[22px] border border-dashed border-[#e6e6e6] bg-[#fcfcfc] text-[15px] font-bold text-[#b5b5b5]">
                    لا توجد بيانات كافية للرسم البياني
                  </div>
                ) : (
                  <div className="flex h-[220px] items-end justify-between gap-2">
                    {timelineData.map((item) => (
                      <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
                        <span className="text-[12px] font-black text-[#c45d12]">{item.count || ''}</span>
                        <div
                          className="w-full rounded-t-[14px] bg-[#ee7b26] transition-all"
                          style={{
                            height: `${Math.max(Math.round((item.count / maxTimelineCount) * 150), 6)}px`,
                            opacity: item.count > 0 ? 1 : 0.18,
                          }}
                        />
                        <span className="text-[11px] font-bold text-[#8a8a8a]">{item.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-[26px] border border-[#ececec] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                <h2 className="mb-5 text-[18px] font-black text-[#232323]">مؤشرات الأداء</h2>
                <div className="space-y-5">
                  {[
                    { label: 'معدل القبول', value: stats.acceptRate, color: '#ee7b26' },
                    { label: 'نسبة الإتمام', value: stats.doneRate, color: '#18a957' },
                    { label: 'نسبة الرفض', value: stats.rejectRate, color: '#e24b4b' },
                    {
                      label: 'متوسط قيمة الطلب',
                      value: stats.avgOrderValue,
                      color: '#2b63d9',
                      isCurrency: true,
                    },
                  ].map((item) => {
                    const width = item.isCurrency ? 100 : Math.min(Math.round(item.value), 100)
                    return (
                      <div key={item.label}>
                        <div className="mb-2 flex items-center justify-between gap-3 text-[13px]">
                          <span className="font-black" style={{ color: item.color }}>
                            {item.isCurrency ? `${formatCurrency(item.value)} ج.م` : formatPercent(item.value)}
                          </span>
                          <span className="font-bold text-[#6f6f6f]">{item.label}</span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-[#f0f0f0]">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${width}%`, background: item.color }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
              <div className="rounded-[26px] border border-[#ececec] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                <h2 className="mb-4 text-[18px] font-black text-[#232323]">أكثر المدن طلبًا</h2>
                {topCities.length === 0 ? (
                  <div className="rounded-[20px] border border-dashed border-[#e6e6e6] bg-[#fcfcfc] px-4 py-8 text-center text-[14px] font-bold text-[#b5b5b5]">
                    لا توجد مدن متاحة ضمن البيانات الحالية
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topCities.map((item, index) => (
                      <div
                        key={`${item.city}-${index}`}
                        className="flex items-center justify-between rounded-[18px] border border-[#efefef] bg-[#fcfcfc] px-4 py-3"
                      >
                        <span className="rounded-full bg-[#fff3e8] px-3 py-1 text-[12px] font-black text-[#c45d12]">
                          {item.count}
                        </span>
                        <span className="text-[14px] font-bold text-[#2b2b2b]">{item.city}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-[26px] border border-[#ececec] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                <h2 className="mb-4 text-[18px] font-black text-[#232323]">أكثر العروض طلبًا</h2>
                {topOffers.length === 0 ? (
                  <div className="rounded-[20px] border border-dashed border-[#e6e6e6] bg-[#fcfcfc] px-4 py-8 text-center text-[14px] font-bold text-[#b5b5b5]">
                    لا توجد عروض متاحة ضمن البيانات الحالية
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topOffers.map((item, index) => (
                      <div
                        key={`${item.name}-${index}`}
                        className="flex items-center justify-between rounded-[18px] border border-[#efefef] bg-[#fcfcfc] px-4 py-3"
                      >
                        <span className="rounded-full bg-[#eef4ff] px-3 py-1 text-[12px] font-black text-[#2b63d9]">
                          {item.count}
                        </span>
                        <span className="line-clamp-1 text-[14px] font-bold text-[#2b2b2b]">{item.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 rounded-[26px] border border-[#ececec] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-[18px] font-black text-[#232323]">آخر الطلبات</h2>
                <span className="text-[12px] font-bold text-[#8c8c8c]">آخر {latestOrders.length} طلب</span>
              </div>

              {latestOrders.length === 0 ? (
                <div className="rounded-[20px] border border-dashed border-[#e6e6e6] bg-[#fcfcfc] px-4 py-8 text-center text-[14px] font-bold text-[#b5b5b5]">
                  لا توجد طلبات ضمن الفلاتر الحالية
                </div>
              ) : (
                <div className="space-y-3">
                  {latestOrders.map((order) => (
                    <div
                      key={order.id || order.orderId}
                      className="rounded-[20px] border border-[#efefef] bg-[#fcfcfc] px-4 py-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[15px] font-black text-[#232323]">
                              طلب #{order?.id || order?.orderId || '---'}
                            </span>
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-black ${getStatusBadgeClass(order?.status)}`}
                            >
                              {getStatusLabel(order?.status)}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[#7a7a7a]">
                            <span>{getCustomerName(order)}</span>
                            <span>{getOrderCity(order)}</span>
                            <span>{formatDate(getOrderDate(order))}</span>
                          </div>
                          <div className="mt-2 line-clamp-1 text-[13px] text-[#5f5f5f]">
                            {getOfferName(order)}
                          </div>
                        </div>

                        <div className="text-left md:text-right">
                          <div className="text-[18px] font-black text-[#c45d12]">
                            {formatCurrency(getOrderTotal(order))} ج.م
                          </div>
                          <div className="mt-1 text-[12px] text-[#8a8a8a]">
                            {getItemsCount(order)} عنصر
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReportsScreen
