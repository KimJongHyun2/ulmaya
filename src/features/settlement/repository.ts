import { collection, doc, getDoc, setDoc, updateDoc } from "firebase/firestore"
import { getFirestoreDb } from "@/lib/firebase"
import type {
  SettlementSession,
  SettlementSessionCreateInput,
  SettlementSessionPatch,
} from "@/types/session"

const COLLECTION_NAME = "settlementSessions"

const memorySessions = new Map<string, SettlementSession>()

function cloneSession(session: SettlementSession): SettlementSession {
  return JSON.parse(JSON.stringify(session)) as SettlementSession
}

function getCollectionRef() {
  const db = getFirestoreDb()

  if (!db) {
    return null
  }

  return collection(db, COLLECTION_NAME)
}

async function persistSession(session: SettlementSession) {
  const collectionRef = getCollectionRef()

  if (!collectionRef) {
    memorySessions.set(session.id, cloneSession(session))
    return session
  }

  await setDoc(doc(collectionRef, session.id), session)
  return session
}

function buildSession(id: string, input: SettlementSessionCreateInput): SettlementSession {
  const timestamp = Date.now()

  return {
    id,
    receiptInfo: input.receiptInfo,
    menuItems: input.menuItems,
    selectedParticipants: input.selectedParticipants,
    settlements: input.settlements,
    status: input.status ?? "draft",
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export async function createSettlementSession(input: SettlementSessionCreateInput) {
  const id = crypto.randomUUID()
  const session = buildSession(id, input)
  return persistSession(session)
}

export async function loadSettlementSession(sessionId: string) {
  const collectionRef = getCollectionRef()

  if (!collectionRef) {
    return memorySessions.has(sessionId) ? cloneSession(memorySessions.get(sessionId)!) : null
  }

  const snapshot = await getDoc(doc(collectionRef, sessionId))

  if (!snapshot.exists()) {
    return null
  }

  return snapshot.data() as SettlementSession
}

export async function updateSettlementSession(
  sessionId: string,
  patch: SettlementSessionPatch,
) {
  const existingSession = await loadSettlementSession(sessionId)

  if (!existingSession) {
    return null
  }

  const nextSession: SettlementSession = {
    ...existingSession,
    ...patch,
    updatedAt: patch.updatedAt ?? Date.now(),
  }

  const collectionRef = getCollectionRef()

  if (!collectionRef) {
    memorySessions.set(sessionId, cloneSession(nextSession))
    return nextSession
  }

  await updateDoc(doc(collectionRef, sessionId), {
    ...patch,
    updatedAt: nextSession.updatedAt,
  })

  return nextSession
}

export async function saveSessionReceiptInfo(
  sessionId: string,
  receiptInfo: SettlementSessionPatch["receiptInfo"],
) {
  return updateSettlementSession(sessionId, { receiptInfo })
}

export async function saveSessionParticipants(
  sessionId: string,
  selectedParticipants: SettlementSessionPatch["selectedParticipants"],
) {
  return updateSettlementSession(sessionId, { selectedParticipants })
}

export async function saveSessionMenuItems(
  sessionId: string,
  menuItems: SettlementSessionPatch["menuItems"],
) {
  return updateSettlementSession(sessionId, { menuItems })
}

export async function saveSessionSettlements(
  sessionId: string,
  settlements: SettlementSessionPatch["settlements"],
) {
  return updateSettlementSession(sessionId, { settlements })
}

export async function updateSessionStatus(
  sessionId: string,
  status: SettlementSessionPatch["status"],
) {
  return updateSettlementSession(sessionId, { status })
}
