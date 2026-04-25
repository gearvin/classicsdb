export interface Discussion {
  id: number
  title: string
  book?: string
  replies: number
  lastActive: string
}

export default function DiscussionRow({ discussion }: { discussion: Discussion }) {
  return (
    <div className="flex items-baseline justify-between py-2.5 border-b border-border cursor-pointer group">
      <div className="min-w-0 pr-4">
        <div className="font-serif text-sm font-semibold text-link underline underline-offset-2 decoration-border group-hover:decoration-[#2C2A50] leading-snug">
          {discussion.title}
        </div>
        <div className="font-sans text-sm text-sepia mt-0.5">
          {discussion.book && (
            <span className="font-medium">{discussion.book} · </span>
          )}
          {discussion.lastActive} ({discussion.replies} replies)
        </div>
      </div>
    </div>
  )
}
