"use client"

import { useState } from "react"
import { ArrowLeft, Check, MapPin, Calendar, Pencil, X } from "lucide-react"
import { updateMenuItem } from "@/features/receipt/editor"
import type { MenuItem, ReceiptInfo } from "@/types/receipt"

interface OcrResultScreenProps {
  receiptInfo: ReceiptInfo
  menuItems: MenuItem[]
  setMenuItems: (items: MenuItem[]) => void
  onBack: () => void
  onNext: () => void
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

  const total = menuItems.reduce((sum, item) => sum + item.price, 0)

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
          <h2 className="text-lg font-bold">영수증 분석 결과</h2>
        </div>
      </div>

      {/* Store Info */}
      <div className="px-4 py-4">
        <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
          <h3 className="text-xl font-bold mb-3">{receiptInfo.storeName}</h3>
          {(receiptInfo.imagePreview || receiptInfo.imageUrl) && (
            <img
              src={receiptInfo.imagePreview || receiptInfo.imageUrl}
              alt="영수증 미리보기"
              className="mb-4 h-48 w-full rounded-2xl object-contain bg-muted"
            />
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <MapPin className="w-4 h-4" />
            <span>{receiptInfo.location}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{receiptInfo.visitedAt}</span>
          </div>
        </div>
      </div>

      {receiptInfo.rawText && (
        <div className="px-4 pb-4">
          <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
            <h4 className="text-sm font-semibold text-muted-foreground mb-3">OCR 결과 텍스트</h4>
            <pre className="max-h-44 overflow-auto whitespace-pre-wrap text-sm text-foreground">
              {receiptInfo.rawText}
            </pre>
          </div>
        </div>
      )}

      {/* Menu Items */}
      <div className="flex-1 px-4 pb-4">
        <h4 className="text-sm font-semibold text-muted-foreground mb-3 px-1">
          메뉴 목록
        </h4>
        <div className="space-y-3">
          {menuItems.map((item) => (
            <div
              key={item.id}
              className="bg-card rounded-xl p-4 shadow-sm border border-border"
            >
              {editingId === item.id ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 bg-input rounded-lg text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <input
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-input rounded-lg text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={saveEdit}
                      className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg font-medium flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      저장
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex-1 py-2 bg-muted text-muted-foreground rounded-lg font-medium flex items-center justify-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{item.name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-semibold text-foreground">
                      {item.price.toLocaleString()}원
                    </p>
                    <button
                      onClick={() => startEditing(item)}
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted"
                    >
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="mt-4 bg-primary/10 rounded-xl p-4 border border-primary/20">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground">총액</span>
            <span className="text-xl font-bold text-primary">
              {total.toLocaleString()}원
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Button */}
      <div className="sticky bottom-0 p-4 bg-background border-t border-border">
        <button
          onClick={onNext}
          className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-semibold text-lg shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform"
        >
          참여자 선택
        </button>
      </div>
    </div>
  )
}
