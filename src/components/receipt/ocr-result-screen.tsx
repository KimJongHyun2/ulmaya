"use client"

import { useState } from "react"
import { ArrowLeft, Calendar, Check, MapPin, Pencil, X } from "lucide-react"
import { updateMenuItem } from "@/features/receipt/editor"
import type { MenuItem, ReceiptInfo } from "@/types/receipt"

interface OcrResultScreenProps {
  receiptInfo: ReceiptInfo
  menuItems: MenuItem[]
  setMenuItems: (items: MenuItem[]) => void
  onBack: () => void
  onNext: () => void
}

function isUnknown(value?: string) {
  if (!value) return true
  return value.includes("확인 필요")
}

export default function OcrResultScreen({
  receiptInfo,
  menuItems,
  setMenuItems,
  onBack,
  onNext,
}: OcrResultScreenProps) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState("")
  const [editPrice, setEditPrice] = useState("")

  const storeName = isUnknown(receiptInfo.storeName) ? "상호 확인 필요" : receiptInfo.storeName
  const location = isUnknown(receiptInfo.location) ? "주소 확인 필요" : receiptInfo.location
  const visitedAt = isUnknown(receiptInfo.visitedAt) ? "날짜/시간 확인 필요" : receiptInfo.visitedAt
  const rawText = receiptInfo.rawText?.trim() ?? ""
  const totalAmount = receiptInfo.totalAmount ?? 0

  const startEditing = (item: MenuItem) => {
    setEditingId(item.id)
    setEditName(item.name)
    setEditPrice(item.price.toString())
  }

  const saveEdit = () => {
    if (editingId === null) return
    setMenuItems(updateMenuItem(menuItems, editingId, editName, editPrice))
    setEditingId(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-4 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted"
            aria-label="뒤로 가기"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-bold">영수증 분석 결과</h2>
        </div>
      </div>

      <div className="space-y-6 px-4 py-5">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-xl font-bold">{storeName}</h3>

          {(receiptInfo.imagePreview || receiptInfo.imageUrl) && (
            <div className="mb-4 rounded-2xl bg-muted p-3">
              <img
                src={receiptInfo.imagePreview || receiptInfo.imageUrl}
                alt="영수증 이미지"
                className="h-56 w-full object-contain"
              />
            </div>
          )}

          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{location}</span>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{visitedAt}</span>
            </div>
            {totalAmount > 0 && (
              <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2 text-foreground">
                <span className="font-semibold">총금액</span>
                <span className="font-bold">{totalAmount.toLocaleString()}원</span>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h4 className="mb-3 text-sm font-semibold text-muted-foreground">OCR 결과 텍스트</h4>
          <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-xl bg-muted/40 p-3 text-sm leading-7 text-foreground">
            {rawText || "OCR 원문 텍스트가 없습니다."}
          </pre>
        </section>

        <section>
          <h4 className="mb-3 px-1 text-sm font-semibold text-muted-foreground">메뉴 목록</h4>

          {menuItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-5 text-sm text-muted-foreground">
              메뉴 후보를 찾지 못했습니다. OCR 원문을 확인한 뒤 다시 시도하거나 다음 단계에서 직접 보정이 필요합니다.
            </div>
          ) : (
            <div className="space-y-3">
              {menuItems.map((item) => (
                <div key={item.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  {editingId === item.id ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                        className="w-full rounded-lg border border-border bg-input px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <input
                        type="number"
                        value={editPrice}
                        onChange={(event) => setEditPrice(event.target.value)}
                        className="w-full rounded-lg border border-border bg-input px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={saveEdit}
                          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-2 font-medium text-primary-foreground"
                        >
                          <Check className="h-4 w-4" />
                          저장
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-muted py-2 font-medium text-muted-foreground"
                        >
                          <X className="h-4 w-4" />
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 flex-1 font-semibold text-foreground">{item.name}</p>
                      <div className="flex shrink-0 items-center gap-3">
                        <p className="font-bold text-foreground">{item.price.toLocaleString()}원</p>
                        <button
                          onClick={() => startEditing(item)}
                          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
                          aria-label={`${item.name} 수정`}
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="sticky bottom-0 border-t border-border bg-background p-4">
        <button
          onClick={onNext}
          className="w-full rounded-2xl bg-primary py-4 text-lg font-semibold text-primary-foreground shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform"
        >
          참여자 선택
        </button>
      </div>
    </div>
  )
}
