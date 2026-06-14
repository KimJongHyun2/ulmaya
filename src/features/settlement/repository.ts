import type {
  SettlementSession,
  SettlementSessionCreateInput,
  SettlementSessionPatch,
} from "@/types/session"
import { supabase } from "@/lib/supabase"
import { isSettlementRequestCompleted, type SettlementPaymentStatus } from "@/features/settlement/status"

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

export interface SettlementHistoryItem {
  settlementResultId: string
  settlementRequestIds: string[]
  receiptId: string
  storeName: string
  settlementDate?: string | null
  menuName: string
  menuNames: string[]
  participantName: string
  settlementAmount: number
  inviteStatus?: string
  requestStatus: string
  transferStatus: string
  completed: boolean
  completedAt: string | null
}

interface SettlementResultRow {
  settlement_result_id: string
  receipt_id: string
  menu_item_id: number
  participant_id: number
  settlement_amount: number
  invite_status: string
  transfer_status: string
  completed: boolean
  completed_at: string | null
}

interface SettlementRequestRow {
  settlement_request_id: string
  receipt_id: string
  menu_item_id: number
  participant_id: number
  requested_amount: number
  request_status: string
}

interface ReceiptRow {
  receipt_id: string
  store_id: string | null
  registered_at: string | null
}

interface StoreRow {
  store_id: string
  store_name: string
}

interface MenuItemRow {
  receipt_id: string
  menu_item_id: number
  menu_name: string
}

