import type { MenuItem, ReceiptInfo } from "@/types/receipt"
import type { Participant } from "@/types/participants"

export const RECEIPT_INFO: ReceiptInfo = {
  storeName: "홍대 왕돈까스",
  location: "서울시 마포구 홍대입구역 1번출구",
  visitedAt: "2024년 3월 15일 19:32",
  summaryDate: "2024.03.15",
}

export const INITIAL_MENU_ITEMS: MenuItem[] = [
  { id: 1, name: "삼겹살 2인분", price: 36000, assignedTo: [], isNbbang: false },
  { id: 2, name: "볶음밥", price: 4000, assignedTo: [], isNbbang: false },
  { id: 3, name: "계란찜", price: 5000, assignedTo: [], isNbbang: false },
  { id: 4, name: "소주", price: 5000, assignedTo: [], isNbbang: false },
  { id: 5, name: "콜라", price: 2000, assignedTo: [], isNbbang: false },
]

export const DUMMY_FRIENDS: Participant[] = [
  { id: 1, name: "김민수", avatar: "🧑" },
  { id: 2, name: "이서연", avatar: "👩" },
  { id: 3, name: "박지훈", avatar: "👨" },
  { id: 4, name: "최유진", avatar: "👧" },
  { id: 5, name: "정태현", avatar: "🧔" },
]

export const FREQUENT_FRIENDS: Participant[] = DUMMY_FRIENDS.slice(0, 3)
