import type { Participant } from "@/types/participants"

export function toggleParticipant(
  selected: Participant[],
  target: Participant,
): Participant[] {
  if (selected.some((participant) => participant.id === target.id)) {
    return selected.filter((participant) => participant.id !== target.id)
  }

  return [...selected, target]
}

export function isParticipantSelected(
  selected: Participant[],
  participantId: number,
): boolean {
  return selected.some((participant) => participant.id === participantId)
}

export function filterParticipants(
  participants: Participant[],
  query: string,
): Participant[] {
  const normalized = query.trim().toLowerCase()

  if (!normalized) {
    return participants
  }

  return participants.filter((participant) =>
    participant.name.toLowerCase().includes(normalized),
  )
}
