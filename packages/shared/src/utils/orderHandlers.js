import { db } from "../firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";

/**
 * وظيفة معالجة مسح رمز QR
 * @param {string} qrData - البيانات المستخرجة من رمز QR (غالباً ما تكون معرف الطلب orderId)
 * @param {string} currentBranchId - معرف الفرع الحالي للتأكد من أن الطلب يخص هذا الفرع
 * @returns {Object} نتيجة العملية { success: boolean, message: string, orderData: object }
 */
export const handleQRScan = async (qrData, currentBranchId) => {
  try {
    // 1. التحقق من وجود بيانات
    if (!qrData) {
      return { success: false, message: "لم يتم العثور على بيانات في الرمز" };
    }

    // 2. جلب بيانات الطلب من Firestore
    const orderId = qrData.trim();
    const orderRef = doc(db, "orders", orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) {
      return { success: false, message: "عذراً، هذا الطلب غير موجود في النظام" };
    }

    const orderData = orderSnap.data();

    // 3. التحقق من أن الطلب يخص هذا الفرع لمنع الاحتيال
    if (orderData.branchId !== currentBranchId) {
      return {
        success: false,
        message: "هذا الطلب يخص فرعاً آخر، لا يمكن إتمامه هنا"
      };
    }

    // 4. التحقق من حالة الطلب (يجب أن يكون مقبولاً ليتم تسليمه)
    if (orderData.status === "completed") {
      return { success: false, message: "تم تسليم هذا الطلب مسبقاً" };
    }

    if (orderData.status !== "accepted") {
      return {
        success: false,
        message: `حالة الطلب الحالية هي (${orderData.status})، يجب قبول الطلب أولاً من لوحة التحكم`
      };
    }

    // 5. تحديث حالة الطلب إلى "مكتمل" (Completed)
    await updateDoc(orderRef, {
      status: "completed",
      completedAt: serverTimestamp(),
      collected: true
    });

    return {
      success: true,
      message: "تم التحقق من الطلب وتسليمه بنجاح!",
      orderData: { id: orderId, ...orderData }
    };

  } catch (error) {
    console.error("Error in handleQRScan:", error);
    return {
      success: false,
      message: "حدث خطأ تقني أثناء محاولة معالجة الطلب"
    };
  }
};

/**
 * وظيفة لتحديث حالة الطلب يدوياً (قبول/رفض)
 */
export const updateOrderStatus = async (orderId, newStatus) => {
  try {
    const orderRef = doc(db, "orders", orderId);
    await updateDoc(orderRef, {
      status: newStatus,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating order status:", error);
    throw error;
  }
};
