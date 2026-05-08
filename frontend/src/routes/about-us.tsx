/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about-us')({
  component: AboutUsPage,
})

function AboutUsPage() {
  return (
    <div>
      <h1 className="text-ink text-2xl font-medium mb-4">
        About Us
      </h1>
      <p className="font-sans text-sepia mb-6 text-justify">
        This project began as an attempt to build a central hub where people can find information about and discuss classic novels.
      </p>

      <h2 className="text-ink text-xl mb-2">What is a classic?</h2>
      <p className="font-sans text-sepia mb-2 text-justify">
        From Wikipedia:
      </p>
      <blockquote className="bg-surface px-6 py-6 mb-2">
        <p className="font-sans text-sepia text-justify italic">
          A classic is a book accepted as being exemplary or particularly noteworthy, usually of some chronological age since its original publications. What makes a book "classic" is a concern that has occurred to various authors ranging from Italo Calvino to Mark Twain and the related questions of "Why Read the Classics?" and "What Is a Classic?" have been essayed by authors from different genres and eras (including Calvino, T. S. Eliot, Charles Augustin Sainte-Beuve). The ability of a classic book to be reinterpreted, re-translated, abridged and parodied, to seemingly be renewed in the interests of generations of readers succeeding its creation, is a theme that is seen in the writings of literary critics including Michael Dirda, Ezra Pound, and Sainte-Beuve.        </p>
      </blockquote>
      <p className="font-sans text-sepia mb-6 text-justify">
        In this case, a classic is whatever I say it is.
      </p>

      <h2 className="text-ink text-xl mb-2">Why use ClassicsDB over Goodreads or any other service?</h2>
      <p className="font-sans text-sepia mb-4 text-justify">
        There is no reason. The website is currently lacking a lot of functionality... 
      </p>

    </div>
  )
}
