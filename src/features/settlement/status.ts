export type SettlementPaymentStatus = "PENDING" | "PAID"

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
  return isSettlementRequestCompleted(status) ? "PENDING" : "PAID"
}
