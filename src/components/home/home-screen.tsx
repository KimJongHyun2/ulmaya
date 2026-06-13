"use client"

import { Camera, ImageIcon, LogIn, LogOut, Receipt } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/common/ui/avatar"
import { useUser } from "@/features/auth/user-context"

interface HomeScreenProps {
  onCameraClick: () => void
  onUploadClick: () => void
}

export default function HomeScreen({ onCameraClick, onUploadClick }: HomeScreenProps) {
  const { user, isLoading, logout } = useUser()

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch (error) {
      console.error("Session logout failed", error)
    }

    logout()
  }

  return (
    <div className="flex flex-col min-h-screen px-6 py-8">
      <div className="flex items-center justify-between pt-4 mb-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Receipt className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-xl text-foreground">얼마야</span>
        </div>

        {!isLoading && user && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold">{user.nickname}</p>
              <button onClick={handleLogout} className="text-xs text-muted-foreground flex items-center gap-1">
                로그아웃 <LogOut className="w-3 h-3" />
              </button>
            </div>
            <Avatar className="w-10 h-10 border border-border">
              <AvatarImage src={user.profile_image} />
              <AvatarFallback>{user.nickname[0]}</AvatarFallback>
            </Avatar>
          </div>
        )}

        {!isLoading && !user && (
          <a
            href="/api/auth/kakao/login"
            className="text-sm font-semibold text-foreground flex items-center gap-1"
          >
            카카오 로그인 <LogIn className="w-4 h-4" />
          </a>
        )}
      </div>

      <div className="text-center mb-8">
        <p className="text-lg text-muted-foreground">
          영수증 한 장으로 정산 끝
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center mb-12">
        <div className="relative w-48 h-64">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-3xl" />
          <div className="absolute inset-4 bg-card rounded-2xl shadow-lg flex flex-col items-center justify-center gap-3 border border-border">
            <Receipt className="w-16 h-16 text-primary" />
            <div className="space-y-1.5 w-full px-4">
              <div className="h-2 bg-muted rounded-full" />
              <div className="h-2 bg-muted rounded-full w-3/4" />
              <div className="h-2 bg-muted rounded-full w-1/2" />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 pb-8">
        <button
          onClick={onCameraClick}
          className="w-full py-5 px-6 bg-primary text-primary-foreground rounded-2xl font-semibold text-lg flex items-center justify-center gap-3 shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform"
        >
          <Camera className="w-6 h-6" />
          영수증 촬영하기
        </button>

        <button
          onClick={onUploadClick}
          className="w-full py-5 px-6 bg-card text-foreground rounded-2xl font-semibold text-lg flex items-center justify-center gap-3 border-2 border-border active:scale-[0.98] transition-transform"
        >
          <ImageIcon className="w-6 h-6" />
          사진 올리기
        </button>
      </div>
    </div>
  )
}
