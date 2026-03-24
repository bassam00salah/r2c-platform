# إعداد Cloud Tasks لإلغاء الطلبات تلقائياً

## لماذا Cloud Tasks؟
الدالة `autoCancelOrder` كانت تستخدم `setTimeout(45000)` داخل Cloud Function،
مما يعني إبقاء الـ process حية 45 ثانية كاملة — مكلف وغير موثوق تحت الضغط.

الحل الجديد: عند إنشاء طلب جديد، تُجدوَل مهمة في Cloud Tasks تُنفَّذ بعد 45 ثانية
عبر HTTP إلى `processCancelOrder`. الـ Function تنتهي فوراً وتُستدعى لاحقاً.

---

## خطوات الإعداد (مرة واحدة)

### 1. تفعيل Cloud Tasks API
```bash
gcloud services enable cloudtasks.googleapis.com --project=YOUR_PROJECT_ID
```

### 2. إنشاء Queue
```bash
gcloud tasks queues create order-cancel-queue \
  --location=us-central1 \
  --max-attempts=3 \
  --min-backoff=5s \
  --project=YOUR_PROJECT_ID
```

### 3. نشر Functions أولاً للحصول على URL
```bash
cd functions && firebase deploy --only functions:processCancelOrder
```
انسخ الـ URL الناتج، مثال:
`https://us-central1-r2capp-64f2a.cloudfunctions.net/processCancelOrder`

### 4. ضبط متغيرات البيئة
```bash
# في functions/.env (لا تُرفع في git):
GCLOUD_PROJECT=r2capp-64f2a
TASKS_LOCATION=us-central1
TASKS_QUEUE_NAME=order-cancel-queue
TASKS_CANCEL_URL=https://us-central1-r2capp-64f2a.cloudfunctions.net/processCancelOrder
```

### 5. نشر جميع الدوال
```bash
firebase deploy --only functions
```

---

## في بيئة التطوير المحلية (Emulator)
- `TASKS_CANCEL_URL` لن تكون موجودة → الدالة تتجاهل جدولة المهمة وتطبع تحذير
- استخدم `cancelOrderOnTimeout` (callable) مباشرة من الـ client للاختبار

---

## التحقق
```bash
# تحقق من الـ queue
gcloud tasks queues describe order-cancel-queue --location=us-central1

# تابع logs الـ function
firebase functions:log --only processCancelOrder
```
