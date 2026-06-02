"use client"

import {
  createContext,
  useEffect,
  useCallback,
  useContext,
  useMemo,
  useState,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react"
import { INITIAL_MENU_ITEMS, RECEIPT_INFO } from "@/lib/mock-data"
import { calculateSettlements } from "@/features/settlement/calculator"
import {
  createSettlementSession,
  loadSettlementSession,
  saveSessionMenuItems,
  saveSessionParticipants,
  saveSessionReceiptInfo,
  saveSessionSettlements,
  updateSessionStatus,
} from "@/features/settlement/repository"
import type { MenuItem, ReceiptInfo } from "@/types/receipt"
import type { Participant } from "@/types/participants"
import type { SettlementItem } from "@/types/settlement"

interface SettlementFlowContextValue {
  sessionId: string | null
  isReady: boolean
  receiptInfo: ReceiptInfo
  setReceiptInfo: Dispatch<SetStateAction<ReceiptInfo>>
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
const SESSION_ID_KEY = "ulmaya_settlement_session_id"

function resolveStateUpdate<T>(nextValue: SetStateAction<T>, currentValue: T) {
  return typeof nextValue === "function"
    ? (nextValue as (previousState: T) => T)(currentValue)
    : nextValue
}

export function SettlementFlowProvider({ children }: { children: React.ReactNode }) {
  const [receiptInfo, setReceiptInfo] = useState<ReceiptInfo>(RECEIPT_INFO)
  const [menuItems, setMenuItems] = useState<MenuItem[]>(INITIAL_MENU_ITEMS)
  const [selectedParticipants, setSelectedParticipants] = useState<Participant[]>([])
  const [settlements, setSettlements] = useState<SettlementItem[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const bootstrapRef = useRef(false)

  useEffect(() => {
    if (bootstrapRef.current) {
      return
    }

    bootstrapRef.current = true

    let isMounted = true

    const initializeSession = async () => {
      const savedSessionId = typeof window === "undefined" ? null : localStorage.getItem(SESSION_ID_KEY)

      if (savedSessionId) {
        const existingSession = await loadSettlementSession(savedSessionId)

        if (existingSession && isMounted) {
          setSessionId(existingSession.id)
          setReceiptInfo(existingSession.receiptInfo)
          setMenuItems(existingSession.menuItems)
          setSelectedParticipants(existingSession.selectedParticipants)
          setSettlements(existingSession.settlements)
          setIsReady(true)
          return
        }
      }

      const createdSession = await createSettlementSession({
        receiptInfo: RECEIPT_INFO,
        menuItems: INITIAL_MENU_ITEMS,
        selectedParticipants: [],
        settlements: [],
        status: "draft",
      })

      if (!isMounted) {
        return
      }

      setSessionId(createdSession.id)
      setReceiptInfo(createdSession.receiptInfo)
      setMenuItems(createdSession.menuItems)
      setSelectedParticipants(createdSession.selectedParticipants)
      setSettlements(createdSession.settlements)
      setIsReady(true)

      if (typeof window !== "undefined") {
        localStorage.setItem(SESSION_ID_KEY, createdSession.id)
      }
    }

    void initializeSession()

    return () => {
      isMounted = false
    }
  }, [])

  const persistSessionId = useCallback((nextSessionId: string | null) => {
    setSessionId(nextSessionId)

    if (typeof window === "undefined") {
      return
    }

    if (nextSessionId) {
      localStorage.setItem(SESSION_ID_KEY, nextSessionId)
      return
    }

    localStorage.removeItem(SESSION_ID_KEY)
  }, [])

  const persistReceiptInfo = useCallback(
    async (nextReceiptInfo: ReceiptInfo) => {
      if (!sessionId) {
        return
      }

      await saveSessionReceiptInfo(sessionId, nextReceiptInfo)
    },
    [sessionId],
  )

  const persistMenuItems = useCallback(
    async (nextMenuItems: MenuItem[]) => {
      if (!sessionId) {
        return
      }

      await saveSessionMenuItems(sessionId, nextMenuItems)
    },
    [sessionId],
  )

  const persistSelectedParticipants = useCallback(
    async (nextParticipants: Participant[]) => {
      if (!sessionId) {
        return
      }

      await saveSessionParticipants(sessionId, nextParticipants)
    },
    [sessionId],
  )

  const persistSettlements = useCallback(
    async (nextSettlements: SettlementItem[]) => {
      if (!sessionId) {
        return
      }

      await saveSessionSettlements(sessionId, nextSettlements)
    },
    [sessionId],
  )

  const setReceiptInfoState: Dispatch<SetStateAction<ReceiptInfo>> = useCallback(
    (nextValue) => {
      setReceiptInfo((currentValue) => {
        const nextState = resolveStateUpdate(nextValue, currentValue)
        void persistReceiptInfo(nextState)
        return nextState
      })
    },
    [persistReceiptInfo],
  )

  const setMenuItemsState: Dispatch<SetStateAction<MenuItem[]>> = useCallback(
    (nextValue) => {
      setMenuItems((currentValue) => {
        const nextState = resolveStateUpdate(nextValue, currentValue)
        void persistMenuItems(nextState)
        return nextState
      })
    },
    [persistMenuItems],
  )

  const setSelectedParticipantsState: Dispatch<SetStateAction<Participant[]>> = useCallback(
    (nextValue) => {
      setSelectedParticipants((currentValue) => {
        const nextState = resolveStateUpdate(nextValue, currentValue)
        void persistSelectedParticipants(nextState)
        return nextState
      })
    },
    [persistSelectedParticipants],
  )

  const setSettlementsState = useCallback(
    (nextSettlements: SettlementItem[]) => {
      setSettlements(nextSettlements)
      void persistSettlements(nextSettlements)
    },
    [persistSettlements],
  )

  const calculate = useCallback(() => {
    const nextSettlements = calculateSettlements(selectedParticipants, menuItems)
    setSettlementsState(nextSettlements)

    if (sessionId) {
      void updateSessionStatus(sessionId, "calculated")
    }
  }, [menuItems, selectedParticipants, sessionId, setSettlementsState])

  const markSent = useCallback(
    (participantId: number) => {
      setSettlements((prev) => {
        const nextSettlements = prev.map((settlement) =>
          settlement.participant.id === participantId
            ? { ...settlement, status: "sent" }
            : settlement,
        )

        void persistSettlements(nextSettlements)

        if (sessionId) {
          void updateSessionStatus(sessionId, "shared")
        }

        return nextSettlements
      })
    },
    [persistSettlements, sessionId],
  )

  const resetFlow = useCallback(() => {
    void (async () => {
      const nextSession = await createSettlementSession({
        receiptInfo: RECEIPT_INFO,
        menuItems: INITIAL_MENU_ITEMS,
        selectedParticipants: [],
        settlements: [],
        status: "draft",
      })

      setReceiptInfo(RECEIPT_INFO)
      setMenuItems(INITIAL_MENU_ITEMS)
      setSelectedParticipants([])
      setSettlements([])
      persistSessionId(nextSession.id)
    })()
  }, [persistSessionId])

  const value = useMemo(
    () => ({
      sessionId,
      isReady,
      receiptInfo,
      setReceiptInfo: setReceiptInfoState,
      menuItems,
      setMenuItems: setMenuItemsState,
      selectedParticipants,
      setSelectedParticipants: setSelectedParticipantsState,
      settlements,
      calculate,
      markSent,
      resetFlow,
    }),
    [
      calculate,
      isReady,
      markSent,
      menuItems,
      receiptInfo,
      resetFlow,
      selectedParticipants,
      sessionId,
      settlements,
      setMenuItemsState,
      setReceiptInfoState,
      setSelectedParticipantsState,
    ],
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
