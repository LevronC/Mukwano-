import { useEffect, useRef } from 'react'
import type { Notification } from '@/hooks/useNotifications'

const EVENT_ICONS: Record<string, string> = {
  CONTRIBUTION_VERIFIED: 'check_circle',
  PROJECT_STATUS_CHANGED: 'rocket_launch'
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

interface NotificationPanelProps {
  notifications: Notification[]
  onClose: () => void
}

export function NotificationPanel({ notifications, onClose }: NotificationPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [onClose])

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Notifications"
      className="absolute right-0 top-full mt-2 z-50 w-80 rounded-2xl border shadow-2xl overflow-hidden"
      style={{
        background: 'rgba(10, 20, 45, 0.98)',
        borderColor: 'rgba(240, 165, 0, 0.18)',
        backdropFilter: 'blur(16px)'
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'rgba(240, 165, 0, 0.12)' }}
      >
        <span className="text-sm font-semibold" style={{ color: 'var(--mk-gold)' }}>
          Notifications
        </span>
        <button
          onClick={onClose}
          className="rounded-full p-1 transition-colors hover:bg-white/10"
          style={{ color: 'var(--mk-muted)' }}
          aria-label="Close notifications"
          type="button"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            close
          </span>
        </button>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 px-4 text-center">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '36px', color: 'var(--mk-muted)' }}
            >
              notifications_none
            </span>
            <p className="text-sm" style={{ color: 'var(--mk-muted)' }}>
              You're all caught up
            </p>
          </div>
        ) : (
          <ul>
            {notifications.map((n) => (
              <li
                key={n.id}
                className="flex items-start gap-3 px-4 py-3 border-b transition-colors"
                style={{
                  borderColor: 'rgba(255,255,255,0.04)',
                  background: n.read ? 'transparent' : 'rgba(240, 165, 0, 0.05)'
                }}
              >
                <span
                  className="material-symbols-outlined mt-0.5 shrink-0"
                  style={{
                    fontSize: '18px',
                    color: n.read ? 'var(--mk-muted)' : 'var(--mk-gold)',
                    fontVariationSettings: n.read ? undefined : "'FILL' 1"
                  }}
                >
                  {EVENT_ICONS[n.event] ?? 'notifications'}
                </span>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm leading-snug"
                    style={{ color: n.read ? 'var(--mk-muted)' : 'var(--mk-text)' }}
                  >
                    {n.body}
                  </p>
                  <p className="mt-0.5 text-xs" style={{ color: 'var(--mk-muted)' }}>
                    {relativeTime(n.createdAt)}
                  </p>
                </div>
                {!n.read && (
                  <span
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                    style={{ background: 'var(--mk-gold)' }}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
