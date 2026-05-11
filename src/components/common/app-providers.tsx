"use client"

import { useEffect, type ReactNode } from "react"
import { SettlementFlowProvider } from "@/features/settlement/flow-context"
import { UserProvider } from "@/features/auth/user-context"
import { initKakao } from "@/lib/kakao"

export default function AppProviders({ children }: { children: ReactNode }) {
  useEffect(() => {
    initKakao()
  }, [])

  return (
    <UserProvider>
      <SettlementFlowProvider>{children}</SettlementFlowProvider>
    </UserProvider>
  )
}
