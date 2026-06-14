"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowLeft, CalendarDays, ReceiptText, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import MobileAppShell from "@/components/common/mobile-app-shell"
import {
  listSettlementHistoryCards,
  type SettlementHistoryItem,
  updateSettlementStatus,
} from "@/features/settlement/repository"
import {
  getNextSettlementRequestStatus,
  getSettlementRequestDisplayStatus,
  isSettlementRequestCompleted,
} from "@/features/settlement/status"

interface SettlementHistoryGroup {
  receiptId: string
  storeName: string
  settlementDate: string | null
  totalAmount: number
  completedCount: number
  items: SettlementHistoryItem[]
}

function formatAmount(value: number) {
  return `${value.toLocaleString()}원`
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "날짜 정보 없음"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function normalizeInviteStatus(status: string | undefined) {
  if (!status) {
    return "대기"
  }

  if (status === "대기" || status.toUpperCase() === "PENDING") {
    return "대기"
  }

  return status
}

function StatusBadge({
  status,
  disabled,
  onClick,
}: {
  status: string | undefined
  disabled: boolean
  onClick: () => void
}) {
  const normalizedStatus = getSettlementRequestDisplayStatus(status)
  const isComplete = isSettlementRequestCompleted(status)

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-7 items-center rounded-full px-3 text-xs font-semibold transition-transform active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 ${
        isComplete
          ? "bg-emerald-100 text-emerald-700"
          : "bg-amber-100 text-amber-700"
      }`}
    >
      {normalizedStatus}
    </button>
  )
}

function groupHistoryItems(items: SettlementHistoryItem[]) {
  const groupMap = new Map<string, SettlementHistoryGroup>()

  items.forEach((item) => {
    const existingGroup = groupMap.get(item.receiptId)

    if (existingGroup) {
      existingGroup.items.push(item)
      existingGroup.totalAmount += item.settlementAmount
      existingGroup.completedCount += isSettlementRequestCompleted(item.requestStatus) ? 1 : 0
      return
    }

    groupMap.set(item.receiptId, {
      receiptId: item.receiptId,
      storeName: item.storeName,
      settlementDate: item.settlementDate ?? item.completedAt,
      totalAmount: item.settlementAmount,
      completedCount: isSettlementRequestCompleted(item.requestStatus) ? 1 : 0,
      items: [item],
    })
  })

  return Array.from(groupMap.values()).sort((first, second) => {
    const firstTime = Date.parse(first.settlementDate ?? "")
    const secondTime = Date.parse(second.settlementDate ?? "")

    return (Number.isFinite(secondTime) ? secondTime : 0)
      - (Number.isFinite(firstTime) ? firstTime : 0)
  })
}

export default function SettlementHistoryPage() {
  const router = useRouter()
  const [items, setItems] = useState<SettlementHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const [actionErrorMessage, setActionErrorMessage] = useState("")
  const [updatingIds, setUpdatingIds] = useState<string[]>([])

  const groups = useMemo(() => groupHistoryItems(items), [items])

  const loadHistory = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage("")
    setActionErrorMessage("")

    try {
      const nextItems = await listSettlementHistoryCards()
      setItems(nextItems)
    } catch (error) {
      console.error("[settlement history] Failed to load history.", error)
      setErrorMessage("정산 기록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.")
      setItems([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  const handleToggleStatus = async (item: SettlementHistoryItem) => {
    if (updatingIds.includes(item.settlementResultId)) {
      return
    }

    const nextStatus = getNextSettlementRequestStatus(item.requestStatus)
    const previousItems = items
    const completed = isSettlementRequestCompleted(nextStatus)
    const completedAt = completed ? new Date().toISOString() : null

    setActionErrorMessage("")
    setUpdatingIds((prev) => [...prev, item.settlementResultId])
    setItems((prev) =>
      prev.map((historyItem) =>
        historyItem.settlementResultId === item.settlementResultId
          ? {
              ...historyItem,
              requestStatus: nextStatus,
              transferStatus: nextStatus,
              completed,
              completedAt,
            }
          : historyItem,
      ),
    )

    try {
      const updatedStatus = await updateSettlementStatus(
        item.settlementResultId,
        nextStatus,
      )

      setItems((prev) =>
        prev.map((historyItem) =>
          historyItem.settlementResultId === item.settlementResultId
            ? {
                ...historyItem,
                requestStatus: updatedStatus.request_status,
                transferStatus: updatedStatus.transfer_status,
                completed: updatedStatus.completed,
                completedAt: updatedStatus.completed_at,
              }
            : historyItem,
        ),
      )
    } catch (error) {
      console.error("[settlement history] Failed to update status.", error)
      setItems(previousItems)
      setActionErrorMessage("송금 상태를 변경하지 못했습니다. 잠시 후 다시 시도해주세요.")
    } finally {
      setUpdatingIds((prev) =>
        prev.filter((updatingId) => updatingId !== item.settlementResultId),
      )
    }
  }

  return (
    <MobileAppShell>
      <div className="flex min-h-screen flex-col bg-background">
        <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-muted"
              aria-label="이전 화면"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold text-foreground">정산 관리</h1>
              <p className="text-xs text-muted-foreground">
                완료된 송금과 대기 중인 정산을 확인합니다.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadHistory()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-muted disabled:opacity-50"
              disabled={isLoading}
              aria-label="새로고침"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        <main className="flex-1 px-4 py-5">
          {isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="h-36 animate-pulse rounded-lg border border-border bg-card"
                />
              ))}
            </div>
          ) : errorMessage ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-8 text-center">
              <p className="text-sm font-medium text-destructive">{errorMessage}</p>
              <button
                type="button"
                onClick={() => void loadHistory()}
                className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                다시 불러오기
              </button>
            </div>
          ) : groups.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card px-4 py-12 text-center">
              <ReceiptText className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium text-foreground">
                아직 정산 기록이 없습니다.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {actionErrorMessage && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                  {actionErrorMessage}
                </div>
              )}

              {groups.map((group) => (
                <section
                  key={group.receiptId}
                  className="overflow-hidden rounded-lg border border-border bg-card shadow-sm"
                >
                  <div className="border-b border-border bg-muted/40 px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-base font-bold text-foreground">
                          {group.storeName}
                        </h2>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CalendarDays className="h-3.5 w-3.5" />
                          <span>{formatDate(group.settlementDate)}</span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs text-muted-foreground">합계</p>
                        <p className="text-sm font-bold text-foreground">
                          {formatAmount(group.totalAmount)}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {group.completedCount}/{group.items.length}건 완료
                    </p>
                    <p className="mt-1 text-xs font-medium text-foreground">
                      {group.completedCount === group.items.length
                        ? "전체 정산완료"
                        : "송금대기"}
                    </p>
                  </div>

                  <div className="divide-y divide-border">
                    {group.items.map((item) => (
                      <div
                        key={item.settlementResultId}
                        className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {item.menuName}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {item.participantName} · 초대 {normalizeInviteStatus(item.inviteStatus)} ·{" "}
                            {isSettlementRequestCompleted(item.requestStatus) ? "완료" : "송금대기"}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          <p className="text-sm font-bold text-foreground">
                            {formatAmount(item.settlementAmount)}
                          </p>
                          <StatusBadge
                            status={item.requestStatus}
                            disabled={updatingIds.includes(item.settlementResultId)}
                            onClick={() => void handleToggleStatus(item)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </main>
      </div>
    </MobileAppShell>
  )
}
