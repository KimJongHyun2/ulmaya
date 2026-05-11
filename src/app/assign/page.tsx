"use client"

import { useRouter } from "next/navigation"
import MobileAppShell from "@/components/common/mobile-app-shell"
import MenuAssignmentScreen from "@/components/assignment/menu-assignment-screen"
import { useSettlementFlow } from "@/features/settlement/flow-context"

export default function AssignPage() {
  const router = useRouter()
  const { menuItems, setMenuItems, selectedParticipants, calculate } = useSettlementFlow()

  const handleCalculate = () => {
    calculate()
    router.push("/result")
  }

  return (
    <MobileAppShell>
      <MenuAssignmentScreen
        menuItems={menuItems}
        setMenuItems={setMenuItems}
        participants={selectedParticipants}
        onCalculate={handleCalculate}
        onBack={() => router.push("/participants")}
      />
    </MobileAppShell>
  )
}
