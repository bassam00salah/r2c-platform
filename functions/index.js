/**
 * R2C Platform — Cloud Functions (نسخة Production + Hardening)
 *
 * التحسينات في هذه النسخة:
 *  6. [أمان حرج]  createBranchUser — إنشاء حساب الفرع server-side بدون حفظ password في Firestore
 *  7. [أمان]      updateOrderStatus — جميع تغييرات حالة الطلب عبر Function
 *  8. [جودة]      structured logging عبر logger
 *  9. [جودة]      state machine صريح لانتقالات الحالة
 * 10. [مراقبة]    تسجيل كل تغيير حالة مع uid + orderId + timestamp
 * 11. [Hardening] createOrder داخل Transaction واحدة + ربط offer/branch بشكل صحيح
 * 12. [Hardening] processCancelOrder لم يعد يعتمد على secret فقط
 * 13. [Hardening] رسائل أخطاء داخلية آمنة
 * 14. [Hardening] App Check enforcement اختياري
 */

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const crypto = require("crypto");

const {
  assertString,
  assertEmail,
  assertPassword,
  assertCoordinates,
  assertOrderStatus,
} = require("./lib/validation");

const { hasValidTaskHeaders } = require("./lib/taskSecurity");

admin.initializeApp();

const db = getFirestore();

// ─── ثوابت مشتركة ──────────────────────────────────────────────────────────
const ORDER_STATUS = Object.freeze({
  PENDING: "pending",
  ACCEPTED: "accepted",
  READY: "ready",
  COMPLETED: "completed",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
});

/**
 * [إصلاح 9] State Machine صريح للانتقالات المسموح بها
 * المفتاح = الحالة الحالية، القيمة = الحالات التي يمكن الانتقال إليها
 */
const ALLOWED_TRANSITIONS = {
  [ORDER_STATUS.PENDING]: [ORDER_STATUS.ACCEPTED, ORDER_STATUS.REJECTED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.ACCEPTED]: [ORDER_STATUS.READY, ORDER_STATUS.REJECTED],
  [ORDER_STATUS.READY]: [ORDER_STATUS.COMPLETED],
  [ORDER_STATUS.COMPLETED]: [],
  [ORDER_STATUS.REJECTED]: [],
  [ORDER_STATUS.CANCELLED]: [],
};

// ─── إعدادات Cloud Tasks ────────────────────────────────────────────────────
const PROJECT_ID = process.env.GCLOUD_PROJECT || "";
const LOCATION = process.env.TASKS_LOCATION || "us-central1";
const QUEUE_NAME = process.env.TASKS_QUEUE_NAME || "order-cancel-queue";
const CANCEL_URL = process.env.TASKS_CANCEL_URL || "";
const CANCEL_DELAY_SECONDS = 45;
const TASKS_SHARED_SECRET = process.env.TASKS_SHARED_SECRET || "";

// ─── Rate Limiting ─────────────────────────────────────────────────────────
const ORDER_RATE_LIMIT_SECONDS = 60;

// ─── Helper: App Check enforcement اختياري ────────────────────────────────
function enforceOptionalAppCheck(request) {
  const enforceAppCheck = process.env.FUNCTIONS_ENFORCE_APP_CHECK === "true";
  if (enforceAppCheck && !request.app) {
    throw new HttpsError("failed-precondition", "App Check token is required");
  }
}

