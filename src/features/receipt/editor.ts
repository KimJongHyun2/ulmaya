import type { MenuItem } from "@/types/receipt"

export function updateMenuItem(
  menuItems: MenuItem[],
  editingId: number,
  nextName: string,
  nextPrice: string,
): MenuItem[] {
  return menuItems.map((item) =>
    item.id === editingId
      ? { ...item, name: nextName, price: Number.parseInt(nextPrice.replace(/[^\d]/g, ""), 10) || 0 }
      : item,
  )
}
