const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { logger } = require("firebase-functions");
const crypto = require("crypto");

const {
  assertString,
  assertCoordinates,
  assertOrderStatus,
} = require("../lib/validation");

const db = getFirestore();

const ORDER_STATUS = Object.freeze({
  PENDING: "pending",
  ACCEPTED: "accepted",
  READY: "ready",
  COMPLETED: "completed",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
});

const ALLOWED_TRANSITIONS = {
  [ORDER_STATUS.PENDING]: [ORDER_STATUS.ACCEPTED, ORDER_STATUS.REJECTED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.ACCEPTED]: [ORDER_STATUS.READY, ORDER_STATUS.REJECTED],
  [ORDER_STATUS.READY]: [ORDER_STATUS.COMPLETED],
  [ORDER_STATUS.COMPLETED]: [],
  [ORDER_STATUS.REJECTED]: [],
  [ORDER_STATUS.CANCELLED]: [],
};

const ORDER_RATE_LIMIT_SECONDS = 60;
const CALL_OPTIONS = {
  region: "us-central1",
  cors: true,
  allowInvalidAppCheckToken: true,
};

function enforceOptionalAppCheck(request) {
  const enforceAppCheck = process.env.FUNCTIONS_ENFORCE_APP_CHECK === "true";
  if (enforceAppCheck && !request.app) {
    throw new HttpsError("failed-precondition", "App Check token is required");
  }
}

function generateQRCode() {
  return crypto.randomBytes(16).toString("hex");
}

exports.createOrder = onCall(CALL_OPTIONS, async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Authentication is required.");
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

    if (!offerSnap.exists) throw new HttpsError("not-found", "العرض غير موجود.");
    if (!branchSnap.exists) throw new HttpsError("not-found", "الفرع غير موجود.");

    const offer = offerSnap.data();
    const branch = branchSnap.data();
    const userData = userSnap.exists ? userSnap.data() : {};

    if (offer.status === "inactive") throw new HttpsError("failed-precondition", "هذا العرض غير متاح حالياً.");
    if (branch.status !== "active") throw new HttpsError("failed-precondition", "هذا الفرع غير نشط.");
    if (branch.restaurantId !== offer.restaurantId) throw new HttpsError("failed-precondition", "Selected branch does not belong to offer restaurant");

    if (rateLimitSnap.exists) {
      const lastOrderTime = rateLimitSnap.data().lastOrderAt?.toMillis?.() || 0;
      const elapsedSeconds = (Date.now() - lastOrderTime) / 1000;
      if (elapsedSeconds < ORDER_RATE_LIMIT_SECONDS) {
        const wait = Math.ceil(ORDER_RATE_LIMIT_SECONDS - elapsedSeconds);
        throw new HttpsError("resource-exhausted", `يرجى الانتظار ${wait} ثانية قبل إنشاء طلب جديد.`);
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
    tx.set(rateLimitRef, { lastOrderAt: FieldValue.serverTimestamp(), uid: auth.uid }, { merge: true });
  });

  logger.info("createOrder: success", { orderId: orderRef.id, uid: auth.uid, offerId, branchId });
  return { orderId: orderRef.id, orderCode, success: true };
});

exports.updateOrderStatus = onCall(CALL_OPTIONS, async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Authentication is required.");
  enforceOptionalAppCheck(request);

  const orderId = assertString(data?.orderId, "orderId", { max: 100 });
  const newStatus = assertOrderStatus(data?.status);

  const orderRef = db.collection("orders").doc(orderId);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) throw new HttpsError("not-found", "الطلب غير موجود.");

  const order = orderSnap.data();
  if (order.branchId !== auth.uid) throw new HttpsError("permission-denied", "ليس لديك صلاحية لتغيير هذا الطلب.");

  const allowed = ALLOWED_TRANSITIONS[order.status] || [];
  if (!allowed.includes(newStatus)) throw new HttpsError("failed-precondition", `لا يمكن الانتقال من "${order.status}" إلى "${newStatus}".`);

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

  logger.info("updateOrderStatus", { orderId, from: order.status, to: newStatus, actor: auth.uid, ts: new Date().toISOString() });
  return { success: true, orderId, status: newStatus };
});

exports.completeOrderByQR = onCall(CALL_OPTIONS, async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Authentication is required.");
  enforceOptionalAppCheck(request);

  const qrCode = assertString(data?.qrCode, "qrCode", { max: 200 });
  const ordersSnap = await db.collection("orders").where("qrCode", "==", qrCode).limit(1).get();
  if (ordersSnap.empty) throw new HttpsError("not-found", "عذراً، هذا الرمز غير موجود في النظام.");

  const orderDoc = ordersSnap.docs[0];
  const order = orderDoc.data();
  const orderId = orderDoc.id;

  if (order.branchId !== auth.uid) throw new HttpsError("permission-denied", "هذا الطلب يخص فرعاً آخر، لا يمكن إتمامه هنا.");
  if (order.status === ORDER_STATUS.COMPLETED) throw new HttpsError("already-exists", "تم تسليم هذا الطلب مسبقاً.");
  if (order.status !== ORDER_STATUS.READY) throw new HttpsError("failed-precondition", `حالة الطلب الحالية هي (${order.status})، يجب تجهيز الطلب أولاً.`);

  await orderDoc.ref.update({
    status: ORDER_STATUS.COMPLETED,
    completedAt: FieldValue.serverTimestamp(),
    collected: true,
    updatedAt: FieldValue.serverTimestamp(),
  });

  logger.info("completeOrderByQR", { orderId, branchId: auth.uid });
  return { success: true, orderId, orderData: { id: orderId, ...order } };
});