// ─── Helper: إلغاء الطلب بأمان عبر Transaction ──────────────────────────────
async function cancelPendingOrder(orderId, reason = "timeout") {
  const orderRef = db.collection("orders").doc(orderId);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(orderRef);
    if (!snap.exists) return false;
    const { status } = snap.data();
    if (status !== ORDER_STATUS.PENDING) return false;

    tx.update(orderRef, {
      status: ORDER_STATUS.CANCELLED,
      cancelReason: reason,
      cancelledAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
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

  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }

  enforceOptionalAppCheck(request);

  const offerId = assertString(data?.offerId, "offerId", { max: 100 });
  const branchId = assertString(data?.branchId, "branchId", { max: 100 });
  const { latitude, longitude } = assertCoordinates(data?.userLat, data?.userLng);

  const rateLimitRef = db.collection("_rateLimits").doc(`order_${auth.uid}`);
  const orderRef = db.collection("orders").doc();
  const orderCode = orderRef.id.slice(-6).toUpperCase();
  const qrCode = generateQRCode();

  await db.runTransaction(async (tx) => {
    const offerRef = db.collection("offers").doc(offerId);
    const branchRef = db.collection("branches").doc(branchId);
    const userRef = db.collection("users").doc(auth.uid);

    const [offerSnap, branchSnap, rateLimitSnap, userSnap] = await Promise.all([
      tx.get(offerRef),
      tx.get(branchRef),
      tx.get(rateLimitRef),
      tx.get(userRef),
    ]);

    if (!offerSnap.exists) {
      throw new HttpsError("not-found", "العرض غير موجود.");
    }

    if (!branchSnap.exists) {
      throw new HttpsError("not-found", "الفرع غير موجود.");
    }

    const offer = offerSnap.data();
    const branch = branchSnap.data();
    const userData = userSnap.exists ? userSnap.data() : {};

    if (offer.status === "inactive") {
      throw new HttpsError("failed-precondition", "هذا العرض غير متاح حالياً.");
    }

    if (branch.status !== "active") {
      throw new HttpsError("failed-precondition", "هذا الفرع غير نشط.");
    }

    if (branch.restaurantId !== offer.restaurantId) {
      throw new HttpsError(
        "failed-precondition",
        "Selected branch does not belong to offer restaurant"
      );
    }

    if (rateLimitSnap.exists) {
      const lastOrderTime = rateLimitSnap.data().lastOrderAt?.toMillis?.() || 0;
      const elapsedSeconds = (Date.now() - lastOrderTime) / 1000;

      if (elapsedSeconds < ORDER_RATE_LIMIT_SECONDS) {
        const wait = Math.ceil(ORDER_RATE_LIMIT_SECONDS - elapsedSeconds);
        throw new HttpsError(
          "resource-exhausted",
          `يرجى الانتظار ${wait} ثانية قبل إنشاء طلب جديد.`
        );
      }
    }

    const newOrder = {
      userId: auth.uid,
      userName: userData.name || auth.token?.name || "",
      offerId,
      offerName: offer.name,
      restaurantId: offer.restaurantId,
      restaurantName: offer.restaurantName || offer.restaurant || "",
      branchId,
      branch: branch.name || "الفرع الرئيسي",
      branchAddress: branch.address || "",
      userLat: latitude,
      userLng: longitude,
      price: offer.price ?? offer.finalPrice ?? 0,
      discount: offer.discount || 0,
      city: offer.city || "",
      status: ORDER_STATUS.PENDING,
      qrCode,
      orderCode,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    tx.set(orderRef, newOrder);
    tx.set(
      rateLimitRef,
      {
        lastOrderAt: FieldValue.serverTimestamp(),
        uid: auth.uid,
      },
      { merge: true }
    );
  });

  logger.info("createOrder: success", {
    orderId: orderRef.id,
    uid: auth.uid,
    offerId,
    branchId,
  });

  return { orderId: orderRef.id, orderCode, success: true };
});

// ───────────────────────────────────────────────────────────────────────────
// 2. تحديث حالة الطلب — Callable
// ───────────────────────────────────────────────────────────────────────────
exports.updateOrderStatus = onCall(async (request) => {
  const { auth, data } = request;

  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }

  enforceOptionalAppCheck(request);

  const orderId = assertString(data?.orderId, "orderId", { max: 100 });
  const newStatus = assertOrderStatus(data?.status);

  const orderRef = db.collection("orders").doc(orderId);
  const orderSnap = await orderRef.get();

  if (!orderSnap.exists) {
    throw new HttpsError("not-found", "الطلب غير موجود.");
  }

  const order = orderSnap.data();

  // التحقق من ملكية الفرع للطلب
  if (order.branchId !== auth.uid) {
    logger.warn("updateOrderStatus: permission denied", {
      uid: auth.uid,
      orderId,
      orderBranchId: order.branchId,
    });
    throw new HttpsError("permission-denied", "ليس لديك صلاحية لتغيير هذا الطلب.");
  }

  // التحقق من صحة انتقال الحالة
  const allowed = ALLOWED_TRANSITIONS[order.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new HttpsError(
      "failed-precondition",
      `لا يمكن الانتقال من "${order.status}" إلى "${newStatus}".`
    );
  }

  const timestampFields = {
    [ORDER_STATUS.ACCEPTED]: { acceptedAt: FieldValue.serverTimestamp() },
    [ORDER_STATUS.REJECTED]: { rejectedAt: FieldValue.serverTimestamp() },
    [ORDER_STATUS.READY]: { readyAt: FieldValue.serverTimestamp() },
    [ORDER_STATUS.COMPLETED]: { completedAt: FieldValue.serverTimestamp() },
  };

  await orderRef.update({
    status: newStatus,
    updatedAt: FieldValue.serverTimestamp(),
    ...(timestampFields[newStatus] || {}),
  });

  logger.info("updateOrderStatus", {
    orderId,
    from: order.status,
    to: newStatus,
    actor: auth.uid,
    ts: new Date().toISOString(),
  });

  return { success: true, orderId, status: newStatus };
});

