export interface Discussion {
  id: number
  title: string
  book?: string
  replies: number
  lastActive: string
}

export default function DiscussionRow({ discussion }: { discussion: Discussion }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 border-b border-border py-3">
      <div className="min-w-0 pr-4">
        <div className="break-words font-serif text-sm font-medium leading-snug text-link">
          {discussion.title}
        </div>
        <div className="mt-1 break-words font-sans text-sm text-sepia">
          {discussion.book && (
            <span className="">{discussion.book} · </span>
          )}
          {discussion.lastActive}
        </div>
      </div>
      <div className="shrink-0 font-sans text-sm text-accent">
        {discussion.replies} replies
      </div>
    </div>
  )
}
