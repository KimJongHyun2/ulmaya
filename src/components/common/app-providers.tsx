"use client"

import type { ReactNode } from "react"
import { SettlementFlowProvider } from "@/features/settlement/flow-context"

export default function AppProviders({ children }: { children: ReactNode }) {
  return <SettlementFlowProvider>{children}</SettlementFlowProvider>
}
