"use client"

import MobileAppShell from "@/components/common/mobile-app-shell"
import OcrProcessingScreen from "@/components/receipt/ocr-processing-screen"

export default function ScanPage() {
  return (
    <MobileAppShell>
      <OcrProcessingScreen />
    </MobileAppShell>
  )
}
