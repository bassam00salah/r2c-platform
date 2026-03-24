# R2C Security Fixes - تعليمات التطبيق

## الملفات المُصلحة

### 1. `functions/index.js` → استبدل الملف بالكامل
**المشاكل المُصلحة:**
- ✅ حذف الكود المكرر (كل دالة كانت معرّفة مرتين)
- ✅ إضافة مصادقة لـ `processCancelOrder` عبر shared secret header
- ✅ إرسال الـ secret في header عند إنشاء Cloud Task

**مطلوب منك:**
- أضف environment variable باسم `TASKS_SHARED_SECRET` بقيمة عشوائية قوية:
  ```bash
  firebase functions:secrets:set TASKS_SHARED_SECRET
  ```

### 2. `packages/shared/src/utils/branchAccess.js` → استبدل الملف
**المشكلة المُصلحة:**
- ✅ إزالة الـ fallback الخطير الذي كان يمنح أي مستخدم وصول شريك

**ملاحظة:** تأكد أن `apps/partner/src/App.jsx` يتعامل مع `null` بشكل صحيح (يوجه لشاشة setup) - وهو يفعل ذلك حالياً.

### 3. `firestore.indexes.json` → استبدل الملف
**المشكلة المُصلحة:**
- ✅ إضافة composite indexes للاستعلامات المركبة

**مطلوب منك:**
```bash
firebase deploy --only firestore:indexes
```

## إصلاحات مُوصى بها لاحقاً (لم تُنفذ هنا)
- نقل إنشاء الطلبات لـ Cloud Function (التحقق من السعر server-side)
- إضافة rate limiting على إنشاء الطلبات
- الانتقال لـ TypeScript
- إضافة React Router
- إضافة Error Boundaries
