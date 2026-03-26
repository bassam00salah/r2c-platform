/**
 * اختبارات cancelPendingOrder
 * تختبر منطق الإلغاء مع mock لـ Firestore
 */

// Mock بسيط لـ Firestore Transaction
function makeMockDb(initialStatus) {
  let currentData = { status: initialStatus };
  let updated = null;

  const orderRef = { id: "order123" };

  const tx = {
    get: async () => ({
      exists: true,
      data: () => ({ ...currentData }),
    }),
    update: (ref, newData) => { updated = newData; },
  };

  const db = {
    collection: () => ({
      doc: () => orderRef,
    }),
    runTransaction: async (fn) => {
      const result = await fn(tx);
      if (updated) currentData = { ...currentData, ...updated };
      return result;
    },
  };

  return { db, getUpdated: () => updated };
}

// نسخة قابلة للاختبار من cancelPendingOrder
async function cancelPendingOrder(db, orderId, reason = "timeout") {
  const orderRef = db.collection("orders").doc(orderId);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(orderRef);
    if (!snap.exists) return false;
    const { status } = snap.data();
    if (status !== "pending") return false;
    tx.update(orderRef, {
      status: "cancelled",
      cancelReason: reason,
    });
    return true;
  });
}

describe("cancelPendingOrder", () => {
  test("يلغي طلب بحالة pending بنجاح", async () => {
    const { db } = makeMockDb("pending");
    const result = await cancelPendingOrder(db, "order123", "timeout");
    expect(result).toBe(true);
  });

  test("لا يلغي طلب بحالة accepted", async () => {
    const { db } = makeMockDb("accepted");
    const result = await cancelPendingOrder(db, "order123", "timeout");
    expect(result).toBe(false);
  });

  test("لا يلغي طلب بحالة completed", async () => {
    const { db } = makeMockDb("completed");
    const result = await cancelPendingOrder(db, "order123", "timeout");
    expect(result).toBe(false);
  });

  test("لا يلغي طلب بحالة cancelled (لتفادي التكرار)", async () => {
    const { db } = makeMockDb("cancelled");
    const result = await cancelPendingOrder(db, "order123", "timeout");
    expect(result).toBe(false);
  });

  test("يحفظ سبب الإلغاء user_cancelled بشكل صحيح", async () => {
    const { db, getUpdated } = makeMockDb("pending");
    await cancelPendingOrder(db, "order123", "user_cancelled");
    expect(getUpdated().cancelReason).toBe("user_cancelled");
    expect(getUpdated().status).toBe("cancelled");
  });
});
