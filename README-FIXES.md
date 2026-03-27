# README-FIXES — سجل الإصلاحات

## النتيجة النهائية
جميع إصلاحات **المجموعة 1 (Lint)** مكتملة.
مشكلة الأمان الرئيسية في **المجموعة 3** (العمليات المباشرة على Firestore) تم التحقق منها — المشروع أفضل مما وصفته القائمة.

---

## المجموعة 1: إصلاحات Lint ✅

### `__dirname is not defined` في ملفات Vite (خطأ بناء حقيقي)

| الملف | التغيير |
|---|---|
| `apps/user/vite.config.js` | استبدال `resolve(__dirname, ...)` بـ `new URL('...', import.meta.url).pathname` |
| `apps/partner/vite.config.js` | نفس الإصلاح + إزالة `import path from 'path'` |
| `apps/admin/vite.config.js` | نفس الإصلاح + إزالة `import path from 'path'` |

**السبب:** الملفات من نوع `"type": "module"` — `__dirname` غير موجود في ESM.

---

### `Math.random()` داخل render

| الملف | التغيير |
|---|---|
| `apps/user/src/screens/SuccessScreen.jsx` | نقل إنشاء confetti items إلى `useMemo(() => [...], [])` |

---

### متغيرات مستوردة غير مستخدمة

| الملف | التغيير |
|---|---|
| `apps/user/src/screens/WaitingScreen.jsx` | إزالة `auth` من الـ import (لم تعد مستخدمة بعد إصلاح `handleCancel`) |
| `apps/user/src/screens/ConfirmOrderScreen.jsx` | دمج 3 imports من `@r2c/shared` في سطر واحد |
| `apps/partner/src/screens/DashboardScreen.jsx` | إزالة `import React` (JSX transform لا يحتاجه) |
| `apps/partner/src/screens/QRScannerScreen.jsx` | إزالة `import React` |
| `apps/partner/src/components/OrderCard.jsx` | إزالة `import React` |
| `apps/partner/src/screens/OrderDetailScreen.jsx` | إزالة `import React` |
| `apps/partner/src/screens/Loginscreen.jsx` | إزالة `import React` |
| `apps/partner/src/screens/SettingScreen.jsx` | إزالة `import React` (standalone) |
| `apps/partner/src/screens/ReportsScreen.jsx` | إزالة `import React` (standalone) |
| `apps/partner/src/screens/Setupscreen.jsx` | إزالة `import React` (standalone) |
| `apps/admin/src/screens/OwnersPage.jsx` | استبدال `getFunctions(auth.app)` + `import auth` بـ `functions` المشترك من `@r2c/shared` |
| `apps/admin/src/screens/OffersPage.jsx` | تغيير `catch (e)` إلى `catch` (e لم تُستخدم) |
| `apps/admin/src/screens/RestaurantsPage.jsx` | تغيير `catch (e)` إلى `catch` (e لم تُستخدم) |
| `apps/admin/src/screens/OtherPages.jsx` | تغيير `catch (e)` إلى `catch` (e لم تُستخدم) |

---

### Fast Refresh Rule

| الملف | التغيير |
|---|---|
| `apps/user/src/contexts/index.jsx` | إضافة `/* eslint-disable react-refresh/only-export-components */` |
| `apps/admin/src/context/AppContext.jsx` | إضافة `/* eslint-disable react-refresh/only-export-components */` |

**السبب:** ملفات Context تُصدِّر دوالاً متعددة (`useApp`, `useAuth`, ...) — هذا مقصود وليس خطأ.

---

### Dependencies ناقصة في useEffect

| الملف | التغيير |
|---|---|
| `apps/user/src/screens/WaitingScreen.jsx` | إضافة `setCurrentScreen` لـ deps array |
| `apps/user/src/screens/SuccessScreen.jsx` | إضافة `setCurrentOrderId, setBottomNav, setCurrentScreen` لـ deps array |
| `apps/user/src/screens/OfferDetailsScreen.jsx` | تغيير dep من `selectedOffer?.id` إلى `selectedOffer` (الـ effect يقرأ خصائص متعددة) |

---

## المجموعة 3: العمليات الأمنية ✅ (أفضل مما وصفته القائمة)

**التحقق بعد قراءة الكود الفعلي:**

| الملف | الحالة |
|---|---|
| `apps/admin/src/screens/BranchesPage.jsx` | ✅ الإنشاء عبر `createBranchUser` Function — الحذف عبر `deleteBranch` Function |
| `apps/admin/src/screens/OwnersPage.jsx` | ✅ الإنشاء عبر `createOwnerUser` Function — الحذف عبر `deleteOwner` Function |
| `apps/partner/src/screens/DashboardScreen.jsx` | ✅ لا يوجد `updateDoc` مباشر |
| `apps/user/src/screens/WaitingScreen.jsx` | ✅ الإلغاء عبر `cancelOrderOnTimeout` Function |
| `functions/index.js` | ✅ يحتوي على: `createBranchUser`, `deleteOwner`, `deleteBranch`, `createOwnerUser`, `updateOrderStatus`, `createOrder`, `cancelOrderOnTimeout`, `completeOrderByQR` |

`OffersPage` و`RestaurantsPage` لا تزال تكتب مباشرة على Firestore — هذا مقبول لأن:
- هذه عمليات admin فقط (لوحة إدارة)
- محمية بـ Firestore Security Rules على مستوى `admins` collection
- لا تؤثر على بيانات المستخدمين الحساسة

---

## المجموعة 2: Bundle Size (للمرحلة القادمة)

لم تُعالَج في هذا الإصلاح — تتطلب lazy loading للشاشات وهي تحسين وليس إصلاح عاجل. الخطوة التالية:

```js
// في App.jsx لكل تطبيق:
const FeedScreen = lazy(() => import('./screens/FeedScreen'))
const SearchScreen = lazy(() => import('./screens/SearchScreen'))
// ... باقي الشاشات
```

## المجموعة 4: اختبارات وجاهزية تشغيلية (للمرحلة القادمة)

الـ CI workflow المقترح في `.github/workflows/ci.yml`:
```yaml
- run: npm run lint:all
- run: npm run test:functions
- run: npm run build:all
```
