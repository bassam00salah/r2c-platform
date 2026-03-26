/**
 * orderHandlers — مُصلَح أمنياً
 *
 * الإصلاحات:
 *  1. [أمان] handleQRScan يستدعي Cloud Function بدلاً من updateDoc مباشر
 *  2. [أمان] updateOrderStatus يستدعي Cloud Function بدلاً من updateDoc مباشر
 *  3. [جودة] رسائل خطأ أوضح مع تمييز نوع الفشل
 */

import { functions } from "../firebase";
import { httpsCallable } from "firebase/functions";

const completeOrderByQRFn  = httpsCallable(functions, "completeOrderByQR");
const updateOrderStatusFn  = httpsCallable(functions, "updateOrderStatus");

/**
 * مسح رمز QR وإكمال الطلب — عبر Cloud Function
 * @param {string} qrCode         - الكود المستخرج من QR
 * @param {string} _currentBranchId - غير مستخدم بعد الإصلاح (التحقق server-side)
 */
export const handleQRScan = async (qrCode, _currentBranchId) => {
  if (!qrCode) return { success: false, message: "لم يتم العثور على بيانات في الرمز" };

  try {
    const result = await completeOrderByQRFn({ qrCode: qrCode.trim() });
    return {
      success:   true,
      message:   "تم التحقق من الطلب وتسليمه بنجاح!",
      orderData: result.data?.orderData || null,
    };
  } catch (error) {
    // HttpsError من Firebase تحمل error.code
    const code = error?.code?.replace("functions/", "") || "";
    const messages = {
      "not-found":          "عذراً، هذا الرمز غير موجود في النظام",
      "permission-denied":  "هذا الطلب يخص فرعاً آخر، لا يمكن إتمامه هنا",
      "already-exists":     "تم تسليم هذا الطلب مسبقاً",
      "failed-precondition":"يجب تجهيز الطلب أولاً قبل مسح الرمز",
      "unauthenticated":    "يرجى تسجيل الدخول أولاً",
    };
    return {
      success: false,
      message: messages[code] || "حدث خطأ تقني أثناء محاولة معالجة الطلب",
    };
  }
};

/**
 * تحديث حالة الطلب يدوياً — عبر Cloud Function
 * @param {string} orderId
 * @param {string} newStatus
 */
export const updateOrderStatus = async (orderId, newStatus) => {
  try {
    const result = await updateOrderStatusFn({ orderId, status: newStatus });
    if (!result.data?.success) throw new Error(result.data?.message || "فشل التحديث");
    return { success: true };
  } catch (error) {
    console.error("updateOrderStatus:", error);
    throw error;
  }
};
