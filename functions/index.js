const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
admin.initializeApp();

const db = admin.firestore();

exports.autoCancelOrder = onDocumentWritten("orders/{orderId}", async (event) => {
  const order = event.data.after.data();
  if (!order) return null;
  if (order.status !== "pending") return null;
  if (event.data.before.exists) return null;

  const orderId = event.params.orderId;

  await new Promise(resolve => setTimeout(resolve, 45000));

  const freshDoc = await db.collection("orders").doc(orderId).get();
  const freshOrder = freshDoc.data();

  if (freshOrder && freshOrder.status === "pending") {
    await db.collection("orders").doc(orderId).update({
      status: "cancelled",
      cancelReason: "timeout",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  return null;
});
