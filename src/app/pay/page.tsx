"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, ExternalLink } from "lucide-react"
import MobileAppShell from "@/components/common/mobile-app-shell"

const KAKAO_PAY_URL = "https://pay.kakao.com/"

export default function KakaoPayGuidePage() {
  const [receiver, setReceiver] = useState("정산 받을 사람")
  const [amount, setAmount] = useState(0)
  const [returnTo, setReturnTo] = useState("/")

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const parsedAmount = Number(params.get("amount") ?? 0)

    setReceiver(params.get("receiver") || "정산 받을 사람")
    setAmount(Number.isFinite(parsedAmount) ? parsedAmount : 0)
    setReturnTo(params.get("returnTo") || "/")
  }, [])

  const openKakaoPay = () => {
    window.location.href = KAKAO_PAY_URL
  }

  const goBack = () => {
    window.location.href = returnTo
  }

  return (
    <MobileAppShell>
      <div className="flex min-h-screen flex-col bg-background">
        <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-4 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={goBack}
              className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted"
              aria-label="이전 화면"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold">카카오페이 송금 안내</h1>
          </div>
        </div>

        <main className="flex flex-1 flex-col px-5 py-8">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">정산 금액</p>
            <p className="mt-2 text-3xl font-bold text-foreground">
              {amount.toLocaleString()}원
            </p>
            <p className="mt-4 text-base text-muted-foreground">
              {receiver}님에게 위 금액을 카카오페이로 송금해주세요.
            </p>
          </section>

          <div className="mt-5 rounded-xl bg-muted p-4 text-sm leading-6 text-muted-foreground">
            카카오페이 화면이 열리면 받는 사람과 금액은 직접 선택해야 합니다.
            자동 송금이나 금액 자동 입력은 지원하지 않습니다.
          </div>

          <div className="mt-auto space-y-3 pt-8">
            <button
              type="button"
              onClick={openKakaoPay}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-kakao py-4 text-lg font-semibold text-kakao-foreground shadow-lg active:scale-[0.98]"
            >
              <ExternalLink className="h-5 w-5" />
              카카오페이 열기
            </button>
            <button
              type="button"
              onClick={goBack}
              className="w-full rounded-2xl border border-border bg-background py-4 text-base font-semibold text-foreground active:scale-[0.98]"
            >
              얼마야로 돌아가기
            </button>
          </div>
        </main>
      </div>
    </MobileAppShell>
  )
}
