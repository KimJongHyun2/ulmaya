"use client"

import { ArrowLeft, Check, Users } from "lucide-react"
import type { MenuItem } from "@/types/receipt"
import type { Participant } from "@/types/participants"

interface MenuAssignmentScreenProps {
  menuItems: MenuItem[]
  setMenuItems: (items: MenuItem[]) => void
  participants: Participant[]
  onCalculate: () => void
  onBack: () => void
}

export default function MenuAssignmentScreen({
  menuItems,
  setMenuItems,
  participants,
  onCalculate,
  onBack,
}: MenuAssignmentScreenProps) {
  const togglePerson = (menuId: number, personName: string) => {
    setMenuItems(
      menuItems.map((item) => {
        if (item.id !== menuId) return item
        
        if (personName === "전체") {
          if (item.assignedTo.includes("전체")) {
            return { ...item, assignedTo: [], isNbbang: false }
          }
          return { ...item, assignedTo: ["전체"], isNbbang: true }
        }
        
        // Remove "전체" if individual person is selected
        const filtered = item.assignedTo.filter((name) => name !== "전체")
        
        if (filtered.includes(personName)) {
          return {
            ...item,
            assignedTo: filtered.filter((name) => name !== personName),
            isNbbang: false,
          }
        }
        return {
          ...item,
          assignedTo: [...filtered, personName],
          isNbbang: false,
        }
      })
    )
  }

  const toggleNbbang = (menuId: number) => {
    setMenuItems(
      menuItems.map((item) => {
        if (item.id !== menuId) return item
        if (item.isNbbang) {
          return { ...item, isNbbang: false, assignedTo: [] }
        }
        return { ...item, isNbbang: true, assignedTo: ["전체"] }
      })
    )
  }

  const isPersonSelected = (menuId: number, personName: string) => {
    const item = menuItems.find((m) => m.id === menuId)
    if (!item) return false
    if (personName === "전체") {
      return item.assignedTo.includes("전체") || item.isNbbang
    }
    return item.assignedTo.includes(personName) || item.assignedTo.includes("전체") || item.isNbbang
  }

  const allMenusAssigned = menuItems.every(
    (item) => item.assignedTo.length > 0 || item.isNbbang
  )

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
          <h2 className="text-lg font-bold">메뉴 배정</h2>
        </div>
      </div>

      {/* Instructions */}
      <div className="px-4 py-3">
        <p className="text-sm text-muted-foreground">
          각 메뉴를 먹은 사람을 선택해주세요. 여러 명이 나눠 먹었다면 모두 선택하세요.
        </p>
      </div>

      {/* Menu List */}
      <div className="flex-1 px-4 pb-4 space-y-4">
        {menuItems.map((item) => (
          <div
            key={item.id}
            className="bg-card rounded-2xl p-4 shadow-sm border border-border"
          >
            {/* Menu Info */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-semibold text-foreground">{item.name}</p>
                <p className="text-sm text-muted-foreground">
                  {item.price.toLocaleString()}원
                </p>
              </div>
              
              {/* N빵 Toggle */}
              <button
                onClick={() => toggleNbbang(item.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-all ${
                  item.isNbbang
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Users className="w-4 h-4" />
                N빵
              </button>
            </div>

            {/* Person Selection */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => togglePerson(item.id, "전체")}
                className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all ${
                  isPersonSelected(item.id, "전체")
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Users className="w-4 h-4" />
                전체
                {isPersonSelected(item.id, "전체") && (
                  <Check className="w-4 h-4" />
                )}
              </button>
              
              {participants.map((person) => (
                <button
                  key={person.id}
                  onClick={() => togglePerson(item.id, person.name)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all ${
                    isPersonSelected(item.id, person.name)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <span>{person.avatar}</span>
                  {person.name}
                  {isPersonSelected(item.id, person.name) && !item.isNbbang && !item.assignedTo.includes("전체") && (
                    <Check className="w-4 h-4" />
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Button */}
      <div className="sticky bottom-0 p-4 bg-background border-t border-border">
        <button
          onClick={onCalculate}
          disabled={!allMenusAssigned}
          className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-semibold text-lg shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform disabled:opacity-50 disabled:shadow-none"
        >
          정산 계산하기
        </button>
      </div>
    </div>
  )
}
