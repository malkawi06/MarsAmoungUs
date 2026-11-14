import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

/** A short line always shown, and the full explanation behind a click, so pages stay light. */
export function MoreDetails({
  summary,
  label = 'Read the full method',
  children,
}: {
  summary: ReactNode
  label?: string
  children: ReactNode
}) {
  return (
    <div>
      <p className="max-w-4xl">{summary}</p>
      <details className="group mt-2 max-w-4xl">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1 font-medium text-accent hover:underline [&::-webkit-details-marker]:hidden">
          {label}
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="mt-2 space-y-2">{children}</div>
      </details>
    </div>
  )
}
