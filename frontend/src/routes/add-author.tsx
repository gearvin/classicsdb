/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { type SubmitHandler, useForm, useWatch } from 'react-hook-form'
import { createAuthor, type Author } from '../api/authors'
import { queryKeys } from '../api/queryKeys'
import { createSuggestion } from '../api/suggestions'
import useAuth from '../auth/useAuth'
import { FieldLabel, FormSection, TextInput } from '../components/features/catalog/CatalogFormControls'

export const Route = createFileRoute('/add-author')({
  component: AddAuthorPage,
})

type YearEra = 'ad' | 'bc'

interface AddAuthorForm {
  name: string
  sortName: string
  birthYear: string
  birthEra: YearEra
  deathYear: string
  deathEra: YearEra
  bio: string
  entryNote: string
}

const initialForm: AddAuthorForm = {
  name: '',
  sortName: '',
  birthYear: '',
  birthEra: 'ad',
  deathYear: '',
  deathEra: 'ad',
  bio: '',
  entryNote: '',
}

function parseSignedYear(year: string, era: YearEra) {
  const trimmedYear = year.trim()
  if (!trimmedYear) {
    return null
  }

  return Number(trimmedYear) * (era === 'bc' ? -1 : 1)
}

function formatYear(year: string, era: YearEra) {
  const trimmedYear = year.trim()
  if (!trimmedYear) {
    return 'Unknown'
  }

  return `${trimmedYear} ${era.toUpperCase()}`
}

function formatAuthorLife(form: AddAuthorForm) {
  if (!form.birthYear.trim() && !form.deathYear.trim()) {
    return 'Dates unknown'
  }

  return `${formatYear(form.birthYear, form.birthEra)} - ${formatYear(form.deathYear, form.deathEra)}`
}

function suggestSortName(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length < 2) {
    return name.trim()
  }

  const lastName = parts.at(-1)
  return `${lastName}, ${parts.slice(0, -1).join(' ')}`
}

function YearInput({
  era,
  id,
  label,
  onEraChange,
  onYearChange,
  value,
}: {
  era: YearEra
  id: string
  label: string
  onEraChange: (era: YearEra) => void
  onYearChange: (year: string) => void
  value: string
}) {
  return (
    <div className="max-w-72">
      <FieldLabel htmlFor={id} optional>{label}</FieldLabel>
      <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-2">
        <input
          id={id}
          type="number"
          value={value}
          onChange={event => onYearChange(event.target.value)}
          placeholder="1882"
          min="1"
          max="3000"
          className="h-9 w-full rounded-xs border border-border bg-bg px-3 font-sans text-sm text-ink outline-none transition-colors placeholder:text-dust focus:border-accent"
        />
        <select
          aria-label={`${label} era`}
          value={era}
          onChange={event => onEraChange(event.target.value as YearEra)}
          className="h-9 w-full rounded-xs border border-border bg-bg px-2 font-sans text-sm text-ink outline-none transition-colors focus:border-accent"
        >
          <option value="ad">AD</option>
          <option value="bc">BC</option>
        </select>
      </div>
    </div>
  )
}

