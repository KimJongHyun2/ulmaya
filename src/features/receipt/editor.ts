import type { MenuItem } from "@/types/receipt"

export function updateMenuItem(
  menuItems: MenuItem[],
  editingId: number,
  nextName: string,
  nextPrice: string,
): MenuItem[] {
  return menuItems.map((item) =>
    item.id === editingId
      ? { ...item, name: nextName, price: Number.parseInt(nextPrice, 10) || 0 }
      : item,
  )
}
