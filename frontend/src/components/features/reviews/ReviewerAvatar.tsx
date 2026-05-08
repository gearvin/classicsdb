import { Link } from '@tanstack/react-router'

interface ReviewerAvatarProps {
  avatarUrl?: string | null
  className?: string
  linkToProfile?: boolean
  username: string
}

export default function ReviewerAvatar({
  avatarUrl,
  className = 'size-8',
  linkToProfile = true,
  username,
}: ReviewerAvatarProps) {
  const initial = username.trim().slice(0, 1) || '?'
  const avatar = (
    <div
      className={`${className} flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface font-sans text-xs uppercase text-highlight`}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={`${username} avatar`}
          className="h-full w-full object-cover"
        />
      ) : (
        initial
      )}
    </div>
  )

  if (!linkToProfile) {
    return avatar
  }

  return (
    <Link
      to="/users/$username"
      params={{ username }}
      aria-label={`View ${username}'s profile`}
      className="shrink-0 transition-opacity hover:opacity-80"
    >
      {avatar}
    </Link>
  )
}
