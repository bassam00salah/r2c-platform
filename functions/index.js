/**
 * R2C Platform — Cloud Functions (نسخة Production)
 *
 * الإصلاحات الجديدة في هذه النسخة:
 *  6. [أمان حرج]  createBranchUser — إنشاء حساب الفرع server-side بدون حفظ password في Firestore
 *  7. [أمان]      updateOrderStatus — جميع تغييرات حالة الطلب (قبول/رفض/جاهز/اكتمال) عبر Function
 *                 مع التحقق من ملكية الفرع للطلب وصحة انتقال الحالة
 *  8. [جودة]      structured logging عبر logger بدلاً من console.log
 *  9. [جودة]      state machine صريح لانتقالات الحالة — لا انتقال غير مسموح به
 * 10. [مراقبة]    تسجيل كل تغيير حالة مع uid + orderId + timestamp
 */

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
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

/**
 * [إصلاح 9] State Machine صريح للانتقالات المسموح بها
 * المفتاح = الحالة الحالية، القيمة = الحالات التي يمكن الانتقال إليها
 */
const ALLOWED_TRANSITIONS = {
  [ORDER_STATUS.PENDING]:   [ORDER_STATUS.ACCEPTED, ORDER_STATUS.REJECTED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.ACCEPTED]:  [ORDER_STATUS.READY,    ORDER_STATUS.REJECTED],
  [ORDER_STATUS.READY]:     [ORDER_STATUS.COMPLETED],
  [ORDER_STATUS.COMPLETED]: [],
  [ORDER_STATUS.REJECTED]:  [],
  [ORDER_STATUS.CANCELLED]: [],
};

// ─── إعدادات Cloud Tasks ────────────────────────────────────────────────────
const PROJECT_ID           = process.env.GCLOUD_PROJECT || "";
const LOCATION             = process.env.TASKS_LOCATION    || "us-central1";
const QUEUE_NAME           = process.env.TASKS_QUEUE_NAME  || "order-cancel-queue";
const CANCEL_URL           = process.env.TASKS_CANCEL_URL  || "";
const CANCEL_DELAY_SECONDS = 45;
const TASKS_SHARED_SECRET  = process.env.TASKS_SHARED_SECRET || "";

// ─── Rate Limiting ─────────────────────────────────────────────────────────
const ORDER_RATE_LIMIT_SECONDS = 60;

// ─── Helper: إلغاء الطلب بأمان عبر Transaction ──────────────────────────────
async function cancelPendingOrder(orderId, reason = "timeout") {
  const orderRef = db.collection("orders").doc(orderId);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(orderRef);
    if (!snap.exists) return false;
    const { status } = snap.data();
    if (status !== ORDER_STATUS.PENDING) return false;
    tx.update(orderRef, {
      status:       ORDER_STATUS.CANCELLED,
      cancelReason: reason,
      cancelledAt:  FieldValue.serverTimestamp(),
      updatedAt:    FieldValue.serverTimestamp(),
    });
    return true;
  });
}

// ─── Helper: توليد QR Code آمن ──────────────────────────────────────────────
function generateQRCode() {
  return crypto.randomBytes(16).toString("hex");
}

