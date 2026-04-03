const { onCall, HttpsError, onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { logger } = require("firebase-functions");
const { assertString } = require("../lib/validation");
const { hasValidTaskHeaders } = require("../lib/taskSecurity");

const db = getFirestore();

const ORDER_STATUS = Object.freeze({
  PENDING: "pending",
  ACCEPTED: "accepted",
  READY: "ready",
  COMPLETED: "completed",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
});

const PROJECT_ID = process.env.GCLOUD_PROJECT || "";
const LOCATION = process.env.TASKS_LOCATION || "us-central1";
const QUEUE_NAME = process.env.TASKS_QUEUE_NAME || "order-cancel-queue";
const CANCEL_URL = process.env.TASKS_CANCEL_URL || "";
const CANCEL_DELAY_SECONDS = 45;
const TASKS_SHARED_SECRET = process.env.TASKS_SHARED_SECRET || "";

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

exports.processCancelOrder = onRequest(async (req, res) => {
  if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }
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
  } catch (err) { res.status(400).send(err?.message || "Invalid JSON body"); return; }
  const cancelled = await cancelPendingOrder(orderId, "timeout");
  logger.info("processCancelOrder", { orderId, cancelled });
  res.status(200).json({ cancelled, orderId });
});

exports.cancelOrderOnTimeout = onCall(CALL_OPTIONS, async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Authentication is required.");
  enforceOptionalAppCheck(request);
  const orderId = assertString(data?.orderId, "orderId", { max: 100 });
  const orderRef = db.collection("orders").doc(orderId);
  const snap = await orderRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "Order not found.");
  if (snap.data().userId !== auth.uid) throw new HttpsError("permission-denied", "You do not own this order.");
  const cancelled = await cancelPendingOrder(orderId, "user_cancelled");
  logger.info("cancelOrderOnTimeout", { orderId, cancelled, uid: auth.uid });
  return { cancelled, status: cancelled ? ORDER_STATUS.CANCELLED : snap.data().status };
});
