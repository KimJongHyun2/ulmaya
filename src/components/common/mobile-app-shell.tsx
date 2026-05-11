import type { ReactNode } from "react"

export default function MobileAppShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-md min-h-screen">{children}</div>
    </main>
  )
}
