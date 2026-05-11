import type { MenuItem } from "@/types/receipt"
import type { Participant } from "@/types/participants"
import type { SettlementItem } from "@/types/settlement"

export function calculateSettlements(
  participants: Participant[],
  menuItems: MenuItem[],
): SettlementItem[] {
  if (participants.length === 0) {
    return []
  }

  const amounts: Record<string, number> = {}

  participants.forEach((participant) => {
    amounts[participant.name] = 0
  })

  menuItems.forEach((item) => {
    if (item.isNbbang || item.assignedTo.includes("전체")) {
      const perPerson = item.price / participants.length
      participants.forEach((participant) => {
        amounts[participant.name] += perPerson
      })
      return
    }

    if (item.assignedTo.length === 0) {
      return
    }

    const perPerson = item.price / item.assignedTo.length
    item.assignedTo.forEach((name) => {
      if (amounts[name] !== undefined) {
        amounts[name] += perPerson
      }
    })
  })

  return participants.map((participant) => ({
    participant,
    amount: Math.round(amounts[participant.name]),
    status: "pending",
  }))
}
