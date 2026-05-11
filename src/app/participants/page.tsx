"use client"

import { useRouter } from "next/navigation"
import MobileAppShell from "@/components/common/mobile-app-shell"
import ParticipantScreen from "@/components/participants/participant-screen"
import { useSettlementFlow } from "@/features/settlement/flow-context"
import { DUMMY_FRIENDS, FREQUENT_FRIENDS } from "@/lib/mock-data"

export default function ParticipantsPage() {
  const router = useRouter()
  const { selectedParticipants, setSelectedParticipants } = useSettlementFlow()

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