// ───────────────────────────────────────────────────────────────────────────
// 3. إنشاء حساب فرع — Callable
// ───────────────────────────────────────────────────────────────────────────
exports.createBranchUser = onCall(async (request) => {
  const { auth, data } = request;

  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }

  enforceOptionalAppCheck(request);

  const adminDoc = await db.collection("admins").doc(auth.uid).get();
  if (!adminDoc.exists) {
    throw new HttpsError("permission-denied", "Only super admins can create branch accounts.");
  }

  const email = assertEmail(data?.email);
  const password = assertPassword(data?.password);
  const name = assertString(data?.name, "name", { max: 150 });
  const restaurantId = assertString(data?.restaurantId, "restaurantId", { max: 100 });

  let latitude = null;
  let longitude = null;
  if (data?.latitude != null && data?.longitude != null) {
    const coords = assertCoordinates(data.latitude, data.longitude);
    latitude = coords.latitude;
    longitude = coords.longitude;
  }

  try {
    const userRecord = await admin.auth().createUser({ email, password });
    const uid = userRecord.uid;

    await db.collection("branches").doc(uid).set({
      name,
      restaurantId,
      city: typeof data?.city === "string" ? data.city.trim() : "",
      latitude,
      longitude,
      status: "active",
      createdAt: FieldValue.serverTimestamp(),
    });

    logger.info("createBranchUser: success", {
      uid,
      restaurantId,
      createdBy: auth.uid,
    });

    return { uid, success: true };
  } catch (err) {
    if (err.code === "auth/email-already-exists") {
      throw new HttpsError("already-exists", "هذا البريد الإلكتروني مستخدم بالفعل.");
    }

    logger.error("createBranchUser failed", err);
    throw new HttpsError("internal", "Unable to create branch user");
  }
});

