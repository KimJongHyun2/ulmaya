import type {
  SettlementSession,
  SettlementSessionCreateInput,
  SettlementSessionPatch,
} from "@/types/session"
import { supabase } from "@/lib/supabase"

const memorySessions = new Map<string, SettlementSession>()
const TABLE_NAME = "settlement_sessions"
const MEMORY_FALLBACK_MESSAGE =
  "[settlement repository] Supabase client is not configured. Using memory fallback."

interface SettlementSessionRow {
  id: string
  data: SettlementSession
  created_at: string | null
  updated_at: string | null
}

type SupabaseOperation = "insert" | "select" | "update" | "delete"

interface SupabaseErrorLike {
  message?: string
  code?: string
  details?: string
  hint?: string
}

function cloneSession(session: SettlementSession): SettlementSession {
  return JSON.parse(JSON.stringify(session)) as SettlementSession
}

function logSupabaseNotConfigured() {
  console.warn(MEMORY_FALLBACK_MESSAGE)
}

function toSupabaseErrorLike(error: unknown): SupabaseErrorLike {
  if (error && typeof error === "object") {
    return error as SupabaseErrorLike
  }

  return {
    message: error instanceof Error ? error.message : String(error),
  }
}

function logSupabaseFailure(
  operation: SupabaseOperation,
  error: unknown,
  sessionId?: string,
) {
  const supabaseError = toSupabaseErrorLike(error)

  console.error("[settlement repository] Supabase request failed", {
    operation,
    sessionId,
    message: supabaseError.message,
    code: supabaseError.code,
    details: supabaseError.details,
    hint: supabaseError.hint,
  })
}

function logSupabaseSuccess(operation: SupabaseOperation, sessionId: string) {
  console.info(`[settlement repository] Supabase ${operation} success`, sessionId)
}

function parseTimestamp(value: string | null | undefined, fallback: number) {
  if (!value) {
    return fallback
  }

  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : fallback
}

function rowToSession(row: SettlementSessionRow): SettlementSession {
  const fallback = Date.now()
  const session = row.data

  return {
    ...session,
    id: row.id,
    createdAt: parseTimestamp(row.created_at, session.createdAt ?? fallback),
    updatedAt: parseTimestamp(row.updated_at, session.updatedAt ?? fallback),
  }
}

function persistMemorySession(session: SettlementSession) {
  memorySessions.set(session.id, cloneSession(session))
  return session
}

function loadMemorySession(sessionId: string) {
  return memorySessions.has(sessionId) ? cloneSession(memorySessions.get(sessionId)!) : null
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

async function insertSupabaseSession(session: SettlementSession) {
  if (!supabase) {
    logSupabaseNotConfigured()
    return null
  }

  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert({
        id: session.id,
        data: session,
      })
      .select("id,data,created_at,updated_at")
      .single<SettlementSessionRow>()

    if (error) {
      logSupabaseFailure("insert", error, session.id)
      return null
    }

    if (data) {
      logSupabaseSuccess("insert", data.id)
      return rowToSession(data)
    }

    return null
  } catch (error) {
    logSupabaseFailure("insert", error, session.id)
    return null
  }
}

async function loadSupabaseSession(sessionId: string) {
  if (!supabase) {
    logSupabaseNotConfigured()
    return null
  }

  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("id,data,created_at,updated_at")
      .eq("id", sessionId)
      .maybeSingle<SettlementSessionRow>()

    if (error) {
      logSupabaseFailure("select", error, sessionId)
      return null
    }

    if (data) {
      logSupabaseSuccess("select", data.id)
      return rowToSession(data)
    }

    logSupabaseSuccess("select", sessionId)
    return null
  } catch (error) {
    logSupabaseFailure("select", error, sessionId)
    return null
  }
}

async function updateSupabaseSession(sessionId: string, session: SettlementSession) {
  if (!supabase) {
    logSupabaseNotConfigured()
    return null
  }

  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({ data: session })
      .eq("id", sessionId)
      .select("id,data,created_at,updated_at")
      .single<SettlementSessionRow>()

    if (error) {
      logSupabaseFailure("update", error, sessionId)
      return null
    }

    if (data) {
      logSupabaseSuccess("update", data.id)
      return rowToSession(data)
    }

    return null
  } catch (error) {
    logSupabaseFailure("update", error, sessionId)
    return null
  }
}

async function deleteSupabaseSession(sessionId: string) {
  if (!supabase) {
    logSupabaseNotConfigured()
    return false
  }

  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq("id", sessionId)

    if (error) {
      logSupabaseFailure("delete", error, sessionId)
      return false
    }

    logSupabaseSuccess("delete", sessionId)
    return true
  } catch (error) {
    logSupabaseFailure("delete", error, sessionId)
    return false
  }
}

export async function createSettlementSession(input: SettlementSessionCreateInput) {
  const id = crypto.randomUUID()
  const session = buildSession(id, input)
  const savedSession = await insertSupabaseSession(session)

  return persistMemorySession(savedSession ?? session)
}

export async function loadSettlementSession(sessionId: string) {
  const savedSession = await loadSupabaseSession(sessionId)

  if (savedSession) {
    return persistMemorySession(savedSession)
  }

  return loadMemorySession(sessionId)
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

  const savedSession = await updateSupabaseSession(sessionId, nextSession)

  return persistMemorySession(savedSession ?? nextSession)
}

export async function deleteSettlementSession(sessionId: string) {
  const deleted = await deleteSupabaseSession(sessionId)
  const deletedFromMemory = memorySessions.delete(sessionId)

  return deleted || deletedFromMemory || !supabase
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
