/**
 * اختبارات State Machine لانتقالات حالة الطلب
 * تُغطي الحالات الصحيحة والمرفوضة
 */

const ALLOWED_TRANSITIONS = {
  pending:   ["accepted", "rejected", "cancelled"],
  accepted:  ["ready",    "rejected"],
  ready:     ["completed"],
  completed: [],
  rejected:  [],
  cancelled: [],
};

function canTransition(from, to) {
  return (ALLOWED_TRANSITIONS[from] || []).includes(to);
}

describe("Order State Machine", () => {
  // ─── انتقالات صحيحة ────────────────────────────────────────────────
  test("pending → accepted (قبول الطلب)", () => {
    expect(canTransition("pending", "accepted")).toBe(true);
  });

  test("pending → rejected (رفض الطلب)", () => {
    expect(canTransition("pending", "rejected")).toBe(true);
  });

  test("pending → cancelled (إلغاء المستخدم)", () => {
    expect(canTransition("pending", "cancelled")).toBe(true);
  });

  test("accepted → ready (تجهيز الطلب)", () => {
    expect(canTransition("accepted", "ready")).toBe(true);
  });

  test("accepted → rejected (رفض بعد القبول)", () => {
    expect(canTransition("accepted", "rejected")).toBe(true);
  });

  test("ready → completed (مسح QR وإكمال)", () => {
    expect(canTransition("ready", "completed")).toBe(true);
  });

  // ─── انتقالات مرفوضة ───────────────────────────────────────────────
  test("completed → أي حالة (مكتمل لا يتغير)", () => {
    expect(canTransition("completed", "pending")).toBe(false);
    expect(canTransition("completed", "accepted")).toBe(false);
    expect(canTransition("completed", "cancelled")).toBe(false);
  });

  test("rejected → أي حالة (مرفوض لا يتغير)", () => {
    expect(canTransition("rejected", "accepted")).toBe(false);
    expect(canTransition("rejected", "pending")).toBe(false);
  });

  test("cancelled → أي حالة (ملغى لا يتغير)", () => {
    expect(canTransition("cancelled", "pending")).toBe(false);
    expect(canTransition("cancelled", "accepted")).toBe(false);
  });

  test("pending → completed مباشرة (قفز غير مسموح)", () => {
    expect(canTransition("pending", "completed")).toBe(false);
  });

  test("ready → accepted (رجعة للخلف غير مسموحة)", () => {
    expect(canTransition("ready", "accepted")).toBe(false);
  });

  // ─── حالات غير موجودة ──────────────────────────────────────────────
  test("حالة غير موجودة → أي حالة", () => {
    expect(canTransition("unknown", "accepted")).toBe(false);
    expect(canTransition(undefined, "accepted")).toBe(false);
  });
});
