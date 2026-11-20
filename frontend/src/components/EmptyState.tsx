import React from 'react'
import { Link } from 'react-router-dom'

type EmptyStateProps = {
  icon?: React.ReactNode
  title: string
  description: string
  actionLabel?: string
  actionTo?: string
  onAction?: () => void
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionTo,
  onAction,
}: EmptyStateProps) {
  const defaultIcon = (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#0B2A5B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="15" y2="17" />
    </svg>
  )

  return (
    <div className="card empty-state" role="status">
      <div className="empty-state-icon" aria-hidden="true">
        {icon || defaultIcon}
      </div>
      <h3>{title}</h3>
      <p className="muted-copy">{description}</p>
      {actionLabel && actionTo && (
        <div className="empty-state-action">
          <Link to={actionTo} className="primary-button link-button">
            {actionLabel}
          </Link>
        </div>
      )}
      {actionLabel && !actionTo && onAction && (
        <div className="empty-state-action">
          <button type="button" onClick={onAction} className="primary-button">
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  )
}
