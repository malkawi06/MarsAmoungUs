import type { ReactNode } from 'react'
import { Info } from 'lucide-react'

/** A small (i) that opens a note in place: secondary detail stays one click away. */
export function InfoTip({
  label,
  align = 'left',
  children,
}: {
  label: string
  /** Which edge the note lines up with; use 'right' near the right side of the screen. */
  align?: 'left' | 'right'
  children: ReactNode
}) {
  return (
    <details className="group relative inline-block align-middle">
      <summary
        aria-label={label}
        title={label}
        className="inline-grid size-5 cursor-pointer list-none place-items-center rounded-full text-muted hover:text-accent group-open:text-accent [&::-webkit-details-marker]:hidden"
      >
        <Info className="size-4" aria-hidden />
      </summary>
      <div
        className={`absolute top-6 z-30 w-72 max-w-[80vw] space-y-2 ${align === 'right' ? 'right-0' : 'left-0'} rounded-lg border border-border bg-surface p-3 text-left text-xs font-normal tracking-normal text-fg-2 normal-case shadow-lg`}
      >
        {children}
      </div>
    </details>
  )
}
