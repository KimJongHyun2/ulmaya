import type { MenuItem, ReceiptInfo } from "@/types/receipt"
import type { Participant } from "@/types/participants"
import type { SettlementItem } from "@/types/settlement"

export type SettlementSessionStatus = "draft" | "calculated" | "shared" | "done"

export interface SettlementSession {
  id: string
  receiptInfo: ReceiptInfo
  menuItems: MenuItem[]
  selectedParticipants: Participant[]
  settlements: SettlementItem[]
  status: SettlementSessionStatus
  createdAt: number
  updatedAt: number
}

export interface SettlementSessionCreateInput {
  receiptInfo: ReceiptInfo
  menuItems: MenuItem[]
  selectedParticipants: Participant[]
  settlements: SettlementItem[]
  status?: SettlementSessionStatus
}

export interface SettlementSessionPatch {
  receiptInfo?: ReceiptInfo
  menuItems?: MenuItem[]
  selectedParticipants?: Participant[]
  settlements?: SettlementItem[]
  status?: SettlementSessionStatus
  updatedAt?: number
}
