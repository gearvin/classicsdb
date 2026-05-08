/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { type SubmitHandler, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { listAuthors, type Author } from '../api/authors'
import { createBook, type CreateBookInput } from '../api/books'
import { listLanguages, type Language } from '../api/languages'
import { queryKeys } from '../api/queryKeys'
import { createSuggestion } from '../api/suggestions'
import useAuth from '../auth/useAuth'
import { FieldLabel, FormSection, SelectInput, SmallButton, TextInput } from '../components/features/catalog/CatalogFormControls'

export const Route = createFileRoute('/add-book')({
  component: AddBookPage,
})

const DISPLAY_TITLE_LANGUAGE_CODE = 'eng'

const WORK_TYPES = [
  { value: 'novel', label: 'Novel' },
  { value: 'poem', label: 'Poem' },
  { value: 'play', label: 'Play' },
  { value: 'epic', label: 'Epic' },
  { value: 'essay', label: 'Essay' },
  { value: 'short_story', label: 'Short story' },
  { value: 'collection', label: 'Collection' },
  { value: 'other', label: 'Other' },
] as const

const TITLE_TYPES = [
  { value: 'original', label: 'Original' },
  { value: 'translated', label: 'Translated' },
  { value: 'alternative', label: 'Alternative' },
  { value: 'romanized', label: 'Romanized' },
  { value: 'abbreviation', label: 'Abbreviation' },
] as const

const FALLBACK_LANGUAGES: Language[] = [
  { code: 'eng', name: 'English', native_name: null, is_rtl: false },
  { code: 'fra', name: 'French', native_name: null, is_rtl: false },
  { code: 'deu', name: 'German', native_name: null, is_rtl: false },
  { code: 'grc', name: 'Ancient Greek', native_name: null, is_rtl: false },
  { code: 'ita', name: 'Italian', native_name: null, is_rtl: false },
  { code: 'jpn', name: 'Japanese', native_name: null, is_rtl: false },
  { code: 'lat', name: 'Latin', native_name: null, is_rtl: false },
  { code: 'por', name: 'Portuguese', native_name: null, is_rtl: false },
  { code: 'rus', name: 'Russian', native_name: null, is_rtl: false },
  { code: 'spa', name: 'Spanish', native_name: null, is_rtl: false },
]

type WorkType = typeof WORK_TYPES[number]['value']
type PublicationEra = 'ad' | 'bc'

interface TitleForm {
  isPrimary: boolean
  languageCode: string
  title: string
  titleType: string
}

interface AddBookForm {
  languageCode: string
  titles: TitleForm[]
  firstPublishedYear: string
  firstPublishedEra: PublicationEra
  workType: WorkType
  coverUrl: string
  description: string
  sourceNote: string
  entryNote: string
}

const initialForm: AddBookForm = {
  languageCode: 'eng',
  titles: [
    {
      isPrimary: true,
      languageCode: DISPLAY_TITLE_LANGUAGE_CODE,
      title: '',
      titleType: 'original',
    },
  ],
  firstPublishedYear: '',
  firstPublishedEra: 'ad',
  workType: 'novel',
  coverUrl: '',
  description: '',
  sourceNote: '',
  entryNote: '',
}

function buildCreateBookPayload(form: AddBookForm, authorIds: number[]): CreateBookInput {
  const publicationYear = form.firstPublishedYear.trim()
  const signedPublicationYear = publicationYear
    ? Number(publicationYear) * (form.firstPublishedEra === 'bc' ? -1 : 1)
    : null

  return {
    description: form.description.trim(),
    first_published_year: signedPublicationYear,
    work_type: form.workType,
    languages: [
      {
        language_code: form.languageCode,
        role: 'original',
        position: 0,
      },
    ],
    titles: form.titles
      .filter(title => title.title.trim() && title.languageCode)
      .map((title, position) => ({
        title: title.title.trim(),
        language_code: title.languageCode,
        title_type: title.titleType,
        is_primary: title.isPrimary,
        position,
      })),
    covers: form.coverUrl.trim()
      ? [{
          url: form.coverUrl.trim(),
          is_primary: true,
          source: form.sourceNote.trim() || null,
        }]
      : [],
    authors: authorIds.map((authorId, position) => ({
      author_id: authorId,
      role: 'author',
      position,
    })),
  }
}

function matchesSearch(value: string, query: string) {
  return value.toLowerCase().includes(query.trim().toLowerCase())
}

function formatLanguage(language: Language) {
  if (language.native_name && language.native_name !== language.name) {
    return `${language.name} (${language.native_name})`
  }

  return language.name
}

function formatPublicationYear(year: string, era: PublicationEra) {
  const trimmedYear = year.trim()
  if (!trimmedYear) {
    return 'Unknown'
  }

  return `${trimmedYear} ${era.toUpperCase()}`
}

function getPrimaryTitle(titles: TitleForm[]) {
  return titles.find(title => title.isPrimary && title.title.trim())?.title.trim()
    ?? ''
}

function LanguageCombobox({
  className = '',
  id,
  isLoading,
  onSelect,
  options,
  selectedCode,
}: {
  className?: string
  id: string
  isLoading: boolean
  onSelect: (code: string) => void
  options: Language[]
  selectedCode: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const selectedLanguage = options.find(language => language.code === selectedCode)
  const filteredLanguages = options
    .filter(language => (
      matchesSearch(language.name, query) ||
      matchesSearch(language.code, query) ||
      matchesSearch(language.native_name ?? '', query)
    ))
    .slice(0, 8)

  function selectLanguage(language: Language) {
    onSelect(language.code)
    setQuery('')
    setIsOpen(false)
  }

  return (
    <div className={`relative ${className}`}>
      <FieldLabel htmlFor={id}>Original language</FieldLabel>
      <input
        id={id}
        value={isOpen ? query : selectedLanguage ? formatLanguage(selectedLanguage) : selectedCode}
        onBlur={() => setTimeout(() => setIsOpen(false), 120)}
        onChange={event => {
          setQuery(event.target.value)
          setIsOpen(true)
        }}
        onFocus={() => {
          setQuery('')
          setIsOpen(true)
        }}
        placeholder={isLoading ? 'Loading languages...' : 'Search languages...'}
        className="h-9 w-full rounded-xs border border-border bg-bg px-3 font-sans text-sm text-ink outline-none transition-colors placeholder:text-dust focus:border-accent"
      />
      {isOpen && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.25rem)] z-20 max-h-64 overflow-y-auto rounded-xs border border-border bg-bg shadow-sm">
          {filteredLanguages.length > 0 ? filteredLanguages.map(language => (
            <button
              key={language.code}
              type="button"
              onMouseDown={event => event.preventDefault()}
              onClick={() => selectLanguage(language)}
              className={[
                'block w-full px-3 py-2 text-left font-sans text-sm transition-colors hover:bg-surface',
                language.code === selectedCode ? 'text-highlight' : 'text-ink',
              ].join(' ')}
            >
              <span>{formatLanguage(language)}</span>
              <span className="ml-2 text-xs uppercase text-dust">{language.code}</span>
            </button>
          )) : (
            <p className="px-3 py-3 font-sans text-sm text-sepia">No matching language.</p>
          )}
        </div>
      )}
    </div>
  )
}

