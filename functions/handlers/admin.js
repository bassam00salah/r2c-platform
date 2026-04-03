const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const { assertEmail, assertPassword, assertString, assertCoordinates } = require("../lib/validation");

const db = getFirestore();
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

exports.createBranchUser = onCall(CALL_OPTIONS, async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Authentication is required.");
  enforceOptionalAppCheck(request);
  const adminDoc = await db.collection("admins").doc(auth.uid).get();
  if (!adminDoc.exists) throw new HttpsError("permission-denied", "Only super admins can create branch accounts.");

  const email = assertEmail(data?.email);
  const password = assertPassword(data?.password);
  const name = assertString(data?.name, "name", { max: 150 });
  const restaurantId = assertString(data?.restaurantId, "restaurantId", { max: 100 });

  let latitude = null, longitude = null;
  if (data?.latitude != null && data?.longitude != null) {
    const coords = assertCoordinates(data.latitude, data.longitude);
    latitude = coords.latitude; longitude = coords.longitude;
  }

  try {
    const userRecord = await admin.auth().createUser({ email, password });
    const uid = userRecord.uid;
    await db.collection("branches").doc(uid).set({
      name, restaurantId, city: typeof data?.city === "string" ? data.city.trim() : "",
      latitude, longitude, status: "active", createdAt: FieldValue.serverTimestamp(),
    });
    logger.info("createBranchUser: success", { uid, restaurantId, createdBy: auth.uid });
    return { uid, success: true };
  } catch (err) {
    if (err.code === "auth/email-already-exists") throw new HttpsError("already-exists", "هذا البريد الإلكتروني مستخدم بالفعل.");
    logger.error("createBranchUser failed", err);
    throw new HttpsError("internal", "Unable to create branch user");
  }
});

exports.createOwnerUser = onCall(CALL_OPTIONS, async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Authentication is required.");
  enforceOptionalAppCheck(request);
  const adminDoc = await db.collection("admins").doc(auth.uid).get();
  if (!adminDoc.exists) throw new HttpsError("permission-denied", "Only super admins can create owner accounts.");

  const email = assertEmail(data?.email);
  const password = assertPassword(data?.password);
  const name = assertString(data?.name, "name", { max: 150 });
  const restaurantId = assertString(data?.restaurantId, "restaurantId", { max: 100 });

  try {
    const userRecord = await admin.auth().createUser({ email, password });
    const uid = userRecord.uid;
    await db.collection("restaurantOwners").doc(uid).set({ email, name, restaurantId, createdAt: FieldValue.serverTimestamp() });
    logger.info("createOwnerUser: success", { uid, restaurantId, createdBy: auth.uid });
    return { uid, success: true };
  } catch (err) {
    if (err.code === "auth/email-already-exists") throw new HttpsError("already-exists", "هذا البريد الإلكتروني مستخدم بالفعل.");
    logger.error("createOwnerUser failed", err);
    throw new HttpsError("internal", "Unable to create owner user");
  }
});

exports.deleteBranch = onCall(CALL_OPTIONS, async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Authentication is required.");
  enforceOptionalAppCheck(request);
  const adminDoc = await db.collection("admins").doc(auth.uid).get();
  if (!adminDoc.exists) throw new HttpsError("permission-denied", "Only super admins can delete branches.");

  const branchId = assertString(data?.branchId, "branchId", { max: 100 });
  const branchRef = db.collection("branches").doc(branchId);
  const branchSnap = await branchRef.get();
  if (!branchSnap.exists) throw new HttpsError("not-found", "Branch not found.");

  try { await admin.auth().updateUser(branchId, { disabled: true }); } catch (err) { logger.warn("deleteBranch: auth user not found or already disabled", { branchId }); }
  await branchRef.delete();
  logger.info("deleteBranch: success", { branchId, deletedBy: auth.uid });
  return { success: true, branchId };
});

exports.deleteOwner = onCall(CALL_OPTIONS, async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Authentication is required.");
  enforceOptionalAppCheck(request);
  const adminDoc = await db.collection("admins").doc(auth.uid).get();
  if (!adminDoc.exists) throw new HttpsError("permission-denied", "Only super admins can delete owners.");

  const ownerId = assertString(data?.ownerId, "ownerId", { max: 100 });
  const ownerRef = db.collection("restaurantOwners").doc(ownerId);
  const ownerSnap = await ownerRef.get();
  if (!ownerSnap.exists) throw new HttpsError("not-found", "Owner not found.");

  try { await admin.auth().updateUser(ownerId, { disabled: true }); } catch (err) { logger.warn("deleteOwner: auth user not found or already disabled", { ownerId }); }
  await ownerRef.delete();
  logger.info("deleteOwner: success", { ownerId, deletedBy: auth.uid });
  return { success: true, ownerId };
});
