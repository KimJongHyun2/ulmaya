import { NextResponse } from "next/server"

export function GET() {
  const clientId = process.env.KAKAO_REST_API_KEY
  const redirectUri = process.env.KAKAO_REDIRECT_URI

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { message: "Kakao OAuth environment variables are not configured." },
      { status: 500 },
    )
  }

  const authorizeUrl = new URL("https://kauth.kakao.com/oauth/authorize")
  authorizeUrl.searchParams.set("client_id", clientId)
  authorizeUrl.searchParams.set("redirect_uri", redirectUri)
  authorizeUrl.searchParams.set("response_type", "code")
  authorizeUrl.searchParams.set("scope", "profile_nickname,profile_image,friends")

  return NextResponse.redirect(authorizeUrl)
}
