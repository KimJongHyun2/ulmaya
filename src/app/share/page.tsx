"use client"

import { useRouter } from "next/navigation"
import MobileAppShell from "@/components/common/mobile-app-shell"
import KakaoShareScreen from "@/components/share/kakao-share-screen"
import { useSettlementFlow } from "@/features/settlement/flow-context"

export default function SharePage() {
  const router = useRouter()
  const { settlements, receiptInfo, markSent, resetFlow } = useSettlementFlow()

  const handleDone = () => {
    resetFlow()
    router.push("/")
  }

  return (
    <MobileAppShell>
      <KakaoShareScreen
        receiptInfo={receiptInfo}
        settlements={settlements}
        onSendComplete={markSent}
        onBack={() => router.push("/result")}
        onDone={handleDone}
      />
    </MobileAppShell>
  )
}
