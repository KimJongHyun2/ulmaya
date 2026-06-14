"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, Check, Link2, MessageCircle, Search, UserPlus, Users } from "lucide-react"
import {
  filterParticipants,
  isParticipantSelected,
  toggleParticipant as toggleParticipantSelection,
} from "@/features/participants/selection"
import {
  getKakaoFriends,
  getKakaoProfile,
  loginWithKakao,
  type KakaoFriendResponse,
} from "@/lib/kakao"
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

const DEFAULT_PARTICIPANT: Participant = {
  id: 0,
  name: "종현 (나)",
  avatar: "나",
}

const EMPTY_FRIENDS_MESSAGE =
  "불러올 수 있는 카카오 친구가 없습니다. 친구가 이 앱에 연결되어 있지 않거나 friends 동의가 필요할 수 있습니다."
const FRIENDS_LOAD_ERROR_MESSAGE =
  "카카오 친구 목록을 불러오지 못했습니다. 직접 추가로 참여자를 등록해주세요."

function stableNumberId(value: string) {
  let hash = 0

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }

  return 1_000_000_000 + (hash % 1_000_000_000)
}

function isDefaultParticipant(participant: Participant) {
  return participant.id === DEFAULT_PARTICIPANT.id || participant.name === DEFAULT_PARTICIPANT.name
}

function dedupeParticipants(participants: Participant[]) {
  const seenIds = new Set<number>()
  const seenNames = new Set<string>()

  return participants.filter((participant) => {
    const normalizedName = participant.name.trim().toLowerCase()

    if (!participant.name.trim() || seenIds.has(participant.id) || seenNames.has(normalizedName)) {
      return false
    }

    seenIds.add(participant.id)
    seenNames.add(normalizedName)
    return true
  })
}

function mergeParticipants(current: Participant[], incoming: Participant[]) {
  return dedupeParticipants([...current, ...incoming])
}

function mapFriendToParticipant(friend: KakaoFriendResponse): Participant {
  const stableId = friend.id ?? stableNumberId(friend.uuid ?? friend.profile_nickname ?? crypto.randomUUID())

  return {
    id: stableId,
    name: friend.profile_nickname?.trim() || "카카오 친구",
    avatar: "친",
    imageUrl: friend.profile_thumbnail_image,
  }
}

