import { NextRequest, NextResponse } from "next/server"

interface ClovaOcrField {
  inferText?: string
  lineBreak?: boolean
}

interface ClovaOcrImage {
  fields?: ClovaOcrField[]
}

interface ClovaOcrResponse {
  images?: ClovaOcrImage[]
}

function getImageFormat(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase()

  if (extension) {
    return extension === "jpg" ? "jpeg" : extension
  }

  const [, subtype] = file.type.split("/")
  return subtype || "jpg"
}

function extractRawText(data: ClovaOcrResponse) {
  return (data.images ?? [])
    .flatMap((image) => image.fields ?? [])
    .reduce((text, field) => {
      const value = field.inferText?.trim()

      if (!value) {
        return text
      }

      if (!text) {
        return value
      }

      return `${text}${field.lineBreak ? "\n" : " "}${value}`
    }, "")
}

export async function POST(request: NextRequest) {
  const apiUrl = process.env.CLOVA_OCR_API_URL
  const secretKey = process.env.CLOVA_OCR_SECRET_KEY

  if (!apiUrl || !secretKey) {
    return NextResponse.json(
      { message: "Clova OCR environment variables are not configured." },
      { status: 500 },
    )
  }

  const formData = await request.formData()
  const file = formData.get("image")

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "Image file is required." }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const requestBody = {
    version: "V2",
    requestId: crypto.randomUUID(),
    timestamp: Date.now(),
    images: [
      {
        format: getImageFormat(file),
        name: file.name || "receipt",
        data: buffer.toString("base64"),
      },
    ],
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-OCR-SECRET": secretKey,
    },
    body: JSON.stringify(requestBody),
  })

  const data = (await response.json()) as ClovaOcrResponse

  if (!response.ok) {
    return NextResponse.json(
      { message: "Clova OCR request failed.", detail: data },
      { status: response.status },
    )
  }

  return NextResponse.json({ rawText: extractRawText(data), data })
}
