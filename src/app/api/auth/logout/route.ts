import { NextRequest, NextResponse } from "next/server"

export function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.delete("ulmaya_kakao_user")

  return response
}

export function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/", request.url))
  response.cookies.delete("ulmaya_kakao_user")

  return response
}
