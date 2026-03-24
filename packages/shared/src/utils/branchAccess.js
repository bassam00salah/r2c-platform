import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore'
import { db } from '../firebase/config'

function buildBranchProfile(branchDoc) {
  const data = branchDoc.data()
  return {
    id: branchDoc.id,
    branchId: branchDoc.id,
    uid: branchDoc.id,
    ...data,
  }
}

export async function resolveBranchAccess(uid) {
  if (!uid) return null

  const directBranch = await getDoc(doc(db, 'branches', uid))
  if (directBranch.exists()) {
    return buildBranchProfile(directBranch)
  }

  const candidateFields = ['managerUid', 'ownerUid', 'partnerUid', 'userId', 'authUid']

  for (const field of candidateFields) {
    const snap = await getDocs(query(collection(db, 'branches'), where(field, '==', uid), limit(1)))
    if (!snap.empty) {
      return buildBranchProfile(snap.docs[0])
    }
  }

  // FIX: Return null instead of a fake branch profile.
  // The caller (partner App.jsx) should redirect to setup screen when null.
  return null
}
