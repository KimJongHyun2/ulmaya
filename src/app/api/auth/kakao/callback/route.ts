import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

interface KakaoTokenResponse {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  scope?: string
  error?: string
  error_description?: string
}

interface KakaoUserResponse {
  id?: number
  properties?: {
    nickname?: string
    profile_image?: string
  }
  kakao_account?: {
    email?: string
    profile?: {
      nickname?: string
      profile_image_url?: string
    }
  }
}

interface PublicUserPayload {
  user_id: string
  kakao_id: string
  nickname: string
  profile_image: string | null
}

function encodeCookieValue(value: unknown) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url")
}

function buildUserId(kakaoId: string) {
  return `kakao:${kakaoId}`
}

async function upsertPublicUser(user: PublicUserPayload) {
  if (!supabase) {
    console.error("[auth kakao callback] Supabase client is not configured. User was not saved.", {
      kakao_id: user.kakao_id,
      user_id: user.user_id,
    })
    return
  }

  const { error } = await supabase
    .from("users")
    .upsert(user, { onConflict: "kakao_id" })

  if (error) {
    console.error("[auth kakao callback] Failed to upsert public.users.", {
      kakao_id: user.kakao_id,
      user_id: user.user_id,
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    })
    return
  }

  console.info("[auth kakao callback] public.users upsert success.", {
    kakao_id: user.kakao_id,
    user_id: user.user_id,
  })
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  const clientId = process.env.KAKAO_REST_API_KEY
  const clientSecret = process.env.KAKAO_CLIENT_SECRET
  const redirectUri = process.env.KAKAO_REDIRECT_URI

  if (!code) {
    return NextResponse.json({ message: "Kakao authorization code is missing." }, { status: 400 })
  }

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json(
      { message: "Kakao OAuth environment variables are not configured." },
      { status: 500 },
    )
  }

  const tokenParams = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    redirect_uri: redirectUri,
    code,
    client_secret: clientSecret,
  })

  const tokenResponse = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
    },
    body: tokenParams,
  })

  const tokenData = (await tokenResponse.json()) as KakaoTokenResponse

  if (!tokenResponse.ok || !tokenData.access_token) {
    return NextResponse.json(
      {
        message: "Failed to request Kakao access token.",
        error: tokenData.error,
        error_description: tokenData.error_description,
      },
      { status: 502 },
    )
  }

  const userResponse = await fetch("https://kapi.kakao.com/v2/user/me", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
    },
  })

  const kakaoUser = (await userResponse.json()) as KakaoUserResponse

  if (!userResponse.ok) {
    return NextResponse.json(
      { message: "Failed to request Kakao user profile." },
      { status: 502 },
    )
  }

  const profile = kakaoUser.kakao_account?.profile
  if (!kakaoUser.id) {
    console.error("[auth kakao callback] Kakao profile response did not include an id.", {
      hasNickname: Boolean(profile?.nickname ?? kakaoUser.properties?.nickname),
      hasProfileImage: Boolean(
        profile?.profile_image_url ?? kakaoUser.properties?.profile_image,
      ),
    })
    return NextResponse.json(
      { message: "Kakao user id is missing from profile response." },
      { status: 502 },
    )
  }

  const kakaoId = String(kakaoUser.id)
  const userId = buildUserId(kakaoId)
  const nickname = profile?.nickname ?? kakaoUser.properties?.nickname ?? ""
  const profileImage = profile?.profile_image_url ?? kakaoUser.properties?.profile_image ?? ""

  console.info("[auth kakao callback] Kakao profile received.", {
    hasKakaoId: Boolean(kakaoId),
    hasNickname: Boolean(nickname),
    hasProfileImage: Boolean(profileImage),
  })

  await upsertPublicUser({
    user_id: userId,
    kakao_id: kakaoId,
    nickname,
    profile_image: profileImage || null,
  })

  const user = {
    id: kakaoUser.id,
    user_id: userId,
    kakao_id: kakaoId,
    nickname,
    email: kakaoUser.kakao_account?.email ?? "",
    profile_image: profileImage,
  }

  const response = NextResponse.redirect(new URL("/", request.url))
  response.cookies.set("ulmaya_kakao_user", encodeCookieValue(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  })
  response.cookies.set("ulmaya_kakao_access_token", tokenData.access_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: tokenData.expires_in ?? 3600,
  })

  return response
}