// ───────────────────────────────────────────────────────────────────────────
// 4. إنشاء حساب مالك مطعم — Callable
// ───────────────────────────────────────────────────────────────────────────
exports.createOwnerUser = onCall(async (request) => {
  const { auth, data } = request;

  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }

  enforceOptionalAppCheck(request);

  const adminDoc = await db.collection("admins").doc(auth.uid).get();
  if (!adminDoc.exists) {
    throw new HttpsError("permission-denied", "Only super admins can create owner accounts.");
  }

  const email = assertEmail(data?.email);
  const password = assertPassword(data?.password);
  const name = assertString(data?.name, "name", { max: 150 });
  const restaurantId = assertString(data?.restaurantId, "restaurantId", { max: 100 });

  try {
    const userRecord = await admin.auth().createUser({ email, password });
    const uid = userRecord.uid;

    await db.collection("restaurantOwners").doc(uid).set({
      email,
      name,
      restaurantId,
      createdAt: FieldValue.serverTimestamp(),
    });

    logger.info("createOwnerUser: success", {
      uid,
      restaurantId,
      createdBy: auth.uid,
    });

    return { uid, success: true };
  } catch (err) {
    if (err.code === "auth/email-already-exists") {
      throw new HttpsError("already-exists", "هذا البريد الإلكتروني مستخدم بالفعل.");
    }

    logger.error("createOwnerUser failed", err);
    throw new HttpsError("internal", "Unable to create owner user");
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
    const orderId = event.params.orderId;
    const tasksClient = new CloudTasksClient();
    const queuePath = tasksClient.queuePath(PROJECT_ID, LOCATION, QUEUE_NAME);
    const scheduleTime = Math.floor(Date.now() / 1000) + CANCEL_DELAY_SECONDS;

    await tasksClient.createTask({
      parent: queuePath,
      task: {
        httpRequest: {
          httpMethod: "POST",
          url: CANCEL_URL,
          headers: {
            "Content-Type": "application/json",
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
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const taskSecret = req.headers["x-tasks-secret"];
  if (!TASKS_SHARED_SECRET || taskSecret !== TASKS_SHARED_SECRET) {
    logger.warn("processCancelOrder: Unauthorized — invalid X-Tasks-Secret");
    res.status(403).send("Forbidden");
    return;
  }

  if (!hasValidTaskHeaders(req)) {
    logger.error("Rejected processCancelOrder request: missing Cloud Tasks security headers");
    res.status(403).send("Forbidden");
    return;
  }

  let orderId;
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    orderId = assertString(body?.orderId, "orderId", { max: 100 });
  } catch (err) {
    res.status(400).send(err?.message || "Invalid JSON body");
    return;
  }

  const cancelled = await cancelPendingOrder(orderId, "timeout");
  logger.info("processCancelOrder", { orderId, cancelled });
  res.status(200).json({ cancelled, orderId });
});

// ───────────────────────────────────────────────────────────────────────────
// 7. Callable: المستخدم يلغي طلبه
// ───────────────────────────────────────────────────────────────────────────
exports.cancelOrderOnTimeout = onCall(async (request) => {
  const { auth, data } = request;

  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }

  enforceOptionalAppCheck(request);

  const orderId = assertString(data?.orderId, "orderId", { max: 100 });

  const orderRef = db.collection("orders").doc(orderId);
  const snap = await orderRef.get();

  if (!snap.exists) {
    throw new HttpsError("not-found", "Order not found.");
  }

  if (snap.data().userId !== auth.uid) {
    throw new HttpsError("permission-denied", "You do not own this order.");
  }

  const cancelled = await cancelPendingOrder(orderId, "user_cancelled");
  logger.info("cancelOrderOnTimeout", { orderId, cancelled, uid: auth.uid });

  return {
    cancelled,
    status: cancelled ? ORDER_STATUS.CANCELLED : snap.data().status,
  };
});

// ───────────────────────────────────────────────────────────────────────────
// حذف فرع — Callable
// ───────────────────────────────────────────────────────────────────────────
exports.deleteBranch = onCall(async (request) => {
  const { auth, data } = request;

  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }

  enforceOptionalAppCheck(request);

  const adminDoc = await db.collection("admins").doc(auth.uid).get();
  if (!adminDoc.exists) {
    throw new HttpsError("permission-denied", "Only super admins can delete branches.");
  }

  const branchId = assertString(data?.branchId, "branchId", { max: 100 });

  const branchRef = db.collection("branches").doc(branchId);
  const branchSnap = await branchRef.get();

  if (!branchSnap.exists) {
    throw new HttpsError("not-found", "Branch not found.");
  }

  try {
    await admin.auth().updateUser(branchId, { disabled: true });
  } catch (err) {
    logger.warn("deleteBranch: auth user not found or already disabled", { branchId });
  }

  await branchRef.delete();

  logger.info("deleteBranch: success", { branchId, deletedBy: auth.uid });
  return { success: true, branchId };
});

// ───────────────────────────────────────────────────────────────────────────
// حذف مالك مطعم — Callable
// ───────────────────────────────────────────────────────────────────────────
exports.deleteOwner = onCall(async (request) => {
  const { auth, data } = request;

  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }

  enforceOptionalAppCheck(request);

  const adminDoc = await db.collection("admins").doc(auth.uid).get();
  if (!adminDoc.exists) {
    throw new HttpsError("permission-denied", "Only super admins can delete owners.");
  }

  const ownerId = assertString(data?.ownerId, "ownerId", { max: 100 });

  const ownerRef = db.collection("restaurantOwners").doc(ownerId);
  const ownerSnap = await ownerRef.get();

  if (!ownerSnap.exists) {
    throw new HttpsError("not-found", "Owner not found.");
  }

  try {
    await admin.auth().updateUser(ownerId, { disabled: true });
  } catch (err) {
    logger.warn("deleteOwner: auth user not found or already disabled", { ownerId });
  }

  await ownerRef.delete();

  logger.info("deleteOwner: success", { ownerId, deletedBy: auth.uid });
  return { success: true, ownerId };
});

// ───────────────────────────────────────────────────────────────────────────
// 8. مسح رمز QR وإكمال الطلب — Callable
// ───────────────────────────────────────────────────────────────────────────
exports.completeOrderByQR = onCall(async (request) => {
  const { auth, data } = request;

  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }

  enforceOptionalAppCheck(request);

  const qrCode = assertString(data?.qrCode, "qrCode", { max: 200 });

  const ordersSnap = await db.collection("orders").where("qrCode", "==", qrCode).limit(1).get();
  if (ordersSnap.empty) {
    throw new HttpsError("not-found", "عذراً، هذا الرمز غير موجود في النظام.");
  }

  const orderDoc = ordersSnap.docs[0];
  const order = orderDoc.data();
  const orderId = orderDoc.id;

  if (order.branchId !== auth.uid) {
    throw new HttpsError("permission-denied", "هذا الطلب يخص فرعاً آخر، لا يمكن إتمامه هنا.");
  }

  if (order.status === ORDER_STATUS.COMPLETED) {
    throw new HttpsError("already-exists", "تم تسليم هذا الطلب مسبقاً.");
  }

  if (order.status !== ORDER_STATUS.READY) {
    throw new HttpsError(
      "failed-precondition",
      `حالة الطلب الحالية هي (${order.status})، يجب تجهيز الطلب أولاً.`
    );
  }

  await orderDoc.ref.update({
    status: ORDER_STATUS.COMPLETED,
    completedAt: FieldValue.serverTimestamp(),
    collected: true,
    updatedAt: FieldValue.serverTimestamp(),
  });

  logger.info("completeOrderByQR", { orderId, branchId: auth.uid });
  return { success: true, orderId, orderData: { id: orderId, ...order } };
});
