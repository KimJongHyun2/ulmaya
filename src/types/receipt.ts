export interface ReceiptInfo {
  storeName: string
  location: string
  visitedAt: string
  summaryDate: string
  imagePreview?: string
  imageUrl?: string
  rawText?: string
  totalAmount?: number
}

export interface MenuItem {
  id: number
  name: string
  price: number
  assignedTo: string[]
  isNbbang: boolean
}
