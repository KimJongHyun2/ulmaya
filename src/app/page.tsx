"use client"

import { useRouter } from "next/navigation"
import MobileAppShell from "@/components/common/mobile-app-shell"
import HomeScreen from "@/components/home/home-screen"

export default function HomePage() {
  const router = useRouter()

  return (
    <MobileAppShell>
      <HomeScreen
        onCameraClick={() => router.push("/scan")}
        onUploadClick={() => router.push("/scan")}
        onHistoryClick={() => router.push("/settlementHistory")}
      />
    </MobileAppShell>
  )
}
