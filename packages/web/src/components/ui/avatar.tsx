import type { ReactNode } from 'react'

export function Avatar({ children }: { children: ReactNode }) {
  return <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 text-xs">{children}</div>
}
