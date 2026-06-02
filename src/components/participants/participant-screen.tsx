"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, Check, Link2, MessageCircle, Search, Users } from "lucide-react"
import {
  filterParticipants,
  isParticipantSelected,
  toggleParticipant as toggleParticipantSelection,
} from "@/features/participants/selection"
import { getKakaoFriends, getKakaoProfile, loginWithKakao, type KakaoFriendResponse } from "@/lib/kakao"
import { useUser } from "@/features/auth/user-context"
import type { Participant } from "@/types/participants"

interface ParticipantScreenProps {
  allParticipants: Participant[]
  frequentParticipants: Participant[]
  selectedParticipants: Participant[]
  setSelectedParticipants: (participants: Participant[]) => void
  onBack: () => void
  onNext: () => void
}

function stableNumberId(value: string) {
  let hash = 0

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }

  return 1_000_000_000 + (hash % 1_000_000_000)
}

function mapFriendToParticipant(friend: KakaoFriendResponse): Participant {
  const stableId = friend.id ?? stableNumberId(friend.uuid ?? friend.profile_nickname ?? crypto.randomUUID())

  return {
    id: stableId,
    name: friend.profile_nickname ?? "카카오 친구",
    avatar: "👤",
    imageUrl: friend.profile_thumbnail_image,
  }
}

function getKakaoErrorMessage(error: any) {
  const code = error?.code

  if (code === -402) {
    return "카카오 친구 목록 권한이 필요합니다. 카카오 디벨로퍼스에서 friends 권한을 활성화하고 다시 로그인해주세요."
  }

  if (code === -401) {
    return "카카오 로그인이 만료되었습니다. 다시 로그인한 뒤 친구를 불러와주세요."
  }

  return "카카오 친구 목록을 불러오지 못했습니다. 앱 권한과 JavaScript 키 설정을 확인해주세요."
}

export default function ParticipantScreen({
  allParticipants: initialParticipants,
  frequentParticipants,
  selectedParticipants,
  setSelectedParticipants,
  onBack,
  onNext,
}: ParticipantScreenProps) {
  const { user, setUser } = useUser()
  const [searchQuery, setSearchQuery] = useState("")
  const [isSyncing, setIsSyncing] = useState(false)
  const [allParticipants, setAllParticipants] = useState<Participant[]>(initialParticipants)
  const [syncMessage, setSyncMessage] = useState("")

  useEffect(() => {
    setAllParticipants(initialParticipants)
  }, [initialParticipants])

  const handleSyncKakaoFriends = async () => {
    setIsSyncing(true)
    setSyncMessage("")

    try {
      if (!user) {
        const loggedInUser = await loginWithKakao()
        setUser(getKakaoProfile(loggedInUser))
      }

      const friends = await getKakaoFriends()
      const kakaoParticipants = friends.map(mapFriendToParticipant)

      setAllParticipants(kakaoParticipants)
      setSyncMessage(
        kakaoParticipants.length > 0
          ? `${kakaoParticipants.length}명의 카카오 친구를 불러왔습니다.`
          : "조회 가능한 카카오 친구가 없습니다. 카카오 친구 API는 앱 권한과 친구의 동의 상태에 따라 일부 친구만 제공됩니다.",
      )
    } catch (error) {
      console.error("Failed to sync Kakao friends:", error)
      setSyncMessage(getKakaoErrorMessage(error))
    } finally {
      setIsSyncing(false)
    }
  }

  const toggleParticipant = (friend: Participant) => {
    setSelectedParticipants(toggleParticipantSelection(selectedParticipants, friend))
  }

  const isSelected = (id: number) => isParticipantSelected(selectedParticipants, id)
  const filteredFriends = filterParticipants(allParticipants, searchQuery)

  return (
    <div className="flex flex-col min-h-screen bg-background">
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

      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="친구 검색"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-card rounded-xl border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="px-4 py-2">
        <div className="flex gap-2">
          <button
            onClick={handleSyncKakaoFriends}
            disabled={isSyncing}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-kakao text-kakao-foreground rounded-xl font-medium disabled:opacity-70 transition-opacity"
          >
            {isSyncing ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-kakao-foreground/30 border-t-kakao-foreground rounded-full animate-spin" />
                불러오는 중...
              </span>
            ) : (
              <>
                <MessageCircle className="w-5 h-5 fill-current" />
                카카오 친구 불러오기
              </>
            )}
          </button>
          <button className="flex items-center justify-center gap-2 px-4 py-3 bg-card border border-border rounded-xl">
            <Link2 className="w-5 h-5" />
          </button>
        </div>

        {syncMessage && (
          <p className="mt-3 rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
            {syncMessage}
          </p>
        )}
      </div>

      {selectedParticipants.length > 0 && (
        <div className="px-4 py-3">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {selectedParticipants.map((participant) => (
              <button
                key={participant.id}
                onClick={() => toggleParticipant(participant)}
                className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-full border border-primary/20 shrink-0"
              >
                {participant.imageUrl ? (
                  <img src={participant.imageUrl} alt={participant.name} className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <span className="text-lg">{participant.avatar}</span>
                )}
                <span className="text-sm font-medium text-foreground">{participant.name}</span>
                <span className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {frequentParticipants.length > 0 && searchQuery === "" && (
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold text-muted-foreground">자주 함께한 친구</h4>
          </div>
          <div className="flex gap-3">
            {frequentParticipants.map((friend) => (
              <button
                key={friend.id}
                onClick={() => toggleParticipant(friend)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                  isSelected(friend.id) ? "border-primary bg-primary/5" : "border-transparent bg-card"
                }`}
              >
                <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center text-2xl overflow-hidden">
                  {friend.imageUrl ? (
                    <img src={friend.imageUrl} alt={friend.name} className="w-full h-full object-cover" />
                  ) : (
                    friend.avatar
                  )}
                </div>
                <span className="text-sm font-medium">{friend.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 px-4 py-3">
        <h4 className="text-sm font-semibold text-muted-foreground mb-3">카카오 친구 목록</h4>

        {filteredFriends.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
            카카오 친구 불러오기를 눌러 실제 친구 목록을 가져오세요.
          </div>
        ) : (
          <div className="space-y-2">
            {filteredFriends.map((friend) => (
              <button
                key={friend.id}
                onClick={() => toggleParticipant(friend)}
                className={`w-full flex items-center gap-4 p-3 rounded-xl border-2 transition-all ${
                  isSelected(friend.id) ? "border-primary bg-primary/5" : "border-transparent bg-card"
                }`}
              >
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center text-xl overflow-hidden">
                  {friend.imageUrl ? (
                    <img src={friend.imageUrl} alt={friend.name} className="w-full h-full object-cover" />
                  ) : (
                    friend.avatar
                  )}
                </div>
                <span className="flex-1 text-left font-medium">{friend.name}</span>
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    isSelected(friend.id) ? "bg-primary border-primary" : "border-muted-foreground"
                  }`}
                >
                  {isSelected(friend.id) && <Check className="w-4 h-4 text-primary-foreground" />}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

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
