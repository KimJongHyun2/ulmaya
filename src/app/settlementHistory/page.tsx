"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import MobileAppShell from "@/components/common/mobile-app-shell"
import {
  listSettlementHistory,
  type SettlementHistoryItem,
} from "@/features/settlement/repository"

function formatAmount(value: number) {
  return `${value.toLocaleString()}원`
}

function formatDate(value: string | null) {
  if (!value) {
    return "-"
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

export default function SettlementHistoryPage() {
  const router = useRouter()
  const [items, setItems] = useState<SettlementHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadHistory = async () => {
    setIsLoading(true)
    const nextItems = await listSettlementHistory()
    setItems(nextItems)
    setIsLoading(false)
  }

  useEffect(() => {
    void loadHistory()
  }, [])

  return (
    <MobileAppShell>
      <div className="flex min-h-screen flex-col bg-background">
        <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-4 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted"
              aria-label="이전 화면"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold text-foreground">정산 기록</h1>
              <p className="text-xs text-muted-foreground">
                송금 완료 여부와 완료 시각을 확인합니다.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadHistory()}
              className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted"
              aria-label="새로고침"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        <main className="flex-1 px-4 py-5">
          {isLoading ? (
            <div className="rounded-lg border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
              정산 기록을 불러오는 중입니다.
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-lg border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
              아직 저장된 정산 기록이 없습니다.
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-sm">
                  <thead className="bg-muted/70 text-left text-xs font-semibold text-muted-foreground">
                    <tr>
                      <th className="px-3 py-3">영수증</th>
                      <th className="px-3 py-3">메뉴명</th>
                      <th className="px-3 py-3">참여자명</th>
                      <th className="px-3 py-3 text-right">정산금액</th>
                      <th className="px-3 py-3">송금상태</th>
                      <th className="px-3 py-3">완료여부</th>
                      <th className="px-3 py-3">완료일시</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr
                        key={item.settlementResultId}
                        className="border-t border-border"
                      >
                        <td className="px-3 py-3 font-medium text-foreground">
                          {item.storeName}
                        </td>
                        <td className="px-3 py-3 text-foreground">{item.menuName}</td>
                        <td className="px-3 py-3 text-foreground">
                          {item.participantName}
                        </td>
                        <td className="px-3 py-3 text-right font-semibold text-foreground">
                          {formatAmount(item.settlementAmount)}
                        </td>
                        <td className="px-3 py-3">
                          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
                            {item.transferStatus}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-foreground">
                          {item.completed ? "완료" : "미완료"}
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">
                          {formatDate(item.completedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </MobileAppShell>
  )
}
