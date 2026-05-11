import type { Participant } from "@/types/participants"

export type SettlementStatus = "pending" | "sent"

export interface SettlementItem {
  participant: Participant
  amount: number
  status: SettlementStatus
}
