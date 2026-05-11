"use client"

import { Camera, ImageIcon, Receipt } from "lucide-react"

interface HomeScreenProps {
  onCameraClick: () => void
  onUploadClick: () => void
}

export default function HomeScreen({ onCameraClick, onUploadClick }: HomeScreenProps) {
  return (
    <div className="flex flex-col min-h-screen px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-center pt-12 pb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center">
            <Receipt className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">얼마야?</h1>
        </div>
      </div>

      {/* Tagline */}
      <div className="text-center mb-12">
        <p className="text-lg text-muted-foreground">
          영수증 한 장으로 정산 끝
        </p>
      </div>

      {/* Illustration Area */}
      <div className="flex-1 flex items-center justify-center mb-8">
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

      {/* Main Action Buttons */}
      <div className="space-y-4 pb-8">
        <button
          onClick={onCameraClick}
          className="w-full py-5 px-6 bg-primary text-primary-foreground rounded-2xl font-semibold text-lg flex items-center justify-center gap-3 shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform"
        >
          <Camera className="w-6 h-6" />
          영수증 찍기
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
