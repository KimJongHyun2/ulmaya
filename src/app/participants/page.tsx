"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import MobileAppShell from "@/components/common/mobile-app-shell"
import ParticipantScreen from "@/components/participants/participant-screen"
import { useUser } from "@/features/auth/user-context"
import { useSettlementFlow } from "@/features/settlement/flow-context"
import type { Participant } from "@/types/participants"

export default function ParticipantsPage() {
  const router = useRouter()
  const { user } = useUser()
  const { selectedParticipants, setSelectedParticipants } = useSettlementFlow()

  useEffect(() => {
    if (user && selectedParticipants.length === 0) {
      const me: Participant = {
        id: user.id,
        name: `${user.nickname} (나)`,
        avatar: "🙂",
        imageUrl: user.profile_image,
      }
      setSelectedParticipants([me])
    }
  }, [user, selectedParticipants.length, setSelectedParticipants])

  return (
    <MobileAppShell>
      <ParticipantScreen
        allParticipants={[]}
        frequentParticipants={[]}
        selectedParticipants={selectedParticipants}
        setSelectedParticipants={setSelectedParticipants}
        onBack={() => router.push("/receipt")}
        onNext={() => router.push("/assign")}
      />
    </MobileAppShell>
  )
}
