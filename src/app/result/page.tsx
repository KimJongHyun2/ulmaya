"use client"

import { useRouter } from "next/navigation"
import MobileAppShell from "@/components/common/mobile-app-shell"
import SettlementResultScreen from "@/components/result/settlement-result-screen"
import { useSettlementFlow } from "@/features/settlement/flow-context"
import { RECEIPT_INFO } from "@/lib/mock-data"

export default function ResultPage() {
  const router = useRouter()
  const { settlements, menuItems } = useSettlementFlow()

  return (
    <MobileAppShell>
      <SettlementResultScreen
        receiptInfo={RECEIPT_INFO}
        settlements={settlements}
        menuItems={menuItems}
        onBack={() => router.push("/assign")}
        onShare={() => router.push("/share")}
      />
    </MobileAppShell>
  )
}
