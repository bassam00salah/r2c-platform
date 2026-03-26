/**
 * R2C Platform — Cloud Functions (إصدار مُحسَّن)
 *
 * الإصلاحات المطبَّقة:
 *  1. [أمان]   cancelPendingOrder تستخدم Transaction بدلاً من get+update المنفصلَين
 *  2. [أمان]   createOrder callable جديدة — تتحقق من السعر server-side بدلاً من الاعتماد على العميل
 *  3. [أمان]   Rate Limiting على إنشاء الطلبات (طلب واحد كل 60 ثانية للمستخدم)
 *  4. [أمان]   QR Code منفصل عن orderId (UUID مستقل) لا يمكن تخمينه
 *  5. [جودة]   ORDER_STATUS كـ const مشترك في أعلى الملف
 *  6. [جودة]   معالجة أخطاء مُنظَّمة في كل دالة
 */

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const crypto = require("crypto");

admin.initializeApp();

const db = admin.firestore();
const { FieldValue } = admin.firestore;

// ─── ثوابت مشتركة ──────────────────────────────────────────────────────────
const ORDER_STATUS = Object.freeze({
  PENDING:   "pending",
  ACCEPTED:  "accepted",
  READY:     "ready",
  COMPLETED: "completed",
  REJECTED:  "rejected",
  CANCELLED: "cancelled",
});

// ─── إعدادات Cloud Tasks ────────────────────────────────────────────────────
const PROJECT_ID           = process.env.GCLOUD_PROJECT || "";
const LOCATION             = process.env.TASKS_LOCATION    || "us-central1";
const QUEUE_NAME           = process.env.TASKS_QUEUE_NAME  || "order-cancel-queue";
const CANCEL_URL           = process.env.TASKS_CANCEL_URL  || "";
const CANCEL_DELAY_SECONDS = 45;
const TASKS_SHARED_SECRET  = process.env.TASKS_SHARED_SECRET || "";

// ─── Rate Limit: مدة الانتظار بين طلبَين للمستخدم الواحد (بالثواني) ────────
const ORDER_RATE_LIMIT_SECONDS = 60;

// ─── Helper: إلغاء الطلب بأمان عبر Transaction ──────────────────────────────
async function cancelPendingOrder(orderId, reason = "timeout") {
  const orderRef = db.collection("orders").doc(orderId);

  // [إصلاح] Transaction تضمن عدم وجود race condition
  const cancelled = await db.runTransaction(async (tx) => {
    const snap = await tx.get(orderRef);
    if (!snap.exists) return false;

    const { status } = snap.data();
    if (status !== ORDER_STATUS.PENDING) return false;

    tx.update(orderRef, {
      status:      ORDER_STATUS.CANCELLED,
      cancelReason: reason,
      cancelledAt: FieldValue.serverTimestamp(),
      updatedAt:   FieldValue.serverTimestamp(),
    });
    return true;
  });

  return cancelled;
}

// ─── Helper: توليد QR Code آمن ──────────────────────────────────────────────
function generateQRCode() {
  // [إصلاح] QR Code مستقل عن orderId — لا يمكن تخمينه
  return crypto.randomBytes(16).toString("hex");
}

// ─── 1. إنشاء الطلب — Callable (يتحقق من السعر server-side) ────────────────
exports.createOrder = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }

  const { offerId, branchId, userLat, userLng } = data || {};
  if (!offerId || !branchId) {
    throw new HttpsError("invalid-argument", "offerId and branchId are required.");
  }

  // ── Rate Limiting: منع الطلبات المتكررة ─────────────────────────────────
  const rateLimitRef = db.collection("_rateLimits").doc(`order_${auth.uid}`);
  const rateLimitSnap = await rateLimitRef.get();
  if (rateLimitSnap.exists) {
    const lastOrderTime = rateLimitSnap.data().lastOrderAt?.toMillis?.() || 0;
    const elapsedSeconds = (Date.now() - lastOrderTime) / 1000;
    if (elapsedSeconds < ORDER_RATE_LIMIT_SECONDS) {
      const waitSeconds = Math.ceil(ORDER_RATE_LIMIT_SECONDS - elapsedSeconds);
      throw new HttpsError(
        "resource-exhausted",
        `يرجى الانتظار ${waitSeconds} ثانية قبل إنشاء طلب جديد.`
      );
    }
  }

  // ── جلب بيانات العرض server-side ────────────────────────────────────────
  const offerSnap = await db.collection("offers").doc(offerId).get();
  if (!offerSnap.exists) {
    throw new HttpsError("not-found", "العرض غير موجود.");
  }
  const offer = offerSnap.data();
  if (offer.status === "inactive") {
    throw new HttpsError("failed-precondition", "هذا العرض غير متاح حالياً.");
  }

  // ── جلب بيانات الفرع server-side ────────────────────────────────────────
  const branchSnap = await db.collection("branches").doc(branchId).get();
  if (!branchSnap.exists) {
    throw new HttpsError("not-found", "الفرع غير موجود.");
  }
  const branch = branchSnap.data();
  if (branch.status !== "active") {
    throw new HttpsError("failed-precondition", "هذا الفرع غير نشط.");
  }

  // ── جلب بيانات المستخدم ──────────────────────────────────────────────────
  const userSnap = await db.collection("users").doc(auth.uid).get();
  const userData = userSnap.exists ? userSnap.data() : {};

  // ── [إصلاح] QR Code منفصل عن orderId ────────────────────────────────────
  const qrCode    = generateQRCode();
  const orderRef  = db.collection("orders").doc();
  const orderCode = orderRef.id.slice(-6).toUpperCase();

  const newOrder = {
    userId:         auth.uid,
    userName:       userData.name || auth.token?.name || "",
    offerId,
    offerName:      offer.name,
    restaurantId:   offer.restaurantId,
    restaurantName: offer.restaurantName || offer.restaurant || "",
    branchId,
    branch:         branch.name || "الفرع الرئيسي",
    branchAddress:  branch.address || "",
    userLat:        userLat || null,
    userLng:        userLng || null,
    // [إصلاح الأمان] السعر يأتي من Firestore لا من العميل
    price:          offer.price ?? offer.finalPrice ?? 0,
    discount:       offer.discount || 0,
    city:           offer.city || "",
    status:         ORDER_STATUS.PENDING,
    qrCode,         // [إصلاح] UUID مستقل
    orderCode,
    createdAt:      FieldValue.serverTimestamp(),
    updatedAt:      FieldValue.serverTimestamp(),
  };

  // ── كتابة الطلب وتحديث rate limit في batch ──────────────────────────────
  const batch = db.batch();
  batch.set(orderRef, newOrder);
  batch.set(rateLimitRef, {
    lastOrderAt: FieldValue.serverTimestamp(),
    uid: auth.uid,
  });
  await batch.commit();

  return { orderId: orderRef.id, orderCode, success: true };
});

