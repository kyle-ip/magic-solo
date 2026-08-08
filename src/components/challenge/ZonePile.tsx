interface ZonePileProps {
  label: string
  count: number
  kind: 'library' | 'graveyard' | 'exile'
  onClick?: () => void
}

export function ZonePile({ label, count, kind, onClick }: ZonePileProps) {
  return (
    <button
      type="button"
      className={`zone-pile kind-${kind}`}
      onClick={onClick}
      disabled={!onClick}
      title={`${label}: ${count}`}
    >
      <span className="zone-pile-stack" aria-hidden="true" />
      <span className="zone-pile-count">{count}</span>
      <span className="zone-pile-label">{label}</span>
    </button>
  )
}