function AuthorPicker({
  className = '',
  isLoading,
  onChange,
  options,
  selectedAuthors,
}: {
  className?: string
  isLoading: boolean
  onChange: (authors: Author[]) => void
  options: Author[]
  selectedAuthors: Author[]
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const selectedIds = new Set(selectedAuthors.map(author => author.id))
  const filteredAuthors = options
    .filter(author => !selectedIds.has(author.id))
    .filter(author => matchesSearch(author.name, query) || matchesSearch(author.sort_name ?? '', query))
    .slice(0, 8)

  function addAuthor(author: Author) {
    onChange([...selectedAuthors, author])
    setQuery('')
    setIsOpen(false)
  }

  function removeAuthor(authorId: number) {
    onChange(selectedAuthors.filter(author => author.id !== authorId))
  }

  return (
    <div className={className}>
      <FieldLabel htmlFor="authors" optional>Authors</FieldLabel>
      <div className="relative">
        <input
          id="authors"
          value={query}
          onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
          onChange={event => {
            setQuery(event.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={event => {
            if (event.key === 'Enter' && filteredAuthors[0]) {
              event.preventDefault()
              addAuthor(filteredAuthors[0])
            }
          }}
          placeholder={isLoading ? 'Loading authors...' : 'Search authors...'}
          className="h-9 w-full rounded-xs border border-border bg-bg px-3 font-sans text-sm text-ink outline-none transition-colors placeholder:text-dust focus:border-accent"
        />
        {isOpen && (
          <div className="absolute left-0 right-0 top-[calc(100%+0.25rem)] z-20 max-h-64 overflow-y-auto rounded-xs border border-border bg-bg shadow-sm">
            {filteredAuthors.length > 0 ? filteredAuthors.map(author => (
              <button
                key={author.id}
                type="button"
                onMouseDown={event => event.preventDefault()}
                onClick={() => addAuthor(author)}
                className="block w-full px-3 py-2 text-left font-sans text-sm text-ink transition-colors hover:bg-surface"
              >
                {author.name}
                {author.sort_name && author.sort_name !== author.name && (
                  <span className="ml-2 text-xs text-dust">{author.sort_name}</span>
                )}
              </button>
            )) : (
              <p className="px-3 py-3 font-sans text-sm text-sepia">
                {query.trim() ? 'No matching author found.' : 'Start typing to find an author.'}
              </p>
            )}
          </div>
        )}
      </div>

      {selectedAuthors.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedAuthors.map(author => (
            <span
              key={author.id}
              className="inline-flex max-w-full items-center gap-2 rounded-xs border border-border bg-surface px-2.5 py-1 font-sans text-sm text-ink"
            >
              <span className="min-w-0 break-words">{author.name}</span>
              <button
                type="button"
                onClick={() => removeAuthor(author.id)}
                className="shrink-0 text-dust hover:text-highlight"
                aria-label={`Remove ${author.name}`}
                title={`Remove ${author.name}`}
              >
                <svg aria-hidden="true" viewBox="0 0 12 12" className="h-3 w-3">
                  <path d="M3 3L9 9M9 3L3 9" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-2 font-sans text-xs text-sepia">
          Can't find the author you're looking for? Create an entry for them first.
        </p>
      )}
    </div>
  )
}

function AddBookPage() {
  const navigate = useNavigate({ from: '/add-book' })
  const queryClient = useQueryClient()
  const { accessToken, currentUser, isAuthenticated, isLoadingUser } = useAuth()
  const {
    control,
    getValues,
    handleSubmit: handleFormSubmit,
    register,
    reset,
    setValue,
  } = useForm<AddBookForm>({
    defaultValues: initialForm,
  })
  const {
    append: appendTitle,
    fields: titleFields,
    remove: removeTitle,
  } = useFieldArray({ control, name: 'titles' })
  const [selectedAuthors, setSelectedAuthors] = useState<Author[]>([])
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const isAdmin = currentUser?.is_admin === true
  const form = useWatch({ control }) as AddBookForm
  const authorsQuery = useQuery({
    queryKey: queryKeys.authors.list(),
    queryFn: () => listAuthors(),
  })
  const languagesQuery = useQuery({
    queryKey: queryKeys.languages.all,
    queryFn: () => listLanguages(),
  })
  const createBookMutation = useMutation({
    mutationFn: ({ entryNote, payload }: { entryNote: string; payload: CreateBookInput }) => (
      createBook(payload, accessToken ?? undefined, entryNote)
    ),
    onSuccess: book => {
      queryClient.invalidateQueries({ queryKey: queryKeys.books.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.books.detail(book.id) })
    },
  })
  const createSuggestionMutation = useMutation({
    mutationFn: ({ entryNote, payload }: { entryNote: string; payload: CreateBookInput }) => createSuggestion(accessToken!, {
      target_type: 'book',
      action: 'create',
      payload: { ...payload },
      submitter_note: entryNote.trim(),
    }),
    onSuccess: suggestion => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suggestions.mine(accessToken) })
      setSuccessMessage(`Suggestion #${suggestion.id} submitted for review.`)
      reset(initialForm)
      setSelectedAuthors([])
    },
  })
  const authors = authorsQuery.data ?? []
  const languages = languagesQuery.data && languagesQuery.data.length > 0
    ? languagesQuery.data
    : FALLBACK_LANGUAGES
  const lookupQueryError = authorsQuery.error ?? languagesQuery.error
  const lookupError = lookupQueryError instanceof Error
    ? lookupQueryError.message
    : lookupQueryError
    ? 'Unable to load entry lookups.'
    : null
  const isLoadingLookups = authorsQuery.isPending || languagesQuery.isPending
  const isSubmitting = createBookMutation.isPending || createSuggestionMutation.isPending

  const selectedWorkType = WORK_TYPES.find(type => type.value === form.workType)?.label ?? 'Other'
  const selectedLanguage = languages.find(language => language.code === form.languageCode) ?? FALLBACK_LANGUAGES.find(language => language.code === form.languageCode)
  const filledTitles = (form.titles ?? []).filter(title => title.title.trim() && title.languageCode)
  const primaryTitle = getPrimaryTitle(form.titles ?? [])
  const hasOnePrimaryTitle = filledTitles.filter(title => title.isPrimary).length === 1
  const canSubmit = isAuthenticated && !isLoadingUser && hasOnePrimaryTitle && !!primaryTitle && !!selectedLanguage && !isSubmitting

  if (isLoadingUser) {
    return (
      <div className="pb-8">
        <p className="font-serif italic text-sepia">Loading account...</p>
      </div>
    )
  }

  if (!isAuthenticated || accessToken === null) {
    return (
      <div className="pb-8">
        <section className="border-b border-border pb-5 mb-6">
          <h1 className="font-serif text-3xl font-medium text-ink leading-tight">
            Add a Book
          </h1>
          <p className="font-sans text-sm text-sepia mt-1 max-w-2xl">
            Log in to submit book entries for review.
          </p>
        </section>
        <Link
          to="/login"
          className="font-sans text-xs uppercase tracking-wide text-link hover:text-highlight underline underline-offset-2 decoration-accent"
        >
          Log in
        </Link>
      </div>
    )
  }

  const onSubmit: SubmitHandler<AddBookForm> = async values => {
    const titles = values.titles.filter(title => title.title.trim() && title.languageCode)
    if (titles.length === 0 || titles.filter(title => title.isPrimary).length !== 1) {
      setError('Add exactly one primary title.')
      return
    }

    const activeLanguage = languages.find(language => language.code === values.languageCode)
      ?? FALLBACK_LANGUAGES.find(language => language.code === values.languageCode)
    if (!activeLanguage) {
      setError('Choose a valid language.')
      return
    }

    if (!accessToken) {
      setError('Log in to submit book entries.')
      return
    }

    setError(null)
    setSuccessMessage(null)
    const payload = buildCreateBookPayload(values, selectedAuthors.map(author => author.id))

    try {
      if (isAdmin) {
        const book = await createBookMutation.mutateAsync({ entryNote: values.entryNote, payload })
        navigate({ to: '/book/$bookId', params: { bookId: String(book.id) } })
      } else {
        await createSuggestionMutation.mutateAsync({ entryNote: values.entryNote, payload })
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit this book.')
    }
  }

  function setPrimaryTitle(index: number) {
    setValue('titles', getValues('titles').map((title, titleIndex) => ({
      ...title,
      isPrimary: titleIndex === index,
    })), { shouldDirty: true })
  }

  return (
    <div className="pb-8">
      <div className="border-b border-border pb-5 mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl font-medium text-ink leading-tight">
              Add a Book
            </h1>
            <p className="font-sans text-sm text-sepia mt-1 max-w-2xl">
              {isAdmin
                ? 'Please ensure that the book does not already exist in the database.'
                : 'Submit a book entry for review.'}
            </p>
          </div>
          <Link
            to="/browse"
            className="font-sans text-sm text-link hover:text-highlight transition-colors"
          >
            Back to browse
          </Link>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_17rem]">
        <form onSubmit={handleFormSubmit(onSubmit)} className="flex flex-col gap-6">
          <FormSection
            title="Titles"
            action={(
              <SmallButton
                onClick={() => appendTitle({
                  isPrimary: getValues('titles').length === 0,
                  languageCode: getValues('languageCode') || DISPLAY_TITLE_LANGUAGE_CODE,
                  title: '',
                  titleType: 'alternative',
                })}
              >
                Add title
              </SmallButton>
            )}
          >
            <div className="grid gap-3">
              {titleFields.map((field, index) => {
                const title = form.titles[index] ?? field
                return (
                  <div key={field.id} className="rounded-xs border border-border bg-surface p-3">
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_10rem_10rem_5rem_auto] lg:items-end">
                      <TextInput
                        id={`title-${index}`}
                        label="Title"
                        placeholder={index === 0 ? 'e.g. War and Peace' : 'e.g. Война и миръ'}
                        {...register(`titles.${index}.title` as const)}
                      />
                      <SelectInput
                        id={`title-language-${index}`}
                        label="Language"
                        {...register(`titles.${index}.languageCode` as const)}
                      >
                        <option value="" disabled>Choose</option>
                        {languages.map(language => (
                          <option key={language.code} value={language.code}>
                            {formatLanguage(language)}
                          </option>
                        ))}
                      </SelectInput>
                      <SelectInput
                        id={`title-type-${index}`}
                        label="Type"
                        {...register(`titles.${index}.titleType` as const)}
                      >
                        {TITLE_TYPES.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </SelectInput>
                      <label className="flex h-9 items-center gap-2 font-sans text-sm text-sepia">
                        <input
                          type="radio"
                          name="primary-title"
                          checked={title.isPrimary}
                          onChange={() => setPrimaryTitle(index)}
                        />
                        Primary
                      </label>
                      <SmallButton
                        className="justify-self-start lg:mb-2"
                        onClick={() => removeTitle(index)}
                      >
                        Remove
                      </SmallButton>
                    </div>
                  </div>
                )
              })}
            </div>
          </FormSection>

          <FormSection title="General info">
            <div className="flex flex-col gap-4">
              <LanguageCombobox
                className="max-w-md"
                id="language"
                isLoading={isLoadingLookups}
                options={languages}
                selectedCode={form.languageCode}
                onSelect={code => setValue('languageCode', code, { shouldDirty: true })}
              />
              <div className="max-w-72">
                <FieldLabel htmlFor="first-published-year" optional>First published</FieldLabel>
                <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-2">
                  <input
                    id="first-published-year"
                    type="number"
                    placeholder="1871"
                    min="1"
                    max="3000"
                    className="h-9 w-full rounded-xs border border-border bg-bg px-3 font-sans text-sm text-ink outline-none transition-colors placeholder:text-dust focus:border-accent"
                    {...register('firstPublishedYear')}
                  />
                  <select
                    aria-label="Publication era"
                    className="h-9 w-full rounded-xs border border-border bg-bg px-2 font-sans text-sm text-ink outline-none transition-colors focus:border-accent"
                    {...register('firstPublishedEra')}
                  >
                    <option value="ad">AD</option>
                    <option value="bc">BC</option>
                  </select>
                </div>
              </div>
            </div>
          </FormSection>

          <FormSection title="Classification">
            <div className="max-w-xs">
              <FieldLabel htmlFor="work-type">Work type</FieldLabel>
              <select
                id="work-type"
                className="h-9 w-full rounded-xs border border-border bg-bg px-3 font-sans text-sm text-ink outline-none transition-colors focus:border-accent"
                {...register('workType')}
              >
                {WORK_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </FormSection>

          <FormSection title="Contributors">
            <AuthorPicker
              className="max-w-xl"
              isLoading={isLoadingLookups}
              options={authors}
              selectedAuthors={selectedAuthors}
              onChange={setSelectedAuthors}
            />
          </FormSection>

          <FormSection title="Book Notes">
            <div className="grid gap-4">
              <div className="max-w-2xl">
                <FieldLabel htmlFor="description" optional>Description</FieldLabel>
                <textarea
                  id="description"
                  placeholder="A short description or synopsis of the book."
                  rows={7}
                  className="w-full rounded-xs border border-border bg-bg px-3 py-2 font-sans text-sm leading-6 text-ink outline-none transition-colors placeholder:text-dust focus:border-accent"
                  {...register('description')}
                />
              </div>
              <div className="grid max-w-2xl gap-4 md:grid-cols-[minmax(0,1fr)_12rem]">
                <TextInput
                  id="cover-url"
                  label="Cover URL"
                  placeholder="https://..."
                  optional
                  {...register('coverUrl')}
                />
                <TextInput
                  id="source-note"
                  label="Cover source"
                  placeholder="publisher"
                  optional
                  {...register('sourceNote')}
                />
              </div>
            </div>
          </FormSection>

          <FormSection title="Entry Notes">
            <div className="max-w-2xl">
              <FieldLabel htmlFor="entry-note" optional>Entry notes</FieldLabel>
              <textarea
                id="entry-note"
                placeholder="Sources, rationale, or context for this entry."
                rows={5}
                className="w-full rounded-xs border border-border bg-bg px-3 py-2 font-sans text-sm leading-6 text-ink outline-none transition-colors placeholder:text-dust focus:border-accent"
                {...register('entryNote')}
              />
              <p className="font-sans text-xs text-sepia mt-2">
                Saved with the suggestion or revision history.
              </p>
            </div>
          </FormSection>

          {(lookupError || successMessage || error) && (
            <div className="rounded-xs border border-accent bg-surface px-4 py-3 font-sans text-sm text-link">
              {error ?? successMessage ?? lookupError}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => {
                reset(initialForm)
                setSelectedAuthors([])
                setError(null)
                setSuccessMessage(null)
              }}
              className="font-sans text-sm text-sepia hover:text-highlight transition-colors"
            >
              Clear form
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="h-10 rounded-xs border border-accent bg-accent px-5 font-sans text-sm text-bg hover:border-highlight hover:bg-highlight disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? (isAdmin ? 'Adding...' : 'Submitting...') : (isAdmin ? 'Add book' : 'Submit suggestion')}
            </button>
          </div>
        </form>

        <aside className="xl:sticky xl:top-6 self-start">
          <div className="rounded-xs border border-border bg-surface p-4">
            <h2 className="font-sans text-xs uppercase tracking-wide text-accent mb-3">Entry Preview</h2>
            <div className="flex gap-4 xl:block">
              {form.coverUrl.trim() ? (
                <img
                  src={form.coverUrl}
                  alt=""
                  className="w-24 shrink-0 rounded-xs border border-border object-cover aspect-2/3 xl:w-full"
                />
              ) : (
                <div className="w-24 shrink-0 rounded-xs border border-border bg-bg aspect-2/3 flex items-center justify-center font-sans text-xs uppercase tracking-wide text-dust xl:w-full">
                  Cover
                </div>
              )}
              <div className="min-w-0 xl:mt-4">
                <p className="break-words font-serif text-xl leading-tight text-ink">
                  {primaryTitle || 'Untitled work'}
                </p>
                <p className="mt-1 break-words font-serif italic text-sepia">
                  {selectedAuthors.length > 0 ? `by ${selectedAuthors.map(author => author.name).join(', ')}` : 'Author unknown'}
                </p>
                <dl className="font-sans text-xs text-sepia mt-4 space-y-2">
                  <div className="flex justify-between gap-3 border-b border-border pb-1">
                    <dt>Type</dt>
                    <dd className="text-ink text-right">{selectedWorkType}</dd>
                  </div>
                  <div className="flex justify-between gap-3 border-b border-border pb-1">
                    <dt>Language</dt>
                    <dd className="break-words text-right text-ink">{selectedLanguage ? formatLanguage(selectedLanguage) : 'Choose one'}</dd>
                  </div>
                  <div className="flex justify-between gap-3 border-b border-border pb-1">
                    <dt>Year</dt>
                    <dd className="text-ink text-right">{formatPublicationYear(form.firstPublishedYear, form.firstPublishedEra)}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
