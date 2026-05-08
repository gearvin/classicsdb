/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getBook, listBookEditions } from '../api/books'
import { queryKeys } from '../api/queryKeys'
import {
  BookSectionError,
  BookSectionLoading,
  BookSubpageHeader,
  EditionsList,
} from '../components/features/books/BookSubpages'

export const Route = createFileRoute('/book_/$bookId/editions')({
  component: BookEditionsPage,
})

function BookEditionsPage() {
  const { bookId } = Route.useParams()

  const bookQuery = useQuery({
    queryKey: queryKeys.books.detail(bookId),
    queryFn: () => getBook(bookId),
  })

  const editionsQuery = useQuery({
    queryKey: queryKeys.books.editions(bookId),
    queryFn: () => listBookEditions(bookId),
  })

  const book = bookQuery.data ?? null
  const error = bookQuery.error instanceof Error
    ? bookQuery.error.message
    : editionsQuery.error instanceof Error
    ? editionsQuery.error.message
    : bookQuery.error || editionsQuery.error
    ? 'Unable to load book editions.'
    : null

  if (bookQuery.isPending) return <BookSectionLoading label="book" />
  if (error || !book) return <BookSectionError message={error ?? 'Book not found.'} />

  return (
    <div className="pb-8">
      <BookSubpageHeader book={book} title="Editions" />
      {editionsQuery.isPending ? (
        <BookSectionLoading label="editions" />
      ) : (
        <EditionsList editions={editionsQuery.data ?? []} />
      )}
    </div>
  )
}
