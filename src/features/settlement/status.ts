export type SettlementPaymentStatus = "PENDING" | "PAID"

export const SETTLEMENT_PENDING_STATUS: SettlementPaymentStatus = "PENDING"
export const SETTLEMENT_PAID_STATUS: SettlementPaymentStatus = "PAID"

const COMPLETED_REQUEST_STATUSES = new Set(["PAID", "COMPLETED"])

function normalizeStatusValue(status: string | null | undefined) {
  return status?.trim().toUpperCase() ?? ""
}

export function isSettlementRequestCompleted(status: string | null | undefined) {
  return COMPLETED_REQUEST_STATUSES.has(normalizeStatusValue(status))
}

export function getSettlementRequestDisplayStatus(status: string | null | undefined) {
  return isSettlementRequestCompleted(status) ? "완료" : "송금대기"
}

export function getNextSettlementRequestStatus(status: string | null | undefined): SettlementPaymentStatus {
  return isSettlementRequestCompleted(status) ? SETTLEMENT_PENDING_STATUS : SETTLEMENT_PAID_STATUS
}

export function getSettlementResultTransferStatus(requestStatus: SettlementPaymentStatus) {
  return requestStatus
}
