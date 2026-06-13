"use client"

import { useRef, useState } from "react"
import { Check, Loader2, ScanText, Upload } from "lucide-react"
import { useSettlementFlow } from "@/features/settlement/flow-context"

const steps = [
  { id: 1, label: "이미지 업로드" },
  { id: 2, label: "텍스트 추출" },
  { id: 3, label: "OCR 결과 확인" },
]

export default function OcrProcessingScreen() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const { receiptInfo, setReceiptInfo, isReady } = useSettlementFlow()
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedImage, setSelectedImage] = useState<string>(receiptInfo.imagePreview ?? receiptInfo.imageUrl ?? "")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [rawText, setRawText] = useState(receiptInfo.rawText ?? "")
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
    setRawText("")
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

      setRawText(nextRawText)
      setReceiptInfo((prev) => ({
        ...prev,
        imagePreview: selectedImage,
        imageUrl: selectedImage,
        rawText: nextRawText,
      }))

      setCurrentStep(3)
      console.log("Clova OCR raw text:", nextRawText)
    } catch (error) {
      console.error("OCR analysis failed", error)
      setErrorMessage(error instanceof Error ? error.message : "OCR 분석에 실패했습니다.")
    } finally {
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
            disabled={!selectedFile || isAnalyzing}
            className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-4 font-semibold text-primary-foreground disabled:opacity-50"
          >
            {isAnalyzing ? <Loader2 className="h-5 w-5 animate-spin" /> : <ScanText className="h-5 w-5" />}
            OCR 분석하기
          </button>
        </div>

        <div className="space-y-3">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex items-center gap-3 rounded-xl p-3 ${currentStep >= step.id ? "bg-primary/10" : "bg-muted/50"}`}
            >
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${currentStep >= step.id ? "bg-primary" : "bg-muted"}`}>
                {currentStep > step.id ? (
                  <Check className="h-4 w-4 text-primary-foreground" />
                ) : currentStep === step.id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" />
                ) : (
                  <span className="text-xs text-muted-foreground">{step.id}</span>
                )}
              </div>
              <span className={`text-sm font-medium ${currentStep >= step.id ? "text-foreground" : "text-muted-foreground"}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {errorMessage && (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        {rawText && (
          <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-2 font-semibold text-foreground">OCR 원문 텍스트</h3>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-2xl bg-muted p-3 text-xs text-muted-foreground">
              {rawText}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
