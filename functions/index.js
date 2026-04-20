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

// خيارات مشتركة لجميع Callable Functions
const CALL_OPTIONS = {
  region: "us-central1",
  cors: true,
  // السماح بطلبات بدون App Check token (مفيد في localhost / dev)
  allowInvalidAppCheckToken: true,
};
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
const CANCEL_DELAY_SECONDS = 20;
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

// رمز الاستلام القصير — 6 أحرف وأرقام (أحرف كبيرة فقط لتجنب اللبس)
function generatePickupCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // بدون I,O,0,1 لتجنب اللبس البصري
  return Array.from(crypto.randomBytes(6))
    .map(b => chars[b % chars.length])
    .join("");
}


// ─── Helper: إرسال Push Notification للفرع عند ورود طلب جديد ───────────────
async function sendNewOrderNotificationToBranch(orderId, orderData) {
  const branchId = orderData?.branchId;
  if (!branchId) {
    logger.warn("sendNewOrderNotificationToBranch: missing branchId", { orderId });
    return { sent: 0, failed: 0 };
  }

  const tokensSnap = await db.collection("branches").doc(branchId).collection("pushTokens").get();
  if (tokensSnap.empty) {
    logger.info("sendNewOrderNotificationToBranch: no push tokens", { orderId, branchId });
    return { sent: 0, failed: 0 };
  }

  const tokenDocs = tokensSnap.docs
    .map((snap) => ({ ref: snap.ref, ...(snap.data() || {}) }))
    .filter((item) => item.token && item.isActive !== false);

  if (!tokenDocs.length) {
    logger.info("sendNewOrderNotificationToBranch: no active push tokens", { orderId, branchId });
    return { sent: 0, failed: 0 };
  }

  const message = {
    tokens: tokenDocs.map((item) => item.token),
    notification: {
      title: "طلب جديد",
      body: orderData?.offerName
        ? `ورد طلب جديد: ${String(orderData.offerName).slice(0, 80)}`
        : "ورد طلب جديد إلى الفرع",
    },
    data: {
      type: "new_order",
      orderId: String(orderId),
      branchId: String(branchId),
      status: String(orderData?.status || ORDER_STATUS.PENDING),
      offerName: String(orderData?.offerName || ""),
      screen: "orderDetail",
    },
    android: {
      priority: "high",
      notification: {
        sound: "default",
        channelId: "new_orders",
      },
    },
  };

  const response = await admin.messaging().sendEachForMulticast(message);

  const invalidRefs = [];
  response.responses.forEach((result, index) => {
    if (result.success) return;

    const errorCode = result.error?.code || "unknown";
    logger.warn("sendNewOrderNotificationToBranch: token send failed", {
      orderId,
      branchId,
      tokenRef: tokenDocs[index]?.ref?.path,
      errorCode,
    });

    if (
      errorCode === "messaging/registration-token-not-registered" ||
      errorCode === "messaging/invalid-registration-token"
    ) {
      invalidRefs.push(tokenDocs[index].ref);
    }
  });

  if (invalidRefs.length) {
    const batch = db.batch();
    invalidRefs.forEach((ref) => batch.delete(ref));
    await batch.commit();
  }

  logger.info("sendNewOrderNotificationToBranch: done", {
    orderId,
    branchId,
    successCount: response.successCount,
    failureCount: response.failureCount,
    removedInvalidTokens: invalidRefs.length,
  });

  return {
    sent: response.successCount,
    failed: response.failureCount,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// 1. إنشاء الطلب — Callable
// ───────────────────────────────────────────────────────────────────────────
exports.createOrder = onCall(CALL_OPTIONS, async (request) => {
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
      pickupCode: generatePickupCode(),
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

// ─── Helper: إشعار المستخدم بتغيير حالة طلبه ──────────────────────────────
const USER_NOTIF_MAP = {
  accepted:  { title: "✅ تم قبول طلبك",     body: "طلبك قيد التحضير الآن، سنخبرك لما يكون جاهزاً" },
  ready:     { title: "🎉 طلبك جاهز!",       body: "توجه لاستلام طلبك من المطعم" },
  completed: { title: "✔️ اكتمل طلبك",       body: "شكراً لاستخدامك R2C، نراك قريباً!" },
  rejected:  { title: "❌ تم رفض طلبك",      body: "عذراً، تعذر قبول طلبك. يمكنك المحاولة مرة أخرى" },
  cancelled: { title: "🚫 تم إلغاء الطلب",   body: "تم إلغاء الطلب. تواصل مع الدعم لمزيد من المعلومات" },
};

async function sendUserOrderNotification(orderId, orderData, newStatus) {
  const notifContent = USER_NOTIF_MAP[newStatus];
  if (!notifContent) return; // pending لا يستدعي إشعاراً

  const userId = orderData?.userId;
  if (!userId) {
    logger.warn("sendUserOrderNotification: missing userId", { orderId });
    return;
  }

  // جلب FCM token من Firestore
  const userSnap = await db.collection("users").doc(userId).get();
  const fcmToken = userSnap.data()?.fcmToken;

  if (!fcmToken) {
    logger.info("sendUserOrderNotification: no FCM token for user", { userId, orderId });
    return;
  }

  const message = {
    token: fcmToken,
    notification: {
      title: notifContent.title,
      body: orderData?.offerName
        ? `${notifContent.body} — ${String(orderData.offerName).slice(0, 60)}`
        : notifContent.body,
    },
    data: {
      type: "order_status",
      orderId: String(orderId),
      status: String(newStatus),
      screen: "orders",          // يفتح شاشة الطلبات عند الضغط
    },
    android: {
      priority: "high",
      notification: {
        sound: "default",
        channelId: "order_updates",
        defaultSound: true,
        defaultVibrateTimings: true,
        notificationPriority: "PRIORITY_HIGH",
      },
    },
  };

  try {
    await admin.messaging().send(message);
    logger.info("sendUserOrderNotification: sent", { orderId, userId, newStatus });
  } catch (err) {
    const code = err?.errorInfo?.code || "";
    // لو الـ token انتهى نحذفه من Firestore
    if (
      code === "messaging/registration-token-not-registered" ||
      code === "messaging/invalid-registration-token"
    ) {
      await db.collection("users").doc(userId).update({ fcmToken: FieldValue.delete() });
      logger.info("sendUserOrderNotification: removed stale token", { userId });
    } else {
      throw err;
    }
  }
}

exports.updateOrderStatus = onCall(CALL_OPTIONS, async (request) => {
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

  // ── إشعار المستخدم بتغيير حالة طلبه ──────────────────────────────────────
  try {
    await sendUserOrderNotification(orderId, order, newStatus);
  } catch (notifErr) {
    // لا نوقف العملية لو فشل الإشعار
    logger.warn("updateOrderStatus: notification failed (non-fatal)", {
      orderId,
      error: notifErr?.message,
    });
  }

  return { success: true, orderId, status: newStatus };
});

// ───────────────────────────────────────────────────────────────────────────
// 3. إنشاء حساب فرع — Callable
// ───────────────────────────────────────────────────────────────────────────
exports.createBranchUser = onCall(CALL_OPTIONS, async (request) => {
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
exports.createOwnerUser = onCall(CALL_OPTIONS, async (request) => {
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
// 5. Trigger: إرسال Push Notification للفرع عند ورود طلب جديد
// ───────────────────────────────────────────────────────────────────────────
exports.sendPartnerOrderPush = onDocumentCreated("orders/{orderId}", async (event) => {
  const order = event.data?.data();
  if (!order || order.status !== ORDER_STATUS.PENDING) return null;

  try {
    await sendNewOrderNotificationToBranch(event.params.orderId, order);
  } catch (err) {
    logger.error("sendPartnerOrderPush: failed", {
      orderId: event.params.orderId,
      error: err?.message || String(err),
    });
  }

  return null;
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

  // بعد انتهاء مهلة الـ 20 ثانية — نقبل الطلب تلقائياً بدل الإلغاء
  const orderRef = db.collection("orders").doc(orderId);
  const snap = await orderRef.get();

  if (!snap.exists) {
    res.status(404).json({ error: "Order not found", orderId });
    return;
  }

  const order = snap.data();
  if (order.status !== ORDER_STATUS.PENDING) {
    // الطلب اتحل بالفعل (قُبل أو رُفض أو أُلغي)
    logger.info("processCancelOrder: order already resolved", { orderId, status: order.status });
    res.status(200).json({ autoAccepted: false, status: order.status, orderId });
    return;
  }

  await orderRef.update({
    status: ORDER_STATUS.ACCEPTED,
    autoAccepted: true,
    acceptedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  logger.info("processCancelOrder: auto-accepted", { orderId });

  // إشعار المستخدم بالقبول التلقائي
  try {
    await sendUserOrderNotification(orderId, order, ORDER_STATUS.ACCEPTED);
  } catch (notifErr) {
    logger.warn("processCancelOrder: notification failed", { error: notifErr?.message });
  }

  res.status(200).json({ autoAccepted: true, orderId });
});

// ───────────────────────────────────────────────────────────────────────────
// 7. Callable: المستخدم يلغي طلبه
// ───────────────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────────────
// القبول التلقائي بعد انتهاء مهلة الانتظار — يُستدعى من التطبيق
// ───────────────────────────────────────────────────────────────────────────
exports.autoAcceptOrder = onCall(CALL_OPTIONS, async (request) => {
  const { auth, data } = request;

  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }

  const orderId = assertString(data?.orderId, "orderId", { max: 100 });

  const orderRef = db.collection("orders").doc(orderId);
  const snap = await orderRef.get();

  if (!snap.exists) {
    throw new HttpsError("not-found", "Order not found.");
  }

  const order = snap.data();

  if (order.userId !== auth.uid) {
    throw new HttpsError("permission-denied", "You do not own this order.");
  }

  // لو الطلب اتحل بالفعل (قُبل أو رُفض أو أُلغي)، لا نغير شيء
  if (order.status !== ORDER_STATUS.PENDING) {
    return { autoAccepted: false, status: order.status };
  }

  await orderRef.update({
    status: ORDER_STATUS.ACCEPTED,
    autoAccepted: true,
    acceptedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  logger.info("autoAcceptOrder: auto-accepted", { orderId, userId: auth.uid });

  try {
    await sendUserOrderNotification(orderId, order, ORDER_STATUS.ACCEPTED);
  } catch (notifErr) {
    logger.warn("autoAcceptOrder: notification failed", { error: notifErr?.message });
  }

  return { autoAccepted: true, orderId };
});

exports.cancelOrderOnTimeout = onCall(CALL_OPTIONS, async (request) => {
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

  const order = snap.data();

  if (order.userId !== auth.uid) {
    throw new HttpsError("permission-denied", "You do not own this order.");
  }

  // لا نلغي الطلب لو اكتمل أو جاهز — المستخدم التزم بالدفع
  const nonCancellableStatuses = [ORDER_STATUS.COMPLETED, ORDER_STATUS.READY];
  if (nonCancellableStatuses.includes(order.status)) {
    logger.info("cancelOrderOnTimeout: cannot cancel at this stage", { orderId, status: order.status });
    return { cancelled: false, status: order.status };
  }

  // نلغي بغض النظر عن الحالة (pending أو accepted)
  await orderRef.update({
    status: ORDER_STATUS.CANCELLED,
    cancelReason: "user_cancelled",
    cancelledAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  logger.info("cancelOrderOnTimeout: cancelled", { orderId, prevStatus: order.status, uid: auth.uid });

  return { cancelled: true, status: ORDER_STATUS.CANCELLED };
});

// ───────────────────────────────────────────────────────────────────────────
// حذف فرع — Callable
// ───────────────────────────────────────────────────────────────────────────
exports.deleteBranch = onCall(CALL_OPTIONS, async (request) => {
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
exports.deleteOwner = onCall(CALL_OPTIONS, async (request) => {
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
exports.completeOrderByQR = onCall(CALL_OPTIONS, async (request) => {
  const { auth, data } = request;

  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }

  enforceOptionalAppCheck(request);

  // يقبل إما qrCode الكامل أو pickupCode القصير
  const inputCode = assertString(data?.qrCode || data?.pickupCode, "code", { max: 200 });

  // نبحث أولاً بـ pickupCode (الأكثر احتمالاً عند الإدخال اليدوي)
  let ordersSnap = await db.collection("orders")
    .where("pickupCode", "==", inputCode.toUpperCase())
    .limit(1).get();

  // لو مش لاقي، نبحث بـ qrCode الكامل (مسح QR)
  if (ordersSnap.empty) {
    ordersSnap = await db.collection("orders")
      .where("qrCode", "==", inputCode)
      .limit(1).get();
  }

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
