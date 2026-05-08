import { Link } from '@tanstack/react-router'
import type { BookAuthor } from '../../../api/books'
import { getUniqueBookAuthors } from './display'

export default function BookAuthorLinks({ authors }: { authors: BookAuthor[] }) {
  if (authors.length === 0) {
    return <>Unknown author</>
  }

  return getUniqueBookAuthors(authors).map((author, index) => (
    <span key={author.author_id}>
      {index > 0 && ', '}
      <Link
        to="/authors/$authorId"
        params={{ authorId: author.author_id.toString() }}
        className="text-link underline underline-offset-2 decoration-accent hover:text-highlight"
      >
        {author.author_name}
      </Link>
    </span>
  ))
}
