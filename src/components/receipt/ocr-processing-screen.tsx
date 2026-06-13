"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, ScanText, Upload } from "lucide-react"
import { useSettlementFlow } from "@/features/settlement/flow-context"
import { parseMenuItemsFromRawText, parseReceiptInfoFromRawText } from "@/features/receipt/ocr"

const steps = [
  { id: 1, label: "이미지 업로드 완료" },
  { id: 2, label: "텍스트 추출 중" },
  { id: 3, label: "메뉴 분석 중" },
]

export default function OcrProcessingScreen() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const { receiptInfo, setReceiptInfo, setMenuItems, isReady } = useSettlementFlow()
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedImage, setSelectedImage] = useState<string>(receiptInfo.imagePreview ?? receiptInfo.imageUrl ?? "")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const handlePickFile = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const preview = URL.createObjectURL(file)
    setSelectedFile(file)
    setSelectedImage(preview)
    setReceiptInfo((prev) => ({
      ...prev,
      imagePreview: preview,
      imageUrl: preview,
      rawText: "",
    }))
    setCurrentStep(1)
    setErrorMessage("")
  }

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setErrorMessage("이미지를 먼저 선택해주세요.")
      return
    }

    setIsAnalyzing(true)
    setCurrentStep(2)
    setErrorMessage("")

    try {
      const formData = new FormData()
      formData.append("image", selectedFile)

      const response = await fetch("/api/ocr/clova", {
        method: "POST",
        body: formData,
      })

      const data = (await response.json()) as { rawText?: string; message?: string }

      if (!response.ok) {
        throw new Error(data.message ?? "Clova OCR request failed.")
      }

      const nextRawText = data.rawText?.trim() ?? ""
      const parsedReceiptInfo = parseReceiptInfoFromRawText(nextRawText, receiptInfo)
      const parsedMenuItems = parseMenuItemsFromRawText(nextRawText)

      setCurrentStep(3)
      setReceiptInfo((prev) => ({
        ...parsedReceiptInfo,
        imagePreview: selectedImage || prev.imagePreview,
        imageUrl: selectedImage || prev.imageUrl,
        rawText: nextRawText,
      }))
      setMenuItems(parsedMenuItems)

      console.log("Clova OCR raw text:", nextRawText)
      router.push("/receipt")
    } catch (error) {
      console.error("OCR analysis failed", error)
      setErrorMessage(error instanceof Error ? error.message : "OCR 분석에 실패했습니다.")
      setIsAnalyzing(false)
    }
  }

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          세션 준비 중...
        </div>
      </div>
    )
  }

  if (isAnalyzing) {
    return (
      <div className="flex min-h-screen flex-col px-6 py-12">
        <h2 className="text-center text-xl font-bold text-foreground">OCR 분석 중...</h2>

        <div className="flex flex-1 flex-col items-center justify-center gap-10">
          <div className="w-56 rounded-2xl border border-border bg-card px-8 py-10 shadow-lg">
            <div className="space-y-4">
              <div className="h-4 rounded bg-muted" />
              <div className="h-4 w-2/3 rounded bg-muted" />
              <div className="h-px bg-border" />
              <div className="grid grid-cols-2 gap-x-10 gap-y-3">
                {Array.from({ length: 10 }).map((_, index) => (
                  <div key={index} className="h-3 rounded bg-muted" />
                ))}
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between">
                <div className="h-4 w-14 rounded bg-muted" />
                <div className="h-4 w-16 rounded bg-muted" />
              </div>
            </div>
          </div>

          <div className="w-full max-w-sm space-y-4">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`flex items-center gap-4 rounded-2xl px-4 py-4 ${
                  currentStep >= step.id ? "bg-primary/10" : "bg-muted/50"
                }`}
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full ${
                    currentStep > step.id
                      ? "bg-primary text-primary-foreground"
                      : currentStep === step.id
                        ? "bg-primary/80 text-primary-foreground"
                        : "bg-background text-muted-foreground"
                  }`}
                >
                  {currentStep > step.id ? (
                    <Check className="h-4 w-4" />
                  ) : currentStep === step.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className="text-sm">{step.id}</span>
                  )}
                </div>
                <span className="font-semibold text-foreground">{step.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen px-6 py-8">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="pt-4 pb-6">
        <h2 className="text-xl font-bold text-foreground text-center">영수증 업로드 및 OCR</h2>
        <p className="mt-2 text-sm text-muted-foreground text-center">
          이미지를 선택하고 OCR 분석하기를 눌러주세요.
        </p>
      </div>

      <div className="flex-1 flex flex-col gap-6">
        <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
          {selectedImage ? (
            <img
              src={selectedImage}
              alt="영수증 미리보기"
              className="h-72 w-full rounded-2xl object-contain bg-muted"
            />
          ) : (
            <div className="flex h-72 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
              아직 선택한 이미지가 없습니다.
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handlePickFile}
            className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-4 font-semibold"
          >
            <Upload className="h-5 w-5" />
            이미지 선택
          </button>
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={!selectedFile}
            className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-4 font-semibold text-primary-foreground disabled:opacity-50"
          >
            <ScanText className="h-5 w-5" />
            OCR 분석하기
          </button>
        </div>

        {errorMessage && (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
            {errorMessage}
          </div>
        )}
      </div>
    </div>
  )
}
