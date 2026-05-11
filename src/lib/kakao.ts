"use client"

declare global {
  interface Window {
    Kakao: any
  }
}

export function initKakao() {
  if (typeof window !== "undefined" && window.Kakao) {
    if (!window.Kakao.isInitialized()) {
      window.Kakao.init(process.env.NEXT_PUBLIC_KAKAO_JS_KEY)
      console.log("Kakao initialized:", window.Kakao.isInitialized())
    }
  }
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
  if (typeof window !== "undefined" && window.Kakao) {
    window.Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: title,
        description: description,
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
}

export function loginWithKakao() {
  return new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && window.Kakao) {
      window.Kakao.Auth.login({
        success: function (authObj: any) {
          console.log("Login success:", authObj)
          window.Kakao.API.request({
            url: "/v2/user/me",
            success: function (res: any) {
              console.log("User info:", res)
              resolve(res)
            },
            fail: function (error: any) {
              console.error("User info fail:", error)
              reject(error)
            },
          })
        },
        fail: function (err: any) {
          console.error("Login fail:", err)
          reject(err)
        },
      })
    } else {
      reject(new Error("Kakao SDK not loaded"))
    }
  })
}