function AddAuthorPage() {
  const queryClient = useQueryClient()
  const { accessToken, currentUser, isAuthenticated, isLoadingUser } = useAuth()
  const {
    control,
    handleSubmit: handleFormSubmit,
    register,
    reset,
    setValue,
  } = useForm<AddAuthorForm>({
    defaultValues: initialForm,
  })
  const [createdAuthor, setCreatedAuthor] = useState<Author | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const isAdmin = currentUser?.is_admin === true
  const form = useWatch({ control }) as AddAuthorForm
  const createAuthorMutation = useMutation({
    mutationFn: ({ entryNote, payload }: { entryNote: string; payload: Parameters<typeof createAuthor>[0] }) => (
      createAuthor(payload, accessToken ?? undefined, entryNote)
    ),
    onSuccess: author => {
      queryClient.invalidateQueries({ queryKey: queryKeys.authors.lists() })
      setCreatedAuthor(author)
      setSuccessMessage(null)
      reset(initialForm)
    },
  })
  const createSuggestionMutation = useMutation({
    mutationFn: ({ entryNote, payload }: { entryNote: string; payload: Parameters<typeof createAuthor>[0] }) => createSuggestion(accessToken!, {
      target_type: 'author',
      action: 'create',
      payload: { ...payload },
      submitter_note: entryNote.trim(),
    }),
    onSuccess: suggestion => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suggestions.mine(accessToken) })
      setCreatedAuthor(null)
      setSuccessMessage(`Suggestion #${suggestion.id} submitted for review.`)
      reset(initialForm)
    },
  })
  const isSubmitting = createAuthorMutation.isPending || createSuggestionMutation.isPending
  const canSubmit = isAuthenticated && !isLoadingUser && form.name.trim().length > 0 && !isSubmitting

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
            Add an Author
          </h1>
          <p className="font-sans text-sm text-sepia mt-1 max-w-2xl">
            Log in to submit author entries for review.
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

  function clearForm() {
    reset(initialForm)
    setError(null)
    setCreatedAuthor(null)
    setSuccessMessage(null)
  }

  const onSubmit: SubmitHandler<AddAuthorForm> = async values => {
    if (!values.name.trim()) {
      setError('A display name is required.')
      return
    }

    if (!accessToken) {
      setError('Log in to submit author entries.')
      return
    }

    setError(null)
    setCreatedAuthor(null)
    setSuccessMessage(null)

    const payload = {
      name: values.name.trim(),
      sort_name: values.sortName.trim() || null,
      bio: values.bio.trim(),
      birth_year: parseSignedYear(values.birthYear, values.birthEra),
      death_year: parseSignedYear(values.deathYear, values.deathEra),
    }

    try {
      if (isAdmin) {
        await createAuthorMutation.mutateAsync({ entryNote: values.entryNote, payload })
      } else {
        await createSuggestionMutation.mutateAsync({ entryNote: values.entryNote, payload })
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit this author.')
    }
  }

  return (
    <div className="pb-8">
      <div className="border-b border-border pb-5 mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl font-medium text-ink leading-tight">
              Add an Author
            </h1>
            <p className="font-sans text-sm text-sepia mt-1 max-w-2xl">
              {isAdmin ? 'Create a contributor record before attaching works to them.' : 'Submit a contributor entry for review.'}
            </p>
          </div>
          <Link
            to="/add-book"
            className="font-sans text-sm text-link hover:text-highlight transition-colors"
          >
            Add a book
          </Link>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_17rem]">
        <form onSubmit={handleFormSubmit(onSubmit)} className="flex flex-col gap-6">
          <FormSection title="Identity">
            <div className="grid gap-4">
              <TextInput
                containerClassName="max-w-xl"
                id="name"
                label="Display name"
                placeholder="e.g. Virginia Woolf"
                required
                {...register('name')}
              />
              <div className="max-w-xl">
                <TextInput
                  id="sort-name"
                  label="Sort name"
                  placeholder="e.g. Woolf, Virginia"
                  optional
                  note="Used for alphabetical ordering."
                  {...register('sortName')}
                />
                {form.name.trim() && !form.sortName.trim() && (
                  <button
                    type="button"
                    onClick={() => setValue('sortName', suggestSortName(form.name), { shouldDirty: true })}
                    className="mt-2 font-sans text-xs text-link hover:text-highlight underline underline-offset-2 decoration-accent transition-colors"
                  >
                    Use "{suggestSortName(form.name)}"
                  </button>
                )}
              </div>
            </div>
          </FormSection>

          <FormSection title="Dates">
            <div className="grid gap-4 sm:grid-cols-2">
              <YearInput
                id="birth-year"
                label="Birth year"
                value={form.birthYear}
                era={form.birthEra}
                onYearChange={year => setValue('birthYear', year, { shouldDirty: true })}
                onEraChange={era => setValue('birthEra', era, { shouldDirty: true })}
              />
              <YearInput
                id="death-year"
                label="Death year"
                value={form.deathYear}
                era={form.deathEra}
                onYearChange={year => setValue('deathYear', year, { shouldDirty: true })}
                onEraChange={era => setValue('deathEra', era, { shouldDirty: true })}
              />
            </div>
          </FormSection>

          <FormSection title="Biography">
            <div className="max-w-2xl">
              <FieldLabel htmlFor="bio" optional>Bio</FieldLabel>
              <textarea
                id="bio"
                placeholder="A short biographical note."
                rows={8}
                className="w-full rounded-xs border border-border bg-bg px-3 py-2 font-sans text-sm leading-6 text-ink outline-none transition-colors placeholder:text-dust focus:border-accent"
                {...register('bio')}
              />
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

          {(createdAuthor || successMessage || error) && (
            <div className="rounded-xs border border-accent bg-surface px-4 py-3 font-sans text-sm text-link">
              {error ?? successMessage ?? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span>Added {createdAuthor?.name}.</span>
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {createdAuthor && (
                      <Link
                        to="/authors/$authorId"
                        params={{ authorId: createdAuthor.id.toString() }}
                        className="text-link hover:text-highlight underline underline-offset-2 decoration-accent transition-colors"
                      >
                        View author
                      </Link>
                    )}
                    <Link
                      to="/add-book"
                      className="text-link hover:text-highlight underline underline-offset-2 decoration-accent transition-colors"
                    >
                      Add a book for them
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={clearForm}
              className="font-sans text-sm text-sepia hover:text-highlight transition-colors"
            >
              Clear form
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="h-10 rounded-xs border border-accent bg-accent px-5 font-sans text-sm text-bg hover:border-highlight hover:bg-highlight disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? (isAdmin ? 'Adding...' : 'Submitting...') : (isAdmin ? 'Add author' : 'Submit suggestion')}
            </button>
          </div>
        </form>

        <aside className="xl:sticky xl:top-6 self-start">
          <div className="rounded-xs border border-border bg-surface p-4">
            <h2 className="font-sans text-xs uppercase tracking-wide text-accent mb-3">Entry Preview</h2>
            <p className="break-words font-serif text-xl leading-tight text-ink">
              {form.name.trim() || 'Unnamed author'}
            </p>
            <p className="mt-1 break-words font-serif italic text-sepia">
              {formatAuthorLife(form)}
            </p>
            <dl className="font-sans text-xs text-sepia mt-4 space-y-2">
              <div className="flex justify-between gap-3 border-b border-border pb-1">
                <dt>Sort</dt>
                <dd className="break-words text-right text-ink">{form.sortName.trim() || 'Not set'}</dd>
              </div>
              <div className="flex justify-between gap-3 border-b border-border pb-1">
                <dt>Bio</dt>
                <dd className="text-ink text-right">{form.bio.trim() ? `${form.bio.trim().length} chars` : 'Empty'}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  )
}
