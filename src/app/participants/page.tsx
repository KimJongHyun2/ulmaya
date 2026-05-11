"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import MobileAppShell from "@/components/common/mobile-app-shell"
import ParticipantScreen from "@/components/participants/participant-screen"
import { useSettlementFlow } from "@/features/settlement/flow-context"
import { useUser } from "@/features/auth/user-context"
import { DUMMY_FRIENDS, FREQUENT_FRIENDS } from "@/lib/mock-data"
import type { Participant } from "@/types/participants"

export default function ParticipantsPage() {
  const router = useRouter()
  const { user } = useUser()
  const { selectedParticipants, setSelectedParticipants } = useSettlementFlow()

  useEffect(() => {
    // If user is logged in and no participants are selected yet, add the user as "Me"
    if (user && selectedParticipants.length === 0) {
      const me: Participant = {
        id: user.id, // Use Kakao ID
        name: `${user.nickname} (나)`,
        avatar: "👤", // Default avatar for me
        imageUrl: user.profile_image,
      }
      setSelectedParticipants([me])
    }
  }, [user, setSelectedParticipants, selectedParticipants.length])

  return (
    <MobileAppShell>
      <ParticipantScreen
        allParticipants={DUMMY_FRIENDS}
        frequentParticipants={FREQUENT_FRIENDS}
        selectedParticipants={selectedParticipants}
        setSelectedParticipants={setSelectedParticipants}
        onBack={() => router.push("/receipt")}
        onNext={() => router.push("/assign")}
      />
    </MobileAppShell>
  )
}
