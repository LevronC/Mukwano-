export function Progress({
  value = 0,
  label,
  percentage = true,
}: {
  value?: number
  label?: string
  percentage?: boolean
}) {
  const clamped = Math.max(0, Math.min(100, value))

  return (
    <div className="w-full space-y-1">
      {(label !== undefined || percentage) && (
        <div className="flex items-center justify-between">
          {label !== undefined && (
            <span className="text-xs" style={{ color: 'var(--mk-muted)' }}>
              {label}
            </span>
          )}
          {percentage && (
            <span className="text-xs ml-auto" style={{ color: 'var(--mk-muted)' }}>
              {Math.round(clamped)}%
            </span>
          )}
        </div>
      )}
      <div
        className="h-2 w-full rounded-full"
        style={{ background: 'rgba(190,201,195,0.10)' }}
      >
        <div
          className="h-2 rounded-full transition-all"
          style={{
            width: `${clamped}%`,
            background: 'linear-gradient(90deg, var(--mk-gold), var(--mk-gold2))',
          }}
        />
      </div>
    </div>
  )
}
