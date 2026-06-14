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

interface KakaoFriendsApiResponse {
  elements?: unknown
}

const KAKAO_SDK_TIMEOUT_MS = 5000
const KAKAO_LOGIN_SCOPES = [
  "profile_nickname",
  "profile_image",
  "friends",
  "talk_message",
]

export const KAKAO_SDK_UNAVAILABLE_MESSAGE =
  "카카오 SDK 로그인 기능을 사용할 수 없습니다. 직접 추가로 참여자를 등록해주세요."

export class KakaoSdkUnavailableError extends Error {
  constructor(message = KAKAO_SDK_UNAVAILABLE_MESSAGE) {
    super(message)
    this.name = "KakaoSdkUnavailableError"
  }
}

function getKakaoJsKey() {
  return process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY ?? process.env.NEXT_PUBLIC_KAKAO_JS_KEY
}

function hasKakaoApiRequest(Kakao: any) {
  return typeof Kakao?.API?.request === "function"
}

function hasKakaoAuthLogin(Kakao: any) {
  return typeof Kakao?.Auth?.login === "function"
}

function getKakaoAccessToken(Kakao: any) {
  return typeof Kakao?.Auth?.getAccessToken === "function" ? Kakao.Auth.getAccessToken() : null
}

function requestKakaoApi<T>(Kakao: any, options: Record<string, unknown>) {
  return new Promise<T>((resolve, reject) => {
    if (!hasKakaoApiRequest(Kakao)) {
      const error = new KakaoSdkUnavailableError()
      console.warn("Kakao.API.request is not available.", Kakao)
      reject(error)
      return
    }

    Kakao.API.request({
      ...options,
      success: (response: T) => resolve(response),
      fail: (error: unknown) => {
        console.warn("Kakao API request failed", error)
        reject(error)
      },
    })
  })
}

function normalizeKakaoFriends(response: KakaoFriendsApiResponse): KakaoFriendResponse[] {
  if (!Array.isArray(response.elements)) {
    return []
  }

  return response.elements
    .filter((friend): friend is KakaoFriendResponse => Boolean(friend) && typeof friend === "object")
    .filter((friend) => Boolean(friend.id ?? friend.uuid ?? friend.profile_nickname))
}

export function initKakao() {
  if (typeof window === "undefined" || !window.Kakao) {
    return false
  }

  const jsKey = getKakaoJsKey()

  if (!jsKey || jsKey === "your_javascript_key_here") {
    console.warn("Kakao JavaScript key is not configured. Set NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY or NEXT_PUBLIC_KAKAO_JS_KEY.")
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
        console.warn("Kakao SDK failed to load or initialize within timeout.")
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

  if (getKakaoAccessToken(Kakao)) {
    return requestKakaoApi<KakaoUserResponse>(Kakao, { url: "/v2/user/me" })
  }

  if (!hasKakaoAuthLogin(Kakao)) {
    console.warn("Kakao.Auth.login is not available. Staying on the participant screen.", Kakao)
    throw new KakaoSdkUnavailableError()
  }

  return new Promise<KakaoUserResponse>((resolve, reject) => {
    Kakao.Auth.login({
      scope: KAKAO_LOGIN_SCOPES.join(","),
      success: async () => {
        try {
          const profile = await requestKakaoApi<KakaoUserResponse>(Kakao, { url: "/v2/user/me" })
          resolve(profile)
        } catch (error) {
          reject(error)
        }
      },
      fail: (error: unknown) => {
        console.warn("Kakao SDK login failed", error)
        reject(error)
      },
    })
  })
}

export async function logoutFromKakao() {
  const Kakao = await waitForKakaoSdk()

  if (getKakaoAccessToken(Kakao) && typeof Kakao?.Auth?.logout === "function") {
    await new Promise<void>((resolve) => {
      Kakao.Auth.logout(() => resolve())
    })
  }
}

export async function getKakaoFriends() {
  const Kakao = await waitForKakaoSdk()

  if (!hasKakaoApiRequest(Kakao)) {
    console.warn("Kakao.API.request is not available. Friend API cannot be called.", Kakao)
    throw new KakaoSdkUnavailableError()
  }

  if (!getKakaoAccessToken(Kakao)) {
    await loginWithKakao()
  }

  const response = await requestKakaoApi<KakaoFriendsApiResponse>(Kakao, {
    url: "/v1/api/talk/friends",
    data: {
      limit: 100,
      order: "asc",
    },
  })

  return normalizeKakaoFriends(response)
}

export function shareToKakao({
  title,
  description,
  imageUrl,
  buttonText,
  link,
  payLink,
}: {
  title: string
  description: string
  imageUrl?: string
  buttonText: string
  link: string
  payLink?: string
}) {
  if (typeof window === "undefined" || !window.Kakao || !initKakao()) {
    return
  }

  if (typeof window.Kakao.Share?.sendDefault !== "function") {
    console.warn("Kakao.Share.sendDefault is not available.", window.Kakao)
    return
  }

  const detailLink = {
    mobileWebUrl: link,
    webUrl: link,
  }
  const kakaoPayLink = payLink ?? "https://pay.kakao.com/"
  const contentLink = payLink
    ? {
        mobileWebUrl: kakaoPayLink,
        webUrl: kakaoPayLink,
      }
    : detailLink
  const visibleDescription = payLink
    ? `${description}\n카드를 누르면 카카오페이 송금 안내로 이동합니다.`
    : description
  const payload = {
    objectType: "feed",
    content: {
      title,
      description: visibleDescription,
      imageUrl: imageUrl || "https://your-app.com/placeholder-logo.png",
      link: contentLink,
    },
    buttons: [
      {
        title: buttonText,
        link: detailLink,
      },
      {
        title: "카카오페이 송금하기",
        link: {
          mobileWebUrl: kakaoPayLink,
          webUrl: kakaoPayLink,
        },
      },
    ],
  }

  console.log("Kakao.Share.sendDefault payload", payload)
  console.log("Kakao.Share.sendDefault buttons", {
    count: payload.buttons.length,
    titles: payload.buttons.map((button) => button.title),
  })

  window.Kakao.Share.sendDefault(payload)
}
