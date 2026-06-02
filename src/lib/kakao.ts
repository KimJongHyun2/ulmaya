"use client"

declare global {
  interface Window {
    Kakao?: any
  }
}

export interface KakaoUserResponse {
  id: number
  properties?: {
    nickname?: string
    profile_image?: string
    thumbnail_image?: string
  }
  kakao_account?: {
    profile?: {
      nickname?: string
      profile_image_url?: string
      thumbnail_image_url?: string
    }
  }
}

export interface KakaoFriendResponse {
  id?: number
  uuid?: string
  profile_nickname?: string
  profile_thumbnail_image?: string
  favorite?: boolean
}

const KAKAO_SDK_TIMEOUT_MS = 5000
const KAKAO_LOGIN_SCOPES = [
  "profile_nickname",
  "profile_image",
  "friends",
  "talk_message",
]

function getKakaoJsKey() {
  return process.env.NEXT_PUBLIC_KAKAO_JS_KEY
}

export function initKakao() {
  if (typeof window === "undefined" || !window.Kakao) {
    return false
  }

  const jsKey = getKakaoJsKey()

  if (!jsKey || jsKey === "your_javascript_key_here") {
    console.warn("NEXT_PUBLIC_KAKAO_JS_KEY is not configured.")
    return false
  }

  if (!window.Kakao.isInitialized()) {
    window.Kakao.init(jsKey)
  }

  return window.Kakao.isInitialized()
}

export function waitForKakaoSdk() {
  return new Promise<any>((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Kakao SDK is only available in the browser."))
      return
    }

    const startedAt = Date.now()
    const timer = window.setInterval(() => {
      if (window.Kakao && initKakao()) {
        window.clearInterval(timer)
        resolve(window.Kakao)
        return
      }

      if (Date.now() - startedAt > KAKAO_SDK_TIMEOUT_MS) {
        window.clearInterval(timer)
        reject(new Error("Kakao SDK failed to load or initialize."))
      }
    }, 100)
  })
}

export function getKakaoProfile(user: KakaoUserResponse) {
  const profile = user.kakao_account?.profile

  return {
    id: user.id,
    nickname: profile?.nickname ?? user.properties?.nickname ?? "카카오 사용자",
    profile_image:
      profile?.profile_image_url ??
      user.properties?.profile_image ??
      user.properties?.thumbnail_image,
  }
}

export async function loginWithKakao() {
  const Kakao = await waitForKakaoSdk()

  return new Promise<KakaoUserResponse>((resolve, reject) => {
    Kakao.Auth.login({
      scope: KAKAO_LOGIN_SCOPES.join(","),
      success: () => {
        Kakao.API.request({
          url: "/v2/user/me",
          success: (res: KakaoUserResponse) => resolve(res),
          fail: (error: unknown) => reject(error),
        })
      },
      fail: (error: unknown) => reject(error),
    })
  })
}

export async function logoutFromKakao() {
  const Kakao = await waitForKakaoSdk()

  if (Kakao.Auth.getAccessToken()) {
    await new Promise<void>((resolve) => {
      Kakao.Auth.logout(() => resolve())
    })
  }
}

export async function getKakaoFriends() {
  const Kakao = await waitForKakaoSdk()

  return new Promise<KakaoFriendResponse[]>((resolve, reject) => {
    Kakao.API.request({
      url: "/v1/api/talk/friends",
      data: {
        limit: 100,
        order: "asc",
      },
      success: (res: { elements?: KakaoFriendResponse[] }) => {
        resolve(res.elements ?? [])
      },
      fail: (error: unknown) => reject(error),
    })
  })
}

export function shareToKakao({
  title,
  description,
  imageUrl,
  buttonText,
  link,
}: {
  title: string
  description: string
  imageUrl?: string
  buttonText: string
  link: string
}) {
  if (typeof window === "undefined" || !window.Kakao || !initKakao()) {
    return
  }

  window.Kakao.Share.sendDefault({
    objectType: "feed",
    content: {
      title,
      description,
      imageUrl: imageUrl || "https://your-app.com/placeholder-logo.png",
      link: {
        mobileWebUrl: link,
        webUrl: link,
      },
    },
    buttons: [
      {
        title: buttonText,
        link: {
          mobileWebUrl: link,
          webUrl: link,
        },
      },
    ],
  })
}