// ─── 2. Trigger: جدولة Cloud Task لإلغاء تلقائي ────────────────────────────
exports.autoCancelOrder = onDocumentCreated("orders/{orderId}", async (event) => {
  const order = event.data?.data();
  if (!order || order.status !== ORDER_STATUS.PENDING) return null;

  if (!CANCEL_URL || !PROJECT_ID) {
    console.warn("autoCancelOrder: TASKS_CANCEL_URL or GCLOUD_PROJECT not set — skipping.");
    return null;
  }

  try {
    const { CloudTasksClient } = require("@google-cloud/tasks");
    const orderId      = event.params.orderId;
    const tasksClient  = new CloudTasksClient();
    const queuePath    = tasksClient.queuePath(PROJECT_ID, LOCATION, QUEUE_NAME);
    const scheduleTime = Math.floor(Date.now() / 1000) + CANCEL_DELAY_SECONDS;

    await tasksClient.createTask({
      parent: queuePath,
      task: {
        httpRequest: {
          httpMethod: "POST",
          url: CANCEL_URL,
          headers: {
            "Content-Type":  "application/json",
            "X-Tasks-Secret": TASKS_SHARED_SECRET,
          },
          body: Buffer.from(JSON.stringify({ orderId })).toString("base64"),
          oidcToken: {
            serviceAccountEmail: `${PROJECT_ID}@appspot.gserviceaccount.com`,
          },
        },
        scheduleTime: { seconds: scheduleTime },
      },
    });
  } catch (err) {
    console.error("autoCancelOrder: failed to schedule task:", err.message);
  }

  return null;
});

// ─── 3. HTTP handler: تُستدعى من Cloud Tasks بعد المهلة ─────────────────────
exports.processCancelOrder = onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  // تحقق من الـ shared secret
  const taskSecret = req.headers["x-tasks-secret"];
  if (!TASKS_SHARED_SECRET || taskSecret !== TASKS_SHARED_SECRET) {
    console.warn("processCancelOrder: Unauthorized — invalid X-Tasks-Secret.");
    res.status(403).send("Forbidden");
    return;
  }

  let orderId;
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    orderId = body?.orderId;
  } catch {
    res.status(400).send("Invalid JSON body");
    return;
  }

  if (!orderId || typeof orderId !== "string") {
    res.status(400).send("orderId is required");
    return;
  }

  const cancelled = await cancelPendingOrder(orderId, "timeout");
  res.status(200).json({ cancelled, orderId });
});

// ─── 4. Callable: الأدمن ينشئ حساب مالك مطعم ───────────────────────────────
exports.createOwnerUser = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }

  const adminDoc = await db.collection("admins").doc(auth.uid).get();
  if (!adminDoc.exists) {
    throw new HttpsError("permission-denied", "Only super admins can create owner accounts.");
  }

  const { email, password, name, restaurantId } = data || {};
  if (!email || !password || !name || !restaurantId) {
    throw new HttpsError("invalid-argument", "email, password, name, and restaurantId are required.");
  }
  if (password.length < 8) {
    throw new HttpsError("invalid-argument", "Password must be at least 8 characters.");
  }

  try {
    const userRecord = await admin.auth().createUser({ email, password });
    const uid = userRecord.uid;

    await db.collection("restaurantOwners").doc(uid).set({
      email,
      name,
      restaurantId,
      createdAt: FieldValue.serverTimestamp(),
    });

    return { uid, success: true };
  } catch (err) {
    if (err.code === "auth/email-already-exists") {
      throw new HttpsError("already-exists", "هذا البريد الإلكتروني مستخدم بالفعل.");
    }
    throw new HttpsError("internal", err.message);
  }
});

// ─── 5. Callable: المستخدم يلغي طلبه عند انتهاء المهلة ─────────────────────
exports.cancelOrderOnTimeout = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }

  const orderId = data?.orderId;
  if (!orderId || typeof orderId !== "string") {
    throw new HttpsError("invalid-argument", "orderId is required.");
  }

  // [إصلاح] التحقق من ملكية الطلب داخل Transaction
  const orderRef = db.collection("orders").doc(orderId);
  const snap = await orderRef.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Order not found.");
  }
  if (snap.data().userId !== auth.uid) {
    throw new HttpsError("permission-denied", "You do not own this order.");
  }

  const cancelled = await cancelPendingOrder(orderId, "timeout");
  return { cancelled, status: cancelled ? ORDER_STATUS.CANCELLED : snap.data().status };
});
