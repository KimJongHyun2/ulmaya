import { NextRequest, NextResponse } from "next/server"

function decodeCookieValue(value: string) {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8"))
  } catch {
    return null
  }
}

export function GET(request: NextRequest) {
  const cookieValue = request.cookies.get("ulmaya_kakao_user")?.value

  if (!cookieValue) {
    return NextResponse.json({ user: null })
  }

  return NextResponse.json({ user: decodeCookieValue(cookieValue) })
}
