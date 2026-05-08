/* eslint-disable react-refresh/only-export-components */
import { Link, createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { listUsers } from '../api/users'
import { queryKeys } from '../api/queryKeys'
import { Skeleton } from '../components/ui/Skeleton'

export const Route = createFileRoute('/users')({
  component: UsersPage,
})

const USER_LIMIT = 50
const EMPTY_USERS: Awaited<ReturnType<typeof listUsers>> = []
const USER_SKELETONS = Array.from({ length: 6 }, (_, index) => index)

function formatJoinedDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function UserCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex min-h-28 animate-pulse gap-3 rounded-xs border border-border bg-surface p-4"
    >
      <Skeleton className="size-14 shrink-0 rounded-full bg-bg" />
      <div className="min-w-0 flex-1">
        <Skeleton className="h-5 w-7/12" />
        <Skeleton className="mt-2 h-3 w-5/12 bg-border/60" />
        <Skeleton className="mt-5 h-3 w-24 bg-border/60" />
      </div>
    </div>
  )
}

function UsersPage() {
  const usersQuery = useQuery({
    queryKey: queryKeys.users.list(USER_LIMIT),
    queryFn: () => listUsers(USER_LIMIT),
  })
  const users = usersQuery.data ?? EMPTY_USERS
  const error = usersQuery.error instanceof Error
    ? usersQuery.error.message
    : usersQuery.error
    ? 'Unable to load users.'
    : null

  return (
    <div className="pb-8">
      <div className="mb-5 border-b border-border pb-4">
        <h1 className="font-serif text-2xl font-medium leading-tight text-ink">Users</h1>
        <p className="mt-2 font-sans text-sm text-sepia">
          Readers sharing shelves and reviews.
        </p>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-xs border border-border bg-surface px-4 py-3 font-serif text-sm italic text-sepia">
          {error}
        </p>
      )}

      {usersQuery.isPending ? (
        <div aria-busy="true" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {USER_SKELETONS.map(index => (
            <UserCardSkeleton key={index} />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-xs border border-border bg-surface px-4 py-5">
          <p className="font-serif text-sm italic text-sepia">No public users yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {users.map(user => (
            <Link
              key={user.id}
              to="/users/$username"
              params={{ username: user.username }}
              className="group flex min-h-28 gap-3 rounded-xs border border-border bg-surface p-4 transition-colors hover:border-accent"
            >
              <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-bg font-sans text-xl uppercase text-highlight">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={`${user.username} avatar`}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  user.username.slice(0, 1)
                )}
              </div>
              <div className="min-w-0">
                <h2 className="break-words font-serif text-xl font-medium leading-tight text-ink transition-colors group-hover:text-highlight">
                  {user.username}
                </h2>
                <p className="mt-1 truncate font-sans text-sm text-sepia">
                  Joined {formatJoinedDate(user.created_at)}
                </p>
                <p className="mt-3 font-sans text-xs uppercase tracking-wide text-link">
                  View profile
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