interface ParticipantRow {
  participant_id: number
  name: string
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

function logSupabaseTableFailure(
  operation: SupabaseOperation,
  table: string,
  error: unknown,
  payload: unknown,
  sessionId?: string,
) {
  const supabaseError = toSupabaseErrorLike(error)

  console.error("[settlement repository] Supabase ERD table request failed", {
    operation,
    table,
    sessionId,
    payload,
    message: supabaseError.message,
    code: supabaseError.code,
    details: supabaseError.details,
    hint: supabaseError.hint,
  })
}

function logSupabaseSuccess(operation: SupabaseOperation, sessionId: string) {
  console.info(`[settlement repository] Supabase ${operation} success`, sessionId)
}

function getReceiptTotal(session: SettlementSession) {
  return session.receiptInfo.totalAmount
    ?? session.menuItems.reduce((sum, item) => sum + Math.max(0, item.price || 0), 0)
}

function getAssignedParticipants(session: SettlementSession, assignedTo: string[]) {
  if (assignedTo.includes("전체")) {
    return session.selectedParticipants
  }

  return session.selectedParticipants.filter((participant) =>
    assignedTo.includes(participant.name),
  )
}

function getMenuSettlementParticipants(session: SettlementSession, itemId: number) {
  const menuItem = session.menuItems.find((item) => item.id === itemId)

  if (!menuItem) {
    return []
  }

  if (menuItem.isNbbang) {
    return session.selectedParticipants
  }

  return getAssignedParticipants(session, menuItem.assignedTo)
}

function buildSettlementRows(session: SettlementSession) {
  const requestRows: Array<Record<string, unknown>> = []
  const resultRows: Array<Record<string, unknown>> = []
  session.menuItems.forEach((menuItem) => {
    const participants = getMenuSettlementParticipants(session, menuItem.id)

    if (participants.length === 0) {
      return
    }

    const amount = Math.round(menuItem.price / participants.length)

    participants.forEach((participant) => {
      const rowId = `${session.id}:${menuItem.id}:${participant.id}`
      requestRows.push({
        settlement_request_id: rowId,
        menu_item_id: menuItem.id,
        receipt_id: session.id,
        participant_id: participant.id,
        requested_amount: amount,
        request_method: "카카오페이",
        request_status: "PENDING",
        request_message: `${session.receiptInfo.storeName} 정산 요청`,
      })

      resultRows.push({
        settlement_result_id: rowId,
        menu_item_id: menuItem.id,
        receipt_id: session.id,
        participant_id: participant.id,
        settlement_amount: amount,
        invite_status: "초대완료",
        transfer_status: "PENDING",
        completed: false,
        completed_at: null,
      })
    })
  })

  return { requestRows, resultRows }
}

async function syncSettlementRelationalData(session: SettlementSession) {
  if (!supabase) {
    logSupabaseNotConfigured()
    return
  }

  if (session.settlements.length === 0) {
    return
  }

  try {
    const storeId = session.id
    const { requestRows, resultRows } = buildSettlementRows(session)

    const { error: storeError } = await supabase
      .from("stores")
      .upsert({
        store_id: storeId,
        store_name: session.receiptInfo.storeName || "미확인 가게",
        address: session.receiptInfo.location || null,
        phone: null,
      })

    if (storeError) {
      logSupabaseFailure("insert", storeError, session.id)
      return
    }

    const { error: receiptError } = await supabase
      .from("receipts")
      .upsert({
        receipt_id: session.id,
        image_path: session.receiptInfo.imageUrl ?? session.receiptInfo.imagePreview ?? null,
        ocr_raw_text: session.receiptInfo.rawText ?? null,
        total_amount: getReceiptTotal(session),
        store_id: storeId,
        user_id: null,
      })

    if (receiptError) {
      logSupabaseFailure("insert", receiptError, session.id)
      return
    }

    if (session.selectedParticipants.length > 0) {
      const { error: participantError } = await supabase
        .from("participants")
        .upsert(
          session.selectedParticipants.map((participant) => ({
            participant_id: participant.id,
            name: participant.name,
            contact: null,
            kakao_linked: Boolean(participant.imageUrl),
            profile_image: participant.imageUrl ?? null,
          })),
        )

      if (participantError) {
        logSupabaseFailure("insert", participantError, session.id)
        return
      }
    }

    await supabase.from("settlement_results").delete().eq("receipt_id", session.id)
    await supabase.from("settlement_requests").delete().eq("receipt_id", session.id)
    await supabase.from("menu_items").delete().eq("receipt_id", session.id)

    if (session.menuItems.length > 0) {
      const { error: menuError } = await supabase
        .from("menu_items")
        .insert(
          session.menuItems.map((menuItem) => ({
            menu_item_id: menuItem.id,
            receipt_id: session.id,
            menu_name: menuItem.name,
            unit_price: menuItem.price,
            quantity: 1,
            amount: menuItem.price,
            edited: false,
          })),
        )

      if (menuError) {
        logSupabaseFailure("insert", menuError, session.id)
        return
      }
    }

    if (requestRows.length > 0) {
      const { error: requestError } = await supabase
        .from("settlement_requests")
        .insert(requestRows)

      if (requestError) {
        logSupabaseFailure("insert", requestError, session.id)
        return
      }
    }

    if (resultRows.length > 0) {
      const { error: resultError } = await supabase
        .from("settlement_results")
        .insert(resultRows)

      if (resultError) {
        logSupabaseFailure("insert", resultError, session.id)
        return
      }
    }

    console.info("[settlement repository] ERD tables sync success", session.id)
  } catch (error) {
    logSupabaseFailure("insert", error, session.id)
  }
}

async function syncSettlementRelationalDataWithDiagnostics(session: SettlementSession) {
  if (!supabase) {
    logSupabaseNotConfigured()
    return
  }

  if (session.settlements.length === 0) {
    return
  }

  const storeId = session.id
  const { requestRows, resultRows } = buildSettlementRows(session)

  try {
    const storePayload = {
      store_id: storeId,
      store_name: session.receiptInfo.storeName || "Unknown store",
      address: session.receiptInfo.location || null,
      phone: null,
    }
    const { error: storeError } = await supabase.from("stores").upsert(storePayload)

    if (storeError) {
      logSupabaseTableFailure("insert", "stores", storeError, storePayload, session.id)
      return
    }

    const receiptPayload = {
      receipt_id: session.id,
      image_path: session.receiptInfo.imageUrl ?? session.receiptInfo.imagePreview ?? null,
      ocr_raw_text: session.receiptInfo.rawText ?? null,
      total_amount: getReceiptTotal(session),
      store_id: storeId,
      user_id: null,
    }
    const { error: receiptError } = await supabase.from("receipts").upsert(receiptPayload)

    if (receiptError) {
      logSupabaseTableFailure("insert", "receipts", receiptError, receiptPayload, session.id)
      return
    }

    const deleteResultsPayload = { receipt_id: session.id }
    const { error: deleteResultsError } = await supabase
      .from("settlement_results")
      .delete()
      .eq("receipt_id", session.id)

    if (deleteResultsError) {
      logSupabaseTableFailure(
        "delete",
        "settlement_results",
        deleteResultsError,
        deleteResultsPayload,
        session.id,
      )
      return
    }

    const deleteRequestsPayload = { receipt_id: session.id }
    const { error: deleteRequestsError } = await supabase
      .from("settlement_requests")
      .delete()
      .eq("receipt_id", session.id)

    if (deleteRequestsError) {
      logSupabaseTableFailure(
        "delete",
        "settlement_requests",
        deleteRequestsError,
        deleteRequestsPayload,
        session.id,
      )
      return
    }

    const deleteMenuPayload = { receipt_id: session.id }
    const { error: deleteMenuError } = await supabase
      .from("menu_items")
      .delete()
      .eq("receipt_id", session.id)

    if (deleteMenuError) {
      logSupabaseTableFailure(
        "delete",
        "menu_items",
        deleteMenuError,
        deleteMenuPayload,
        session.id,
      )
      return
    }

    if (session.menuItems.length > 0) {
      const menuPayload = session.menuItems.map((menuItem) => ({
        menu_item_id: menuItem.id,
        receipt_id: session.id,
        menu_name: menuItem.name,
        unit_price: menuItem.price,
        quantity: 1,
        amount: menuItem.price,
        edited: false,
      }))
      const { error: menuError } = await supabase.from("menu_items").insert(menuPayload)

      if (menuError) {
        logSupabaseTableFailure("insert", "menu_items", menuError, menuPayload, session.id)
        return
      }
    }

    if (session.selectedParticipants.length > 0) {
      const participantPayload = session.selectedParticipants.map((participant) => ({
        participant_id: participant.id,
        name: participant.name,
        contact: null,
        kakao_linked: Boolean(participant.imageUrl),
        profile_image: participant.imageUrl ?? null,
      }))
      const { error: participantError } = await supabase
        .from("participants")
        .upsert(participantPayload)

      if (participantError) {
        logSupabaseTableFailure(
          "insert",
          "participants",
          participantError,
          participantPayload,
          session.id,
        )
        return
      }
    }

    if (requestRows.length > 0) {
      const { error: requestError } = await supabase
        .from("settlement_requests")
        .insert(requestRows)

      if (requestError) {
        logSupabaseTableFailure(
          "insert",
          "settlement_requests",
          requestError,
          requestRows,
          session.id,
        )
        return
      }
    }

    if (resultRows.length > 0) {
      const { error: resultError } = await supabase
        .from("settlement_results")
        .insert(resultRows)

      if (resultError) {
        logSupabaseTableFailure(
          "insert",
          "settlement_results",
          resultError,
          resultRows,
          session.id,
        )
        return
      }
    }

    console.info("[settlement repository] ERD tables sync success", session.id)
  } catch (error) {
    logSupabaseTableFailure("insert", "unknown", error, { receipt_id: session.id }, session.id)
  }
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
      const savedSession = rowToSession(data)
      logSupabaseSuccess("insert", data.id)
      await syncSettlementRelationalDataWithDiagnostics(savedSession)
      return savedSession
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
      const savedSession = rowToSession(data)
      logSupabaseSuccess("update", data.id)
      await syncSettlementRelationalDataWithDiagnostics(savedSession)
      return savedSession
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

export async function listSettlementHistory(): Promise<SettlementHistoryItem[]> {
  if (!supabase) {
    logSupabaseNotConfigured()
    return []
  }

  try {
    const { data: resultRows, error: resultError } = await supabase
      .from("settlement_results")
      .select(
        "settlement_result_id,receipt_id,menu_item_id,participant_id,settlement_amount,transfer_status,completed,completed_at",
      )
      .order("completed_at", { ascending: false, nullsFirst: false })

    if (resultError) {
      logSupabaseFailure("select", resultError)
      return []
    }

    const results = (resultRows ?? []) as SettlementResultRow[]
    const receiptIds = Array.from(new Set(results.map((row) => row.receipt_id)))
    const participantIds = Array.from(new Set(results.map((row) => row.participant_id)))
    const requestIds = results.map((row) => row.settlement_result_id)

    const { data: receiptRows, error: receiptError } = await supabase
      .from("receipts")
      .select("receipt_id,store_id")
      .in("receipt_id", receiptIds.length > 0 ? receiptIds : [""])

    if (receiptError) {
      logSupabaseFailure("select", receiptError)
      return []
    }

    const receipts = (receiptRows ?? []) as ReceiptRow[]
    const storeIds = Array.from(
      new Set(receipts.map((row) => row.store_id).filter((storeId): storeId is string => Boolean(storeId))),
    )

    const { data: storeRows, error: storeError } = await supabase
      .from("stores")
      .select("store_id,store_name")
      .in("store_id", storeIds.length > 0 ? storeIds : [""])

    if (storeError) {
      logSupabaseFailure("select", storeError)
      return []
    }

    const { data: menuRows, error: menuError } = await supabase
      .from("menu_items")
      .select("receipt_id,menu_item_id,menu_name")
      .in("receipt_id", receiptIds.length > 0 ? receiptIds : [""])

    if (menuError) {
      logSupabaseFailure("select", menuError)
      return []
    }

    const { data: participantRows, error: participantError } = await supabase
      .from("participants")
      .select("participant_id,name")
      .in("participant_id", participantIds.length > 0 ? participantIds : [-1])

    if (participantError) {
      logSupabaseFailure("select", participantError)
      return []
    }

    const { data: requestRows, error: requestError } = await supabase
      .from("settlement_requests")
      .select("settlement_request_id,request_status")
      .in("settlement_request_id", requestIds.length > 0 ? requestIds : [""])

    if (requestError) {
      logSupabaseFailure("select", requestError)
      return []
    }

    const receiptMap = new Map(receipts.map((row) => [row.receipt_id, row]))
    const storeMap = new Map(((storeRows ?? []) as StoreRow[]).map((row) => [row.store_id, row]))
    const menuMap = new Map(
      ((menuRows ?? []) as MenuItemRow[]).map((row) => [
        `${row.receipt_id}:${row.menu_item_id}`,
        row,
      ]),
    )
    const participantMap = new Map(
      ((participantRows ?? []) as ParticipantRow[]).map((row) => [row.participant_id, row]),
    )
    const requestMap = new Map(
      ((requestRows ?? []) as SettlementRequestRow[]).map((row) => [
        row.settlement_request_id,
        row,
      ]),
    )

    logSupabaseSuccess("select", "settlement-history")

    return results.map((row) => {
      const receipt = receiptMap.get(row.receipt_id)
      const store = receipt?.store_id ? storeMap.get(receipt.store_id) : null
      const menu = menuMap.get(`${row.receipt_id}:${row.menu_item_id}`)
      const participant = participantMap.get(row.participant_id)
      const requestStatus = requestMap.get(row.settlement_result_id)?.request_status ?? "PENDING"

      return {
        settlementResultId: row.settlement_result_id,
        settlementRequestIds: [row.settlement_result_id],
        receiptId: row.receipt_id,
        storeName: store?.store_name ?? "미확인 가게",
        menuName: menu?.menu_name ?? "미확인 메뉴",
        menuNames: [menu?.menu_name ?? "미확인 메뉴"],
        participantName: participant?.name ?? "미확인 참여자",
        settlementAmount: row.settlement_amount,
        requestStatus,
        transferStatus: row.transfer_status,
        completed: isSettlementRequestCompleted(requestStatus),
        completedAt: row.completed_at,
      }
    })
  } catch (error) {
    logSupabaseFailure("select", error)
    return []
  }
}

export async function listSettlementHistoryCards(): Promise<SettlementHistoryItem[]> {
  if (!supabase) {
    logSupabaseNotConfigured()
    throw new Error("Supabase client is not configured.")
  }

  try {
    const { data: requestRows, error: requestError } = await supabase
      .from("settlement_requests")
      .select(
        "settlement_request_id,receipt_id,menu_item_id,participant_id,requested_amount,request_status",
      )

    if (requestError) {
      logSupabaseFailure("select", requestError)
      throw requestError
    }

    const requests = (requestRows ?? []) as SettlementRequestRow[]

    if (requests.length === 0) {
      logSupabaseSuccess("select", "settlement-history")
      return []
    }

    const receiptIds = Array.from(new Set(requests.map((row) => row.receipt_id)))
    const participantIds = Array.from(new Set(requests.map((row) => row.participant_id)))
    const requestIds = requests.map((row) => row.settlement_request_id)

    const { data: receiptRows, error: receiptError } = await supabase
      .from("receipts")
      .select("receipt_id,store_id,registered_at")
      .in("receipt_id", receiptIds)

    if (receiptError) {
      logSupabaseFailure("select", receiptError)
      throw receiptError
    }

    const receipts = (receiptRows ?? []) as ReceiptRow[]
    const storeIds = Array.from(
      new Set(
        receipts
          .map((row) => row.store_id)
          .filter((storeId): storeId is string => Boolean(storeId)),
      ),
    )

    const { data: storeRows, error: storeError } = await supabase
      .from("stores")
      .select("store_id,store_name")
      .in("store_id", storeIds.length > 0 ? storeIds : [""])

    if (storeError) {
      logSupabaseFailure("select", storeError)
      throw storeError
    }

    const { data: menuRows, error: menuError } = await supabase
      .from("menu_items")
      .select("receipt_id,menu_item_id,menu_name")
      .in("receipt_id", receiptIds)

    if (menuError) {
      logSupabaseFailure("select", menuError)
      throw menuError
    }

    const { data: resultRows, error: resultError } = await supabase
      .from("settlement_results")
      .select(
        "settlement_result_id,receipt_id,menu_item_id,participant_id,settlement_amount,invite_status,transfer_status,completed,completed_at",
      )
      .in("settlement_result_id", requestIds)

    if (resultError) {
      logSupabaseFailure("select", resultError)
      throw resultError
    }

    const { data: participantRows, error: participantError } = await supabase
      .from("participants")
      .select("participant_id,name")
      .in("participant_id", participantIds.length > 0 ? participantIds : [-1])

    if (participantError) {
      logSupabaseFailure("select", participantError)
      throw participantError
    }

    const receiptMap = new Map(receipts.map((row) => [row.receipt_id, row]))
    const storeMap = new Map(((storeRows ?? []) as StoreRow[]).map((row) => [row.store_id, row]))
    const menuMap = new Map(
      ((menuRows ?? []) as MenuItemRow[]).map((row) => [
        `${row.receipt_id}:${row.menu_item_id}`,
        row,
      ]),
    )
    const participantMap = new Map(
      ((participantRows ?? []) as ParticipantRow[]).map((row) => [row.participant_id, row]),
    )
    const resultMap = new Map(
      ((resultRows ?? []) as SettlementResultRow[]).map((row) => [
        row.settlement_result_id,
        row,
      ]),
    )
    const personMap = new Map<
      string,
      {
        receiptId: string
        storeName: string
        settlementDate: string | null
        participantName: string
        settlementAmount: number
        requestStatuses: string[]
        settlementRequestIds: string[]
        menuNames: string[]
        completedAtValues: string[]
      }
    >()

    requests.forEach((request) => {
      const receipt = receiptMap.get(request.receipt_id)
      const store = receipt?.store_id ? storeMap.get(receipt.store_id) : null
      const participant = participantMap.get(request.participant_id)
      const menu = menuMap.get(`${request.receipt_id}:${request.menu_item_id}`)
      const result = resultMap.get(request.settlement_request_id)
      const groupKey = `${request.receipt_id}:${request.participant_id}`
      const existingPerson = personMap.get(groupKey)
      const menuName = menu?.menu_name ?? "미확인 메뉴"

      if (existingPerson) {
        existingPerson.settlementAmount += request.requested_amount
        existingPerson.requestStatuses.push(request.request_status)
        existingPerson.settlementRequestIds.push(request.settlement_request_id)
        if (!existingPerson.menuNames.includes(menuName)) {
          existingPerson.menuNames.push(menuName)
        }
        if (result?.completed_at) {
          existingPerson.completedAtValues.push(result.completed_at)
        }
        return
      }

      personMap.set(groupKey, {
        receiptId: request.receipt_id,
        storeName: store?.store_name ?? "미확인 가게",
        settlementDate: receipt?.registered_at ?? null,
        participantName: participant?.name ?? "미확인 참여자",
        settlementAmount: request.requested_amount,
        requestStatuses: [request.request_status],
        settlementRequestIds: [request.settlement_request_id],
        menuNames: [menuName],
        completedAtValues: result?.completed_at ? [result.completed_at] : [],
      })
    })

    logSupabaseSuccess("select", "settlement-history")

    return Array.from(personMap.entries())
      .map(([groupKey, person]) => {
        const completed = person.requestStatuses.every(isSettlementRequestCompleted)
        const requestStatus = completed ? "PAID" : "PENDING"
        const completedAt = completed
          ? person.completedAtValues
              .slice()
              .sort((first, second) => Date.parse(second) - Date.parse(first))[0] ?? null
          : null

        return {
          settlementResultId: groupKey,
          settlementRequestIds: person.settlementRequestIds,
          receiptId: person.receiptId,
          storeName: person.storeName,
          settlementDate: person.settlementDate,
          menuName: person.menuNames.join(", "),
          menuNames: person.menuNames,
          participantName: person.participantName,
          settlementAmount: person.settlementAmount,
          requestStatus,
          transferStatus: requestStatus,
          completed,
          completedAt,
        }
      })
      .sort((first, second) => {
        const firstTime = Date.parse(first.settlementDate ?? first.completedAt ?? "")
        const secondTime = Date.parse(second.settlementDate ?? second.completedAt ?? "")

        return (Number.isFinite(secondTime) ? secondTime : 0)
          - (Number.isFinite(firstTime) ? firstTime : 0)
      })
  } catch (error) {
    logSupabaseFailure("select", error)
    throw error
  }
}

export async function updateSettlementStatus(
  settlementResultIds: string | string[],
  requestStatus: SettlementPaymentStatus,
) {
  if (!supabase) {
    logSupabaseNotConfigured()
    throw new Error("Supabase client is not configured.")
  }

  const targetIds = Array.isArray(settlementResultIds) ? settlementResultIds : [settlementResultIds]
  const logId = targetIds.join(",")
  const completed = isSettlementRequestCompleted(requestStatus)
  const completedAt = completed ? new Date().toISOString() : null
  const resultPayload = {
    transfer_status: requestStatus,
    completed,
    completed_at: completedAt,
  }
  const requestPayload = {
    request_status: requestStatus,
  }

  const { error: requestError } = await supabase
    .from("settlement_requests")
    .update(requestPayload)
    .in("settlement_request_id", targetIds)

  if (requestError) {
    logSupabaseTableFailure(
      "update",
      "settlement_requests",
      requestError,
      { settlement_request_ids: targetIds, ...requestPayload },
      logId,
    )
    throw requestError
  }

  const { data, error } = await supabase
    .from("settlement_results")
    .update(resultPayload)
    .in("settlement_result_id", targetIds)
    .select("settlement_result_id,transfer_status,completed,completed_at")

  if (error) {
    logSupabaseTableFailure(
      "update",
      "settlement_results",
      error,
      { settlement_result_ids: targetIds, ...resultPayload },
      logId,
    )
    throw error
  }

  logSupabaseSuccess("update", logId)
  const firstUpdatedRow = Array.isArray(data) ? data[0] : data

  return {
    settlement_result_id: firstUpdatedRow?.settlement_result_id ?? targetIds[0],
    transfer_status: firstUpdatedRow?.transfer_status ?? requestStatus,
    completed: firstUpdatedRow?.completed ?? completed,
    completed_at: firstUpdatedRow?.completed_at ?? completedAt,
    request_status: requestStatus,
  } as {
    settlement_result_id: string
    request_status: string
    transfer_status: string
    completed: boolean
    completed_at: string | null
  }
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