export default function ParticipantScreen({
  allParticipants: initialParticipants,
  frequentParticipants,
  selectedParticipants,
  setSelectedParticipants,
  onBack,
  onNext,
}: ParticipantScreenProps) {
  const { setUser } = useUser()
  const [searchQuery, setSearchQuery] = useState("")
  const [manualName, setManualName] = useState("")
  const [isSyncing, setIsSyncing] = useState(false)
  const [allParticipants, setAllParticipants] = useState<Participant[]>(() =>
    dedupeParticipants(initialParticipants),
  )
  const [syncMessage, setSyncMessage] = useState("")

  useEffect(() => {
    setAllParticipants((current) => mergeParticipants(current, initialParticipants))
  }, [initialParticipants])

  useEffect(() => {
    if (!selectedParticipants.some(isDefaultParticipant)) {
      setSelectedParticipants([DEFAULT_PARTICIPANT, ...selectedParticipants])
    }
  }, [selectedParticipants, setSelectedParticipants])

  const handleSyncKakaoFriends = async () => {
    if (isSyncing) {
      return
    }

    setIsSyncing(true)
    setSyncMessage("")

    try {
      const loggedInUser = await loginWithKakao()
      setUser(getKakaoProfile(loggedInUser))

      const friends = await getKakaoFriends()
      const kakaoParticipants = dedupeParticipants(friends.map(mapFriendToParticipant))

      setAllParticipants((current) => mergeParticipants(current, kakaoParticipants))
      setSyncMessage(
        kakaoParticipants.length > 0
          ? `${kakaoParticipants.length}명의 카카오 친구를 불러왔습니다.`
          : EMPTY_FRIENDS_MESSAGE,
      )
    } catch (error) {
      console.warn("Failed to sync Kakao friends", error)
      setSyncMessage(FRIENDS_LOAD_ERROR_MESSAGE)
    } finally {
      setIsSyncing(false)
    }
  }

  const addParticipant = (participant: Participant, options: { select?: boolean } = {}) => {
    setAllParticipants((current) => mergeParticipants(current, [participant]))

    if (options.select && !selectedParticipants.some((selected) => selected.id === participant.id || selected.name === participant.name)) {
      setSelectedParticipants([...selectedParticipants, participant])
    }
  }

  const handleAddManualParticipant = () => {
    const name = manualName.trim()

    if (!name) {
      return
    }

    const participant: Participant = {
      id: stableNumberId(`manual:${name}`),
      name,
      avatar: name.slice(0, 1),
    }

    addParticipant(participant, { select: true })
    setManualName("")
    setSyncMessage("")
  }

  const toggleParticipant = (participant: Participant) => {
    if (isDefaultParticipant(participant)) {
      return
    }

    setSelectedParticipants(toggleParticipantSelection(selectedParticipants, participant))
  }

  const isSelected = (id: number) => isParticipantSelected(selectedParticipants, id)
  const filteredFriends = filterParticipants(allParticipants, searchQuery)
  const hasFriends = filteredFriends.length > 0

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-4 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted"
            aria-label="이전으로"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-bold">참여자 선택</h2>
          <span className="ml-auto rounded-full bg-primary px-3 py-1 text-sm font-medium text-primary-foreground">
            {selectedParticipants.length}명
          </span>
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="친구 검색"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full rounded-xl border border-border bg-card py-3 pl-12 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="space-y-3 px-4 py-2">
        <div className="flex gap-2">
          <button
            onClick={handleSyncKakaoFriends}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-kakao py-3 font-medium text-kakao-foreground transition-opacity"
          >
            {isSyncing ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-kakao-foreground/30 border-t-kakao-foreground" />
                불러오는 중...
              </span>
            ) : (
              <>
                <MessageCircle className="h-5 w-5 fill-current" />
                카카오 친구 불러오기
              </>
            )}
          </button>
          <button className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3">
            <Link2 className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={manualName}
            onChange={(event) => setManualName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleAddManualParticipant()
              }
            }}
            placeholder="직접 추가할 이름"
            className="min-w-0 flex-1 rounded-xl border border-border bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={handleAddManualParticipant}
            disabled={!manualName.trim()}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground disabled:opacity-50"
          >
            <UserPlus className="h-5 w-5" />
            추가
          </button>
        </div>

        {syncMessage && (
          <p className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
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
                disabled={isDefaultParticipant(participant)}
                className="flex shrink-0 items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-2 disabled:cursor-default"
              >
                {participant.imageUrl ? (
                  <img src={participant.imageUrl} alt={participant.name} className="h-6 w-6 rounded-full object-cover" />
                ) : (
                  <span className="text-sm font-semibold">{participant.avatar}</span>
                )}
                <span className="text-sm font-medium text-foreground">{participant.name}</span>
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {frequentParticipants.length > 0 && searchQuery === "" && (
        <div className="px-4 py-3">
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold text-muted-foreground">자주 함께한 친구</h4>
          </div>
          <div className="flex gap-3">
            {dedupeParticipants(frequentParticipants).map((friend) => (
              <button
                key={friend.id}
                onClick={() => toggleParticipant(friend)}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all ${
                  isSelected(friend.id) ? "border-primary bg-primary/5" : "border-transparent bg-card"
                }`}
              >
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-muted text-2xl">
                  {friend.imageUrl ? (
                    <img src={friend.imageUrl} alt={friend.name} className="h-full w-full object-cover" />
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
        <h4 className="mb-3 text-sm font-semibold text-muted-foreground">카카오 친구 목록</h4>

        {!hasFriends ? (
          <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
            {syncMessage || "카카오 친구 불러오기를 눌러 친구 목록을 가져오세요."}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredFriends.map((friend) => (
              <button
                key={friend.id}
                onClick={() => toggleParticipant(friend)}
                className={`flex w-full items-center gap-4 rounded-xl border-2 p-3 transition-all ${
                  isSelected(friend.id) ? "border-primary bg-primary/5" : "border-transparent bg-card"
                }`}
              >
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-muted text-xl">
                  {friend.imageUrl ? (
                    <img src={friend.imageUrl} alt={friend.name} className="h-full w-full object-cover" />
                  ) : (
                    friend.avatar
                  )}
                </div>
                <span className="flex-1 text-left font-medium">{friend.name}</span>
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                    isSelected(friend.id) ? "border-primary bg-primary" : "border-muted-foreground"
                  }`}
                >
                  {isSelected(friend.id) && <Check className="h-4 w-4 text-primary-foreground" />}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="sticky bottom-0 border-t border-border bg-background p-4">
        <button
          onClick={onNext}
          disabled={selectedParticipants.length === 0}
          className="w-full rounded-2xl bg-primary py-4 text-lg font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-transform active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
        >
          다음
        </button>
      </div>
    </div>
  )
}
