/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getBook, listBookCovers } from '../api/books'
import { queryKeys } from '../api/queryKeys'
import {
  BookCoversList,
  BookSectionError,
  BookSectionLoading,
  BookSubpageHeader,
} from '../components/features/books/BookSubpages'

export const Route = createFileRoute('/book_/$bookId/covers')({
  component: BookCoversPage,
})

function BookCoversPage() {
  const { bookId } = Route.useParams()

  const bookQuery = useQuery({
    queryKey: queryKeys.books.detail(bookId),
    queryFn: () => getBook(bookId),
  })

  const coversQuery = useQuery({
    queryKey: queryKeys.books.covers(bookId),
    queryFn: () => listBookCovers(bookId),
  })

  const book = bookQuery.data ?? null
  const error = bookQuery.error instanceof Error
    ? bookQuery.error.message
    : coversQuery.error instanceof Error
    ? coversQuery.error.message
    : bookQuery.error || coversQuery.error
    ? 'Unable to load book covers.'
    : null

  if (bookQuery.isPending) return <BookSectionLoading label="book" />
  if (error || !book) return <BookSectionError message={error ?? 'Book not found.'} />

  return (
    <div className="pb-8">
      <BookSubpageHeader book={book} title="Covers" />
      {coversQuery.isPending ? (
        <BookSectionLoading label="covers" />
      ) : (
        <BookCoversList book={book} covers={coversQuery.data ?? []} />
      )}
    </div>
  )
}
