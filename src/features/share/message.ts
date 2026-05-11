import type { SharePayload } from "@/types/share"

export function buildShareMessage(payload: SharePayload): string {
  const lines = payload.settlements.map(
    (item) => `${item.participant.name}: ${item.amount.toLocaleString()}원`,
  )

  return [
    payload.title,
    ...lines,
    `총 금액: ${payload.totalAmount.toLocaleString()}원`,
  ].join("\n")
}
