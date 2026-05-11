"use client"

import { useEffect, useState } from "react"
import { Check, Loader2 } from "lucide-react"

interface OcrProcessingScreenProps {
  onComplete: () => void
}

const steps = [
  { id: 1, label: "이미지 업로드 완료" },
  { id: 2, label: "텍스트 추출 중" },
  { id: 3, label: "메뉴 분석 중" },
]

export default function OcrProcessingScreen({ onComplete }: OcrProcessingScreenProps) {
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    const timers: NodeJS.Timeout[] = []

    timers.push(setTimeout(() => setCurrentStep(1), 500))
    timers.push(setTimeout(() => setCurrentStep(2), 1200))
    timers.push(setTimeout(() => setCurrentStep(3), 2000))
    timers.push(setTimeout(onComplete, 2800))

    return () => timers.forEach(clearTimeout)
  }, [onComplete])

  return (
    <div className="flex flex-col min-h-screen px-6 py-8">
      {/* Header */}
      <div className="pt-4 pb-8">
        <h2 className="text-xl font-bold text-foreground text-center">
          OCR 분석 중...
        </h2>
      </div>

      {/* Receipt Preview */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8">
        <div className="w-64 h-80 bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
          <div className="h-full flex flex-col items-center justify-center p-6">
            <div className="w-full space-y-3">
              <div className="h-4 bg-muted rounded animate-pulse" />
              <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
              <div className="h-px bg-border my-4" />
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex justify-between">
                    <div className="h-3 bg-muted rounded w-20 animate-pulse" />
                    <div className="h-3 bg-muted rounded w-12 animate-pulse" />
                  </div>
                ))}
              </div>
              <div className="h-px bg-border my-4" />
              <div className="flex justify-between">
                <div className="h-4 bg-muted rounded w-12 animate-pulse" />
                <div className="h-4 bg-muted rounded w-16 animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="w-full max-w-xs space-y-3">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${
                currentStep >= step.id
                  ? "bg-primary/10"
                  : "bg-muted/50"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                  currentStep > step.id
                    ? "bg-primary"
                    : currentStep === step.id
                    ? "bg-primary"
                    : "bg-muted"
                }`}
              >
                {currentStep > step.id ? (
                  <Check className="w-4 h-4 text-primary-foreground" />
                ) : currentStep === step.id ? (
                  <Loader2 className="w-4 h-4 text-primary-foreground animate-spin" />
                ) : (
                  <span className="text-xs text-muted-foreground">{step.id}</span>
                )}
              </div>
              <span
                className={`text-sm font-medium ${
                  currentStep >= step.id
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
