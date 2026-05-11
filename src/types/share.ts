import type { SettlementItem } from "@/types/settlement"

export type ShareChannel = "kakao" | "copy" | "link" | "sms"

export interface SharePayload {
  title: string
  totalAmount: number
  settlements: SettlementItem[]
}
