"use client"

import { useState } from "react"
import { ArrowLeft, Search, Check, Users, Link2, MessageCircle } from "lucide-react"
import {
  filterParticipants,
  isParticipantSelected,
  toggleParticipant as toggleParticipantSelection,
} from "@/features/participants/selection"
import type { Participant } from "@/types/participants"

interface ParticipantScreenProps {
  allParticipants: Participant[]
  frequentParticipants: Participant[]
  selectedParticipants: Participant[]
  setSelectedParticipants: (participants: Participant[]) => void
  onBack: () => void
  onNext: () => void
}

export default function ParticipantScreen({
  allParticipants,
  frequentParticipants,
  selectedParticipants,
  setSelectedParticipants,
  onBack,
  onNext,
}: ParticipantScreenProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const toggleParticipant = (friend: Participant) => {
    setSelectedParticipants(toggleParticipantSelection(selectedParticipants, friend))
  }

  const isSelected = (id: number) => isParticipantSelected(selectedParticipants, id)

  const filteredFriends = filterParticipants(allParticipants, searchQuery)

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
          <h2 className="text-lg font-bold">참여자 선택</h2>
          {selectedParticipants.length > 0 && (
            <span className="ml-auto bg-primary text-primary-foreground text-sm font-medium px-3 py-1 rounded-full">
              {selectedParticipants.length}명
            </span>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="친구 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-card rounded-xl border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 py-2">
        <div className="flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-kakao text-kakao-foreground rounded-xl font-medium">
            <MessageCircle className="w-5 h-5" />
            카카오 친구 불러오기
          </button>
          <button className="flex items-center justify-center gap-2 px-4 py-3 bg-card border border-border rounded-xl">
            <Link2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Selected Participants */}
      {selectedParticipants.length > 0 && (
        <div className="px-4 py-3">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {selectedParticipants.map((p) => (
              <button
                key={p.id}
                onClick={() => toggleParticipant(p)}
                className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-full border border-primary/20 shrink-0"
              >
                <span className="text-lg">{p.avatar}</span>
                <span className="text-sm font-medium text-foreground">{p.name}</span>
                <span className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Frequent Friends */}
      {searchQuery === "" && (
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold text-muted-foreground">
              자주 함께한 친구
            </h4>
          </div>
          <div className="flex gap-3">
            {frequentParticipants.map((friend) => (
              <button
                key={friend.id}
                onClick={() => toggleParticipant(friend)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                  isSelected(friend.id)
                    ? "border-primary bg-primary/5"
                    : "border-transparent bg-card"
                }`}
              >
                <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center text-2xl">
                  {friend.avatar}
                </div>
                <span className="text-sm font-medium">{friend.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Friend List */}
      <div className="flex-1 px-4 py-3">
        <h4 className="text-sm font-semibold text-muted-foreground mb-3">
          친구 목록
        </h4>
        <div className="space-y-2">
          {filteredFriends.map((friend) => (
            <button
              key={friend.id}
              onClick={() => toggleParticipant(friend)}
              className={`w-full flex items-center gap-4 p-3 rounded-xl border-2 transition-all ${
                isSelected(friend.id)
                  ? "border-primary bg-primary/5"
                  : "border-transparent bg-card"
              }`}
            >
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center text-xl">
                {friend.avatar}
              </div>
              <span className="flex-1 text-left font-medium">{friend.name}</span>
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  isSelected(friend.id)
                    ? "bg-primary border-primary"
                    : "border-muted-foreground"
                }`}
              >
                {isSelected(friend.id) && (
                  <Check className="w-4 h-4 text-primary-foreground" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Button */}
      <div className="sticky bottom-0 p-4 bg-background border-t border-border">
        <button
          onClick={onNext}
          disabled={selectedParticipants.length === 0}
          className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-semibold text-lg shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform disabled:opacity-50 disabled:shadow-none"
        >
          다음
        </button>
      </div>
    </div>
  )
}
