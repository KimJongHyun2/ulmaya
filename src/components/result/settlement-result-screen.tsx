"use client"

import { ArrowLeft, Copy, Link2, MessageSquare, Users } from "lucide-react"
import type { MenuItem, ReceiptInfo } from "@/types/receipt"
import type { SettlementItem } from "@/types/settlement"

interface SettlementResultScreenProps {
  receiptInfo: ReceiptInfo
  settlements: SettlementItem[]
  menuItems: MenuItem[]
  onBack: () => void
  onShare: () => void
}

export default function SettlementResultScreen({
  receiptInfo,
  settlements,
  menuItems,
  onBack,
  onShare,
}: SettlementResultScreenProps) {
  const total = menuItems.reduce((sum, item) => sum + item.price, 0)

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-4 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold">정산 결과</h2>
        </div>
      </div>

      {/* Summary Card */}
      <div className="px-4 py-4">
        <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl p-5 border border-primary/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <span className="font-medium">{settlements.length}명 참여</span>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">총 금액</p>
              <p className="text-2xl font-bold text-foreground">
                {total.toLocaleString()}원
              </p>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            {receiptInfo.storeName} • {receiptInfo.summaryDate}
          </div>
        </div>
      </div>

      {/* Settlement Cards */}
      <div className="flex-1 px-4 pb-4">
        <h4 className="text-sm font-semibold text-muted-foreground mb-3 px-1">
          개인별 정산 금액
        </h4>
        <div className="space-y-3">
          {settlements.map((settlement) => (
            <div
              key={settlement.participant.id}
              className="bg-card rounded-2xl p-4 shadow-sm border border-border"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center text-xl">
                  {settlement.participant.avatar}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">
                    {settlement.participant.name}
                  </p>
                  <p className="text-xl font-bold text-primary">
                    {settlement.amount.toLocaleString()}원
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    settlement.status === "sent"
                      ? "bg-green-100 text-green-700"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {settlement.status === "sent" ? "전송완료" : "미전송"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="sticky bottom-0 p-4 bg-background border-t border-border space-y-3">
        {/* Main CTA */}
        <button
          onClick={onShare}
          className="w-full py-4 bg-kakao text-kakao-foreground rounded-2xl font-semibold text-lg flex items-center justify-center gap-3 active:scale-[0.98] transition-transform"
        >
          <MessageSquare className="w-6 h-6" />
          카카오톡으로 정산 보내기
        </button>

        {/* Secondary Actions */}
        <div className="flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-card border border-border rounded-xl text-foreground font-medium">
            <Copy className="w-5 h-5" />
            복사
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-card border border-border rounded-xl text-foreground font-medium">
            <Link2 className="w-5 h-5" />
            링크 공유
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-card border border-border rounded-xl text-foreground font-medium">
            <MessageSquare className="w-5 h-5" />
            문자
          </button>
        </div>
      </div>
    </div>
  )
}
