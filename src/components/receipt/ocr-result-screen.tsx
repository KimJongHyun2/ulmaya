"use client"

import { useMemo, useState } from "react"
import { ArrowLeft, Calendar, Check, MapPin, Pencil, Plus, Trash2, X } from "lucide-react"
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
  return value.includes("확인 필요") || value.includes("?뺤씤 ?꾩슂")
}

function parseAmount(value: string) {
  return Number.parseInt(value.replace(/[^\d]/g, ""), 10) || 0
}

function formatAmount(value: number) {
  return `${value.toLocaleString()}원`
}

function createMenuItem(id: number): MenuItem {
  return {
    id,
    name: "",
    price: 0,
    assignedTo: [],
    isNbbang: false,
  }
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
  const [notice, setNotice] = useState("")

  const storeName = isUnknown(receiptInfo.storeName) ? "상호 확인 필요" : receiptInfo.storeName
  const location = isUnknown(receiptInfo.location) ? "주소 확인 필요" : receiptInfo.location
  const visitedAt = isUnknown(receiptInfo.visitedAt) ? "날짜/시간 확인 필요" : receiptInfo.visitedAt
  const rawText = receiptInfo.rawText?.trim() ?? ""
  const menuTotal = useMemo(
    () => menuItems.reduce((sum, item) => sum + Math.max(0, item.price || 0), 0),
    [menuItems],
  )

  const startEditing = (item: MenuItem) => {
    setNotice("")
    setEditingId(item.id)
    setEditName(item.name)
    setEditPrice(item.price > 0 ? item.price.toLocaleString() : "")
  }

  const saveEdit = () => {
    if (editingId === null) return

    const nextName = editName.trim()
    const nextPrice = parseAmount(editPrice)

    setMenuItems(
      menuItems.map((item) =>
        item.id === editingId
          ? { ...item, name: nextName, price: nextPrice }
          : item,
      ),
    )
    setEditingId(null)
    setNotice("")
  }

  const cancelEdit = () => {
    setEditingId(null)
    setNotice("")
  }

  const addMenuItem = () => {
    const nextId = Math.max(0, ...menuItems.map((item) => item.id)) + 1
    const nextItem = createMenuItem(nextId)

    setMenuItems([...menuItems, nextItem])
    setEditingId(nextId)
    setEditName("")
    setEditPrice("")
    setNotice("")
  }

  const deleteMenuItem = (id: number) => {
    setMenuItems(menuItems.filter((item) => item.id !== id))
    if (editingId === id) {
      setEditingId(null)
    }
    setNotice("")
  }

  const handleNext = () => {
    if (editingId !== null) {
      setNotice("수정 중인 항목을 저장하거나 취소한 뒤 다음 단계로 이동해주세요.")
      return
    }

    const invalidItem = menuItems.find((item) => !item.name.trim() || item.price <= 0)

    if (invalidItem) {
      setNotice("메뉴명 없는 항목이나 0원 이하 금액이 있습니다. 메뉴를 확인해주세요.")
      return
    }

    if (menuItems.length === 0) {
      setNotice("메뉴를 1개 이상 추가해주세요.")
      return
    }

    onNext()
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

      <div className="space-y-5 px-4 py-5">
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
          </div>

          <div className="mt-4 rounded-xl bg-muted/40 px-3 py-3">
            <p className="text-xs font-medium text-muted-foreground">총금액</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{formatAmount(menuTotal)}</p>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h4 className="mb-3 text-sm font-semibold text-muted-foreground">OCR 결과 텍스트</h4>
          <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-xl bg-muted/40 p-3 text-sm leading-7 text-foreground">
            {rawText || "OCR 원문 텍스트가 없습니다."}
          </pre>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <h4 className="text-sm font-semibold text-muted-foreground">메뉴 목록</h4>
            <button
              onClick={addMenuItem}
              className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              메뉴 추가
            </button>
          </div>

          {menuItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-5 text-sm text-muted-foreground">
              메뉴 후보를 찾지 못했습니다. OCR 원문을 확인한 뒤 메뉴를 직접 추가해주세요.
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
                        placeholder="메뉴명"
                        className="w-full rounded-lg border border-border bg-input px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        value={editPrice}
                        onChange={(event) => setEditPrice(event.target.value)}
                        placeholder="금액"
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
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-foreground">{item.name || "메뉴명 없음"}</p>
                        <p className="mt-1 text-sm font-bold text-foreground">{formatAmount(item.price)}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => startEditing(item)}
                          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
                          aria-label={`${item.name || "메뉴"} 수정`}
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => deleteMenuItem(item.id)}
                          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
                          aria-label={`${item.name || "메뉴"} 삭제`}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {notice && (
            <p className="mt-3 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {notice}
            </p>
          )}
        </section>
      </div>

      <div className="sticky bottom-0 border-t border-border bg-background p-4">
        <button
          onClick={handleNext}
          className="w-full rounded-2xl bg-primary py-4 text-lg font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-transform active:scale-[0.98]"
        >
          참여자 선택
        </button>
      </div>
    </div>
  )
}
