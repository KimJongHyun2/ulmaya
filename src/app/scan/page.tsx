"use client"

import { useRouter } from "next/navigation"
import MobileAppShell from "@/components/common/mobile-app-shell"
import OcrProcessingScreen from "@/components/receipt/ocr-processing-screen"

export default function ScanPage() {
  const router = useRouter()

  return (
    <MobileAppShell>
      <OcrProcessingScreen onComplete={() => router.push("/receipt")} />
    </MobileAppShell>
  )
}
