import type {
  SettlementSession,
  SettlementSessionCreateInput,
  SettlementSessionPatch,
} from "@/types/session"

const memorySessions = new Map<string, SettlementSession>()

function cloneSession(session: SettlementSession): SettlementSession {
  return JSON.parse(JSON.stringify(session)) as SettlementSession
}

async function persistSession(session: SettlementSession) {
  memorySessions.set(session.id, cloneSession(session))
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
  return memorySessions.has(sessionId) ? cloneSession(memorySessions.get(sessionId)!) : null
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

  memorySessions.set(sessionId, cloneSession(nextSession))
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
