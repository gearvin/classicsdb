import { createFileRoute } from '@tanstack/react-router'
import SectionHeader from '../components/ui/SectionHeader'
import ReviewCard, { type Review } from '../components/features/ReviewCard'
import DiscussionRow, { type Discussion } from '../components/features/DiscussionRow'

export const Route = createFileRoute('/')({
  component: Home,
})

// ── Placeholder data ───────────────────────────────────────────────────────────

const RECENT_REVIEWS: Review[] = [
  {
    id: 1,
    bookTitle: 'Crime and Punishment',
    author: 'Fyodor Dostoevsky',
    rating: 4.5,
    excerpt:
      'Last night I had a dream where I committed a crime and also got punished... it reminded me of how I am literally Raskolnikov. Lorem ipsu...',
    reviewer: 'joshmason',
    date: '2026-04-24',
    hasMore: true,
  },
  {
    id: 2,
    bookTitle: 'The Count of Monte Cristo',
    author: 'Alexandre Dumas',
    rating: 1,
    excerpt: 'Placeholder text\nBottom text',
    reviewer: 'testingguy',
    date: '2026-04-24',
  },
  {
    id: 3,
    bookTitle: 'War and Peace',
    author: 'Leo Tolstoy',
    rating: 5,
    excerpt: 'Lorem ipsum et cetera',
    reviewer: 'example',
    date: '2026-04-23',
  },
  {
    id: 4,
    bookTitle: 'Pride and Prejudice',
    author: 'Jane Austen',
    rating: 2.5,
    excerpt: 'idk',
    reviewer: 'joshmason',
    date: '2026-04-22',
    hasMore: true,
  },
]

const RECENT_DISCUSSIONS: Discussion[] = [
  {
    id: 1,
    title: 'i love raving (I am raskolnikov)',
    book: 'Crime and Punishment',
    replies: 94,
    lastActive: '1h ago',
  },
  {
    id: 2,
    title: 'Megathread: books tagged "unreliable narrator" — recommendations',
    replies: 340,
    lastActive: '6h ago',
  },
  {
    id: 3,
    title: 'I don\'t like how people talk about books now',
    book: 'The Brothers Karamazov',
    replies: 41,
    lastActive: '4h ago',
  },
  {
    id: 4,
    title: 'Reading group: Middlemarch week 3 — books 5 & 6',
    book: 'Middlemarch',
    replies: 28,
    lastActive: '2d ago',
  },
]

// ── Page ───────────────────────────────────────────────────────────────────────

function Home() {
  return (
    <div>
      {/* Title block */}
      <div className="mb-6 pb-4 border-b-3 border-border">
        <h1 className="font-serif font-bold text-2xl text-ink tracking-tight leading-none mb-2">
          ClassicsDB
        </h1>
        <p className="font-serif text-sepia italic">
          This is a database and forum dedicated to classic novels. WIP :)
        </p>
      </div>

      {/* Announcements */}
      <section className="mb-8">
        <SectionHeader title="Announcements" href="/reviews" />
        <div className="w-full h-15 flex justify-center items-center border border-border bg-bg">
          <p className="font-semibold text-dust">WIP</p>
        </div>
      </section>

      {/* Recent Reviews */}
      <section className="mb-8">
        <SectionHeader title="Recent Reviews" href="/reviews" />
        <div className="grid grid-cols-2 grid-rows-2 gap-4 pt-2">
          {RECENT_REVIEWS.map(review => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      </section>

      {/* Recent Discussions */}
      <section className="mb-8">
        <SectionHeader title="Recent Discussions" href="/forums" />
        {RECENT_DISCUSSIONS.map(discussion => (
          <DiscussionRow key={discussion.id} discussion={discussion} />
        ))}
      </section>
    </div>
  )
}