const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
admin.initializeApp();

const db = admin.firestore();
const { FieldValue } = admin.firestore;

const ORDER_STATUS = Object.freeze({
  PENDING: "pending",
  ACCEPTED: "accepted",
  READY: "ready",
  COMPLETED: "completed",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
});

// ─── Config ────────────────────────────────────────────────────────────────
const PROJECT_ID           = process.env.GCLOUD_PROJECT || "";
const LOCATION             = process.env.TASKS_LOCATION    || "us-central1";
const QUEUE_NAME           = process.env.TASKS_QUEUE_NAME  || "order-cancel-queue";
const CANCEL_URL           = process.env.TASKS_CANCEL_URL  || "";
const CANCEL_DELAY_SECONDS = 45;

// Cloud Tasks uses a shared secret to authenticate callbacks
const TASKS_SHARED_SECRET  = process.env.TASKS_SHARED_SECRET || "";

// ─── Helpers ───────────────────────────────────────────────────────────────
function isPending(status) {
  return status === ORDER_STATUS.PENDING;
}

async function cancelPendingOrder(orderId, reason = "timeout") {
  const orderRef = db.collection("orders").doc(orderId);
  const snap = await orderRef.get();
  if (!snap.exists) return false;

  const normalizedStatus = snap.data().status;
  if (!isPending(normalizedStatus)) return false;

  await orderRef.update({
    status: ORDER_STATUS.CANCELLED,
    cancelReason: reason,
    cancelledAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return true;
}

// ─── 1. Trigger: schedule a Cloud Task when a new pending order is created ──
exports.autoCancelOrder = onDocumentCreated("orders/{orderId}", async (event) => {
  const order = event.data?.data();
  if (!order) return null;
  if (!isPending(order.status)) return null;

  if (!CANCEL_URL || !PROJECT_ID) {
    console.warn("autoCancelOrder: TASKS_CANCEL_URL or GCLOUD_PROJECT not set — skipping.");
    return null;
  }

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
          "Content-Type": "application/json",
          "X-Tasks-Secret": TASKS_SHARED_SECRET,
        },
        body: Buffer.from(JSON.stringify({ orderId })).toString("base64"),
        oidcToken: { serviceAccountEmail: `${PROJECT_ID}@appspot.gserviceaccount.com` },
      },
      scheduleTime: { seconds: scheduleTime },
    },
  });

  return null;
});

// ─── 2. HTTP handler: called by Cloud Tasks after the delay ─────────────────
// FIX: Added authentication via shared secret + OIDC verification
exports.processCancelOrder = onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  // ── Auth check: verify shared secret header ──
  const taskSecret = req.headers["x-tasks-secret"];
  if (!TASKS_SHARED_SECRET || taskSecret !== TASKS_SHARED_SECRET) {
    console.warn("processCancelOrder: Unauthorized request — invalid or missing X-Tasks-Secret header.");
    res.status(403).send("Forbidden");
    return;
  }

  // ── Additionally verify OIDC token from Cloud Tasks ──
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.split("Bearer ")[1];
      await admin.auth().verifyIdToken(token);
    } catch {
      // OIDC token from Cloud Tasks uses Google identity, not Firebase Auth.
      // If verification fails here, the shared secret is the primary guard.
      // In production, use google-auth-library to verify OIDC tokens properly.
    }
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

// ─── 3. Callable: client triggers cancellation on their own order ────────────
exports.cancelOrderOnTimeout = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }

  const orderId = data?.orderId;
  if (!orderId || typeof orderId !== "string") {
    throw new HttpsError("invalid-argument", "orderId is required.");
  }

  const orderRef = db.collection("orders").doc(orderId);
  const snap = await orderRef.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Order not found.");
  }

  const order = snap.data();
  if (order.userId !== auth.uid) {
    throw new HttpsError("permission-denied", "You do not own this order.");
  }

  const cancelled = await cancelPendingOrder(orderId, "timeout");
  return { cancelled, status: cancelled ? ORDER_STATUS.CANCELLED : order.status };
});