// ───────────────────────────────────────────────────────────────────────────
// 1. إنشاء الطلب — Callable
// ───────────────────────────────────────────────────────────────────────────
exports.createOrder = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Authentication is required.");

  const { offerId, branchId, userLat, userLng } = data || {};
  if (!offerId || !branchId) throw new HttpsError("invalid-argument", "offerId and branchId are required.");

  // Rate Limiting
  const rateLimitRef  = db.collection("_rateLimits").doc(`order_${auth.uid}`);
  const rateLimitSnap = await rateLimitRef.get();
  if (rateLimitSnap.exists) {
    const lastOrderTime  = rateLimitSnap.data().lastOrderAt?.toMillis?.() || 0;
    const elapsedSeconds = (Date.now() - lastOrderTime) / 1000;
    if (elapsedSeconds < ORDER_RATE_LIMIT_SECONDS) {
      const wait = Math.ceil(ORDER_RATE_LIMIT_SECONDS - elapsedSeconds);
      throw new HttpsError("resource-exhausted", `يرجى الانتظار ${wait} ثانية قبل إنشاء طلب جديد.`);
    }
  }

  const offerSnap = await db.collection("offers").doc(offerId).get();
  if (!offerSnap.exists) throw new HttpsError("not-found", "العرض غير موجود.");
  const offer = offerSnap.data();
  if (offer.status === "inactive") throw new HttpsError("failed-precondition", "هذا العرض غير متاح حالياً.");

  const branchSnap = await db.collection("branches").doc(branchId).get();
  if (!branchSnap.exists) throw new HttpsError("not-found", "الفرع غير موجود.");
  const branch = branchSnap.data();
  if (branch.status !== "active") throw new HttpsError("failed-precondition", "هذا الفرع غير نشط.");

  const userSnap = await db.collection("users").doc(auth.uid).get();
  const userData = userSnap.exists ? userSnap.data() : {};

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
    price:          offer.price ?? offer.finalPrice ?? 0,
    discount:       offer.discount || 0,
    city:           offer.city || "",
    status:         ORDER_STATUS.PENDING,
    qrCode,
    orderCode,
    createdAt:      FieldValue.serverTimestamp(),
    updatedAt:      FieldValue.serverTimestamp(),
  };

  const batch = db.batch();
  batch.set(orderRef, newOrder);
  batch.set(rateLimitRef, { lastOrderAt: FieldValue.serverTimestamp(), uid: auth.uid });
  await batch.commit();

  logger.info("createOrder: success", { orderId: orderRef.id, uid: auth.uid, offerId, branchId });
  return { orderId: orderRef.id, orderCode, success: true };
});

// ───────────────────────────────────────────────────────────────────────────
// 2. تحديث حالة الطلب — Callable [جديد — إصلاح #7]
//
//    يُستدعى من: partner/OrderCard, partner/OrderDetailScreen
//    يتحقق من:
//      - المصادقة (Firebase Auth)
//      - ملكية الفرع للطلب (branchId يطابق uid الشخص الذي يُحدِّث)
//      - صحة انتقال الحالة (State Machine)
// ───────────────────────────────────────────────────────────────────────────
exports.updateOrderStatus = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Authentication is required.");

  const { orderId, status: newStatus } = data || {};
  if (!orderId || typeof orderId !== "string")
    throw new HttpsError("invalid-argument", "orderId is required.");
  if (!Object.values(ORDER_STATUS).includes(newStatus))
    throw new HttpsError("invalid-argument", `Invalid status: ${newStatus}`);

  const orderRef  = db.collection("orders").doc(orderId);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) throw new HttpsError("not-found", "الطلب غير موجود.");

  const order = orderSnap.data();

  // التحقق من ملكية الفرع للطلب
  // الـ partner يسجّل دخوله بـ uid يساوي branchId المخزَّن في الطلب
  if (order.branchId !== auth.uid) {
    logger.warn("updateOrderStatus: permission denied", {
      uid: auth.uid, orderId, orderBranchId: order.branchId,
    });
    throw new HttpsError("permission-denied", "ليس لديك صلاحية لتغيير هذا الطلب.");
  }

  // [إصلاح 9] التحقق من صحة انتقال الحالة عبر State Machine
  const allowed = ALLOWED_TRANSITIONS[order.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new HttpsError(
      "failed-precondition",
      `لا يمكن الانتقال من "${order.status}" إلى "${newStatus}".`
    );
  }

  // حقول الـ timestamp حسب الحالة
  const timestampFields = {
    [ORDER_STATUS.ACCEPTED]:  { acceptedAt:  FieldValue.serverTimestamp() },
    [ORDER_STATUS.REJECTED]:  { rejectedAt:  FieldValue.serverTimestamp() },
    [ORDER_STATUS.READY]:     { readyAt:     FieldValue.serverTimestamp() },
    [ORDER_STATUS.COMPLETED]: { completedAt: FieldValue.serverTimestamp() },
  };

  await orderRef.update({
    status:    newStatus,
    updatedAt: FieldValue.serverTimestamp(),
    ...(timestampFields[newStatus] || {}),
  });

  // [إصلاح 10] Structured logging لكل تغيير حالة
  logger.info("updateOrderStatus", {
    orderId,
    from:    order.status,
    to:      newStatus,
    actor:   auth.uid,
    ts:      new Date().toISOString(),
  });

  return { success: true, orderId, status: newStatus };
});

