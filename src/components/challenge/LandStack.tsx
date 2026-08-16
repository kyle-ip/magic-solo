import type { CSSProperties, MouseEvent } from 'react'
import { ArenaCard } from './ArenaCard'
import type { LandStackGroup } from '../../challenge/landStacks'

type PreviewPayload = { image: string; name: string; text: string }

export function LandStack({
  stack,
  label,
  onPreview,
  onClearPreview,
}: {
  stack: LandStackGroup
  label: string
  onPreview?: (payload: PreviewPayload, e: MouseEvent) => void
  onClearPreview?: () => void
}) {
  const allTapped = stack.tappedCount === stack.count
  const mixed = stack.tappedCount > 0 && !allTapped

  return (
    <div
      className={`land-stack${allTapped ? ' is-all-tapped' : ''}${mixed ? ' is-mixed' : ''}`}
      data-count={stack.count}
      style={{ '--stack-n': Math.min(stack.count, 4) } as CSSProperties}
    >
      {stack.count > 1 ? (
        <span className="land-stack-count" aria-label={`×${stack.count}`}>
          ×{stack.count}
        </span>
      ) : null}
      {stack.tappedCount > 0 ? (
        <span className="land-stack-tapped" title={`${stack.tappedCount} tapped`}>
          {stack.tappedCount}⤵
        </span>
      ) : null}
      <div className="land-stack-sheets" aria-hidden={stack.count > 1}>
        {Array.from({ length: Math.min(stack.count - 1, 3) }, (_, i) => (
          <span key={i} className="land-stack-sheet" style={{ '--sheet-i': i } as CSSProperties} />
        ))}
      </div>
      <ArenaCard
        variant="board"
        instanceId={stack.top.instanceId}
        image={stack.image}
        name={label}
        colors={stack.produces}
        tapped={allTapped}
        dimmed={allTapped}
        onMouseEnter={
          onPreview
            ? (e) =>
                onPreview(
                  {
                    image: stack.image,
                    name: label,
                    text: [
                      stack.typeLine,
                      stack.count > 1 ? `×${stack.count}` : '',
                      stack.tappedCount > 0 ? `${stack.tappedCount} tapped` : '',
                    ]
                      .filter(Boolean)
                      .join('\n'),
                  },
                  e,
                )
            : undefined
        }
        onMouseLeave={onClearPreview}
      />
    </div>
  )
}
