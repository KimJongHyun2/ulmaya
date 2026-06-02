"use client"

import { useRouter } from "next/navigation"
import MobileAppShell from "@/components/common/mobile-app-shell"
import SettlementResultScreen from "@/components/result/settlement-result-screen"
import { useSettlementFlow } from "@/features/settlement/flow-context"

export default function ResultPage() {
  const router = useRouter()
  const { settlements, menuItems, receiptInfo } = useSettlementFlow()

  return (
    <MobileAppShell>
      <SettlementResultScreen
        receiptInfo={receiptInfo}
        settlements={settlements}
        menuItems={menuItems}
        onBack={() => router.push("/assign")}
        onShare={() => router.push("/share")}
      />
    </MobileAppShell>
  )
}