// ───────────────────────────────────────────────────────────────────────────
// 3. إنشاء حساب فرع — Callable [جديد — إصلاح #6]
//
//    يُستدعى من: admin/BranchesPage فقط
//    يتحقق من أن المُستدعي admin حقيقي
//    ينشئ Firebase Auth user + مستند branches بدون كلمة مرور
// ───────────────────────────────────────────────────────────────────────────
exports.createBranchUser = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Authentication is required.");

  // التحقق من صلاحيات الأدمن
  const adminDoc = await db.collection("admins").doc(auth.uid).get();
  if (!adminDoc.exists) throw new HttpsError("permission-denied", "Only super admins can create branch accounts.");

  const { email, password, name, restaurantId, city, latitude, longitude } = data || {};
  if (!email || !password || !name || !restaurantId)
    throw new HttpsError("invalid-argument", "email, password, name, and restaurantId are required.");
  if (password.length < 8)
    throw new HttpsError("invalid-argument", "Password must be at least 8 characters.");

  try {
    // إنشاء Firebase Auth user — كلمة المرور تُعالَج هنا فقط، لا تُكتب في Firestore أبداً
    const userRecord = await admin.auth().createUser({ email, password });
    const uid = userRecord.uid;

    // [إصلاح #6] مستند branches بدون email أو password
    await db.collection("branches").doc(uid).set({
      name,
      restaurantId,
      city:      city || "",
      latitude:  latitude  || null,
      longitude: longitude || null,
      status:    "active",
      createdAt: FieldValue.serverTimestamp(),
      // ملاحظة: لا email، لا password — هذان الحقلان في Firebase Auth فقط
    });

    logger.info("createBranchUser: success", { uid, restaurantId, createdBy: auth.uid });
    return { uid, success: true };
  } catch (err) {
    if (err.code === "auth/email-already-exists")
      throw new HttpsError("already-exists", "هذا البريد الإلكتروني مستخدم بالفعل.");
    logger.error("createBranchUser: error", { error: err.message, createdBy: auth.uid });
    throw new HttpsError("internal", err.message);
  }
});

// ───────────────────────────────────────────────────────────────────────────
// 4. إنشاء حساب مالك مطعم — Callable
// ───────────────────────────────────────────────────────────────────────────
exports.createOwnerUser = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Authentication is required.");

  const adminDoc = await db.collection("admins").doc(auth.uid).get();
  if (!adminDoc.exists) throw new HttpsError("permission-denied", "Only super admins can create owner accounts.");

  const { email, password, name, restaurantId } = data || {};
  if (!email || !password || !name || !restaurantId)
    throw new HttpsError("invalid-argument", "email, password, name, and restaurantId are required.");
  if (password.length < 8)
    throw new HttpsError("invalid-argument", "Password must be at least 8 characters.");

  try {
    const userRecord = await admin.auth().createUser({ email, password });
    const uid = userRecord.uid;

    // مالك المطعم — لا نحفظ كلمة المرور في Firestore
    await db.collection("restaurantOwners").doc(uid).set({
      email,
      name,
      restaurantId,
      createdAt: FieldValue.serverTimestamp(),
    });

    logger.info("createOwnerUser: success", { uid, restaurantId, createdBy: auth.uid });
    return { uid, success: true };
  } catch (err) {
    if (err.code === "auth/email-already-exists")
      throw new HttpsError("already-exists", "هذا البريد الإلكتروني مستخدم بالفعل.");
    throw new HttpsError("internal", err.message);
  }
});

// ───────────────────────────────────────────────────────────────────────────
// 5. Trigger: جدولة Cloud Task لإلغاء تلقائي
// ───────────────────────────────────────────────────────────────────────────
exports.autoCancelOrder = onDocumentCreated("orders/{orderId}", async (event) => {
  const order = event.data?.data();
  if (!order || order.status !== ORDER_STATUS.PENDING) return null;

  if (!CANCEL_URL || !PROJECT_ID) {
    logger.warn("autoCancelOrder: TASKS_CANCEL_URL or GCLOUD_PROJECT not set — skipping.");
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
            "Content-Type":   "application/json",
            "X-Tasks-Secret": TASKS_SHARED_SECRET,
          },
          body: Buffer.from(JSON.stringify({ orderId })).toString("base64"),
          oidcToken: { serviceAccountEmail: `${PROJECT_ID}@appspot.gserviceaccount.com` },
        },
        scheduleTime: { seconds: scheduleTime },
      },
    });

    logger.info("autoCancelOrder: task scheduled", { orderId, scheduleTime });
  } catch (err) {
    logger.error("autoCancelOrder: failed to schedule task", { error: err.message });
  }

  return null;
});

