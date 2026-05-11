"use client"

import { useRouter } from "next/navigation"
import MobileAppShell from "@/components/common/mobile-app-shell"
import OcrResultScreen from "@/components/receipt/ocr-result-screen"
import { useSettlementFlow } from "@/features/settlement/flow-context"
import { RECEIPT_INFO } from "@/lib/mock-data"

export default function ReceiptPage() {
  const router = useRouter()
  const { menuItems, setMenuItems } = useSettlementFlow()

  return (
    <MobileAppShell>
      <OcrResultScreen
        receiptInfo={RECEIPT_INFO}
        menuItems={menuItems}
        setMenuItems={setMenuItems}
        onBack={() => router.push("/")}
        onNext={() => router.push("/participants")}
      />
    </MobileAppShell>
  )
}
