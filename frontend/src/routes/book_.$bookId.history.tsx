/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getBook, listBookHistory } from '../api/books'
import { queryKeys } from '../api/queryKeys'
import {
  BookSectionError,
  BookSectionLoading,
  BookSubpageHeader,
  EntryHistory,
} from '../components/features/books/BookSubpages'

export const Route = createFileRoute('/book_/$bookId/history')({
  component: BookHistoryPage,
})

function BookHistoryPage() {
  const { bookId } = Route.useParams()

  const bookQuery = useQuery({
    queryKey: queryKeys.books.detail(bookId),
    queryFn: () => getBook(bookId),
  })

  const historyQuery = useQuery({
    queryKey: queryKeys.books.history(bookId),
    queryFn: () => listBookHistory(bookId),
  })

  const book = bookQuery.data ?? null
  const error = bookQuery.error instanceof Error
    ? bookQuery.error.message
    : historyQuery.error instanceof Error
    ? historyQuery.error.message
    : bookQuery.error || historyQuery.error
    ? 'Unable to load book history.'
    : null

  if (bookQuery.isPending) return <BookSectionLoading label="book" />
  if (error || !book) return <BookSectionError message={error ?? 'Book not found.'} />

  return (
    <div className="pb-8">
      <BookSubpageHeader book={book} title="History" />
      <EntryHistory isLoading={historyQuery.isPending} revisions={historyQuery.data ?? []} />
    </div>
  )
}