// ───────────────────────────────────────────────────────────────────────────
// 6. HTTP handler: تُستدعى من Cloud Tasks بعد انتهاء المهلة
// ───────────────────────────────────────────────────────────────────────────
exports.processCancelOrder = onRequest(async (req, res) => {
  if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }

  const taskSecret = req.headers["x-tasks-secret"];
  if (!TASKS_SHARED_SECRET || taskSecret !== TASKS_SHARED_SECRET) {
    logger.warn("processCancelOrder: Unauthorized — invalid X-Tasks-Secret");
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

  if (!orderId || typeof orderId !== "string") { res.status(400).send("orderId is required"); return; }

  const cancelled = await cancelPendingOrder(orderId, "timeout");
  logger.info("processCancelOrder", { orderId, cancelled });
  res.status(200).json({ cancelled, orderId });
});

// ───────────────────────────────────────────────────────────────────────────
// 7. Callable: المستخدم يلغي طلبه
// ───────────────────────────────────────────────────────────────────────────
exports.cancelOrderOnTimeout = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Authentication is required.");

  const orderId = data?.orderId;
  if (!orderId || typeof orderId !== "string") throw new HttpsError("invalid-argument", "orderId is required.");

  const orderRef  = db.collection("orders").doc(orderId);
  const snap      = await orderRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "Order not found.");
  if (snap.data().userId !== auth.uid) throw new HttpsError("permission-denied", "You do not own this order.");

  const cancelled = await cancelPendingOrder(orderId, "user_cancelled");
  logger.info("cancelOrderOnTimeout", { orderId, cancelled, uid: auth.uid });
  return { cancelled, status: cancelled ? ORDER_STATUS.CANCELLED : snap.data().status };
});

// ───────────────────────────────────────────────────────────────────────────
// 8. مسح رمز QR وإكمال الطلب — Callable [إصلاح orderHandlers.js]
//
//    يُستدعى من: partner/QRScannerScreen
//    يتحقق من: ملكية الفرع + حالة الطلب + صحة qrCode
// ───────────────────────────────────────────────────────────────────────────
exports.completeOrderByQR = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Authentication is required.");

  const { qrCode } = data || {};
  if (!qrCode || typeof qrCode !== "string")
    throw new HttpsError("invalid-argument", "qrCode is required.");

  // البحث عن الطلب بواسطة qrCode
  const ordersSnap = await db.collection("orders").where("qrCode", "==", qrCode).limit(1).get();
  if (ordersSnap.empty) throw new HttpsError("not-found", "عذراً، هذا الرمز غير موجود في النظام.");

  const orderDoc  = ordersSnap.docs[0];
  const order     = orderDoc.data();
  const orderId   = orderDoc.id;

  // التحقق من ملكية الفرع للطلب
  if (order.branchId !== auth.uid)
    throw new HttpsError("permission-denied", "هذا الطلب يخص فرعاً آخر، لا يمكن إتمامه هنا.");

  if (order.status === ORDER_STATUS.COMPLETED)
    throw new HttpsError("already-exists", "تم تسليم هذا الطلب مسبقاً.");

  if (order.status !== ORDER_STATUS.READY)
    throw new HttpsError("failed-precondition", `حالة الطلب الحالية هي (${order.status})، يجب تجهيز الطلب أولاً.`);

  await orderDoc.ref.update({
    status:      ORDER_STATUS.COMPLETED,
    completedAt: FieldValue.serverTimestamp(),
    collected:   true,
    updatedAt:   FieldValue.serverTimestamp(),
  });

  logger.info("completeOrderByQR", { orderId, branchId: auth.uid });
  return { success: true, orderId, orderData: { id: orderId, ...order } };
});
