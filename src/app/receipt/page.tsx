"use client"

import { useRouter } from "next/navigation"
import MobileAppShell from "@/components/common/mobile-app-shell"
import OcrResultScreen from "@/components/receipt/ocr-result-screen"
import { useSettlementFlow } from "@/features/settlement/flow-context"

export default function ReceiptPage() {
  const router = useRouter()
  const { receiptInfo, setReceiptInfo, menuItems, setMenuItems, isReady } = useSettlementFlow()

  if (!isReady) {
    return (
      <MobileAppShell>
        <div className="flex min-h-screen items-center justify-center text-muted-foreground">
          세션을 불러오는 중...
        </div>
      </MobileAppShell>
    )
  }

  return (
    <MobileAppShell>
      <OcrResultScreen
        receiptInfo={receiptInfo}
        menuItems={menuItems}
        setReceiptInfo={setReceiptInfo}
        setMenuItems={setMenuItems}
        onBack={() => router.push("/")}
        onNext={() => router.push("/participants")}
      />
    </MobileAppShell>
  )
}
