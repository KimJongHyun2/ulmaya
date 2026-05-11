"use client"

import { useState } from "react"
import { ArrowLeft, Check, Send } from "lucide-react"
import type { ReceiptInfo } from "@/types/receipt"
import type { SettlementItem } from "@/types/settlement"
import { shareToKakao } from "@/lib/kakao"

interface KakaoShareScreenProps {
  receiptInfo: ReceiptInfo
  settlements: SettlementItem[]
  onSendComplete: (participantId: number) => void
  onBack: () => void
  onDone: () => void
}

export default function KakaoShareScreen({
  receiptInfo,
  settlements,
  onSendComplete,
  onBack,
  onDone,
}: KakaoShareScreenProps) {
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState("")
  const [sentIds, setSentIds] = useState<number[]>([])

  const handleSendToKakao = (settlement: SettlementItem) => {
    shareToKakao({
      title: `${receiptInfo.storeName} 정산 요청`,
      description: `${settlement.participant.name}님의 정산 금액은 ${settlement.amount.toLocaleString()}원입니다.`,
      buttonText: "정산하기",
      link: window.location.origin, // 실제 서비스 시에는 정산 상세 페이지 링크가 들어갈 수 있습니다.
    })
    setSentIds((prev) => [...prev, settlement.participant.id])
    onSendComplete(settlement.participant.id)
    setToastMessage(`${settlement.participant.name}님에게 전송 완료!`)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 2000)
  }

  const handleSendAll = () => {
    const totalAmount = settlements.reduce((sum, s) => sum + s.amount, 0)
    shareToKakao({
      title: `${receiptInfo.storeName} 정산 요청`,
      description: `총 ${settlements.length}명의 정산이 진행 중입니다.\n총 금액: ${totalAmount.toLocaleString()}원`,
      buttonText: "전체 내역 보기",
      link: window.location.origin,
    })
    
    settlements.forEach((s) => {
      if (!sentIds.includes(s.participant.id)) {
        onSendComplete(s.participant.id)
      }
    })
    setSentIds(settlements.map(s => s.participant.id))
    setToastMessage("카카오톡으로 공유되었습니다!")
    setShowToast(true)
    setTimeout(() => setShowToast(false), 2000)
  }

  const total = settlements.reduce((sum, s) => sum + s.amount, 0)

  return (
    <div className="flex flex-col min-h-screen bg-background relative">
      {/* Toast */}
      {showToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2">
          <div className="bg-foreground text-background px-6 py-3 rounded-full shadow-lg flex items-center gap-2">
            <Check className="w-5 h-5" />
            <span className="font-medium">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-4 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold">카카오톡 공유</h2>
        </div>
      </div>

      {/* Message Preview */}
      <div className="flex-1 px-4 py-6">
        <p className="text-sm text-muted-foreground mb-4 text-center">
          아래 메시지가 카카오톡으로 전송됩니다
        </p>

        {/* KakaoTalk Style Message Preview */}
        <div className="bg-[#B2C7DA] rounded-2xl p-4 max-w-sm mx-auto">
          <div className="bg-card rounded-xl overflow-hidden shadow-md">
            {/* Message Header */}
            <div className="bg-kakao p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-kakao-foreground/20 rounded-lg flex items-center justify-center">
                  <span className="text-lg">🧾</span>
                </div>
                <div>
                  <p className="font-bold text-kakao-foreground text-sm">
                    얼마야?
                  </p>
                  <p className="text-xs text-kakao-foreground/80">
                    정산 요청이 도착했어요
                  </p>
                </div>
              </div>
            </div>

            {/* Message Content */}
            <div className="p-4 bg-card">
              <h3 className="font-bold text-foreground mb-1">
                {receiptInfo.storeName} 정산
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                {receiptInfo.visitedAt}
              </p>

              <div className="space-y-2 mb-4">
                {settlements.map((settlement) => (
                  <div
                    key={settlement.participant.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <span>{settlement.participant.avatar}</span>
                      <span className="font-medium text-sm">
                        {settlement.participant.name}
                      </span>
                    </div>
                    <span className="font-bold text-foreground">
                      {settlement.amount.toLocaleString()}원
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="font-semibold">총 금액</span>
                <span className="font-bold text-lg text-primary">
                  {total.toLocaleString()}원
                </span>
              </div>
            </div>

            {/* Kakao Button */}
            <button
              onClick={handleSendAll}
              className="w-full py-4 bg-kakao text-kakao-foreground font-semibold flex items-center justify-center gap-2 hover:brightness-95 transition-all"
            >
              송금하기
            </button>
          </div>
        </div>

        {/* Individual Send Buttons */}
        <div className="mt-8 space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground mb-3">
            개별 전송
          </h4>
          {settlements.map((settlement) => (
            <button
              key={settlement.participant.id}
              onClick={() => handleSendToKakao(settlement)}
              disabled={sentIds.includes(settlement.participant.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                sentIds.includes(settlement.participant.id)
                  ? "bg-green-50 border-green-200"
                  : "bg-card border-border hover:border-kakao"
              }`}
            >
              <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center text-lg">
                {settlement.participant.avatar}
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">{settlement.participant.name}</p>
                <p className="text-sm text-muted-foreground">
                  {settlement.amount.toLocaleString()}원
                </p>
              </div>
              {sentIds.includes(settlement.participant.id) ? (
                <div className="flex items-center gap-2 text-green-600">
                  <Check className="w-5 h-5" />
                  <span className="text-sm font-medium">전송완료</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-kakao-foreground bg-kakao px-4 py-2 rounded-lg">
                  <Send className="w-4 h-4" />
                  <span className="text-sm font-medium">전송</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Button */}
      <div className="sticky bottom-0 p-4 bg-background border-t border-border">
        <button
          onClick={onDone}
          className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-semibold text-lg shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform"
        >
          완료
        </button>
      </div>
    </div>
  )
}
