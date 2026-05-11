"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react"
import { INITIAL_MENU_ITEMS } from "@/lib/mock-data"
import { calculateSettlements } from "@/features/settlement/calculator"
import type { MenuItem } from "@/types/receipt"
import type { Participant } from "@/types/participants"
import type { SettlementItem } from "@/types/settlement"

interface SettlementFlowContextValue {
  menuItems: MenuItem[]
  setMenuItems: Dispatch<SetStateAction<MenuItem[]>>
  selectedParticipants: Participant[]
  setSelectedParticipants: Dispatch<SetStateAction<Participant[]>>
  settlements: SettlementItem[]
  calculate: () => void
  markSent: (participantId: number) => void
  resetFlow: () => void
}

const SettlementFlowContext = createContext<SettlementFlowContextValue | null>(null)

export function SettlementFlowProvider({ children }: { children: React.ReactNode }) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>(INITIAL_MENU_ITEMS)
  const [selectedParticipants, setSelectedParticipants] = useState<Participant[]>([])
  const [settlements, setSettlements] = useState<SettlementItem[]>([])

  const calculate = useCallback(() => {
    setSettlements(calculateSettlements(selectedParticipants, menuItems))
  }, [menuItems, selectedParticipants])

  const markSent = useCallback((participantId: number) => {
    setSettlements((prev) =>
      prev.map((settlement) =>
        settlement.participant.id === participantId
          ? { ...settlement, status: "sent" }
          : settlement,
      ),
    )
  }, [])

  const resetFlow = useCallback(() => {
    setMenuItems(INITIAL_MENU_ITEMS)
    setSelectedParticipants([])
    setSettlements([])
  }, [])

  const value = useMemo(
    () => ({
      menuItems,
      setMenuItems,
      selectedParticipants,
      setSelectedParticipants,
      settlements,
      calculate,
      markSent,
      resetFlow,
    }),
    [calculate, markSent, menuItems, resetFlow, selectedParticipants, settlements],
  )

  return (
    <SettlementFlowContext.Provider value={value}>
      {children}
    </SettlementFlowContext.Provider>
  )
}

export function useSettlementFlow() {
  const context = useContext(SettlementFlowContext)

  if (!context) {
    throw new Error("useSettlementFlow must be used within SettlementFlowProvider")
  }

  return context
}
