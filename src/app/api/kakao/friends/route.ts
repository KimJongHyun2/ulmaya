import { NextRequest, NextResponse } from "next/server"

interface KakaoFriendResponse {
  id?: number | string
  uuid?: string
  profile_nickname?: string
  profile_thumbnail_image?: string
}

interface KakaoFriendsApiResponse {
  elements?: unknown
  msg?: string
  code?: number
}

const FRIENDS_UNAVAILABLE_MESSAGE =
  "카카오 친구 목록은 앱 연결 및 친구 동의 조건이 필요합니다. 목록이 보이지 않으면 직접 추가해주세요."

function normalizeFriends(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((friend): friend is KakaoFriendResponse => Boolean(friend) && typeof friend === "object")
    .map((friend) => ({
      id: String(friend.id ?? friend.uuid ?? friend.profile_nickname ?? ""),
      nickname: friend.profile_nickname?.trim() || "카카오 친구",
      profileImage: friend.profile_thumbnail_image ?? null,
    }))
    .filter((friend) => friend.id || friend.nickname)
}

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get("ulmaya_kakao_access_token")?.value

  if (!accessToken) {
    return NextResponse.json(
      { message: "Kakao access token is missing. Please log in again." },
      { status: 401 },
    )
  }

  const friendsResponse = await fetch("https://kapi.kakao.com/v1/api/talk/friends", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const data = (await friendsResponse.json().catch(() => ({}))) as KakaoFriendsApiResponse

  if (!friendsResponse.ok) {
    console.warn("Kakao friends API request failed", {
      status: friendsResponse.status,
      code: data.code,
      message: data.msg,
    })

    if (friendsResponse.status === 403) {
      return NextResponse.json({
        friends: [],
        message: FRIENDS_UNAVAILABLE_MESSAGE,
        reason: "friends_unavailable",
      })
    }

    if (friendsResponse.status === 401) {
      return NextResponse.json(
        { message: "Kakao friends permission is missing or login is expired." },
        { status: 401 },
      )
    }

    return NextResponse.json(
      { message: "Failed to request Kakao friends." },
      { status: 502 },
    )
  }

  return NextResponse.json({ friends: normalizeFriends(data.elements) })
}
