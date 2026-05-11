export interface ReceiptInfo {
  storeName: string
  location: string
  visitedAt: string
  summaryDate: string
}

export interface MenuItem {
  id: number
  name: string
  price: number
  assignedTo: string[]
  isNbbang: boolean
}
