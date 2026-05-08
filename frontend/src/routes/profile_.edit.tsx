/* eslint-disable react-refresh/only-export-components */
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { type SubmitHandler, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import {
  updateCurrentUser,
  type AuthUser,
  type UpdateCurrentUserInput,
} from '../api/auth'
import { queryKeys } from '../api/queryKeys'
import useAuth from '../auth/useAuth'
import AuthTextField from '../components/features/auth/AuthTextField'

export const Route = createFileRoute('/profile_/edit')({
  component: EditProfilePage,
})

const profileSchema = z.object({
  username: z.string().trim().min(1, 'Enter a username').max(64, 'Username must be 64 characters or fewer'),
  email: z.email('Enter a valid email address'),
  avatarUrl: z.string().trim().max(1000, 'Avatar URL must be 1000 characters or fewer'),
})

type EditProfileValues = z.infer<typeof profileSchema>

function toFormValues(user: AuthUser): EditProfileValues {
  return {
    username: user.username,
    email: user.email,
    avatarUrl: user.avatar_url ?? '',
  }
}

function toPayload(values: EditProfileValues): UpdateCurrentUserInput {
  return {
    username: values.username,
    email: values.email,
    avatar_url: values.avatarUrl || null,
  }
}

function EditProfilePage() {
  const { accessToken, currentUser, isAuthenticated, isLoadingUser } = useAuth()
  const navigate = useNavigate({ from: '/profile/edit' })
  const queryClient = useQueryClient()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    control,
    formState: { errors, isDirty, isSubmitting },
    handleSubmit,
    register,
    reset,
    setError,
  } = useForm<EditProfileValues>({
    defaultValues: {
      username: '',
      email: '',
      avatarUrl: '',
    },
  })
  const previewValues = useWatch({ control })
  const updateProfileMutation = useMutation({
    mutationFn: (payload: UpdateCurrentUserInput) => updateCurrentUser(accessToken!, payload),
    onSuccess: savedUser => {
      queryClient.setQueryData<AuthUser>(queryKeys.auth.currentUser(accessToken), savedUser)
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
      reset(toFormValues(savedUser))
    },
  })

  useEffect(() => {
    if (currentUser) {
      reset(toFormValues(currentUser))
    }
  }, [currentUser, reset])

  const onSubmit: SubmitHandler<EditProfileValues> = async values => {
    const result = profileSchema.safeParse(values)

    if (!result.success) {
      setFormError(null)
      for (const issue of result.error.issues) {
        const field = issue.path[0]
        if (
          field === 'username' ||
          field === 'email' ||
          field === 'avatarUrl'
        ) {
          setError(field, { message: issue.message })
        }
      }
      return
    }

    if (!accessToken) {
      setFormError('Log in to edit your profile.')
      return
    }

    setFormError(null)

    try {
      await updateProfileMutation.mutateAsync(toPayload(result.data))
      await navigate({ to: '/profile' })
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to update your profile.')
    }
  }

  if (isLoadingUser) {
    return (
      <div className="pb-8">
        <h1 className="font-serif text-2xl font-medium leading-tight text-ink">Edit Profile</h1>
        <p className="mt-2 font-sans text-sm text-sepia">Loading account...</p>
      </div>
    )
  }

  if (!isAuthenticated || currentUser === null) {
    return (
      <div className="pb-8">
        <h1 className="font-serif text-2xl font-medium leading-tight text-ink">Edit Profile</h1>
        <p className="mb-4 mt-2 font-sans text-sm text-sepia">
          Log in to edit your profile.
        </p>
        <Link to="/login" className="font-sans text-sm text-link transition-colors hover:text-highlight">
          Log in
        </Link>
      </div>
    )
  }

  const isBusy = isSubmitting || updateProfileMutation.isPending
  const previewUsername = previewValues.username || currentUser.username
  const previewAvatarUrl = previewValues.avatarUrl || currentUser.avatar_url
  const previewEmail = previewValues.email || currentUser.email

  return (
    <div className="pb-8">
      <div className="mb-5 border-b border-border pb-4">
        <h1 className="font-serif text-2xl font-medium leading-tight text-ink">Edit Profile</h1>
        <p className="mt-2 font-sans text-sm text-sepia">
          Manage your username, account email, and avatar.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,34rem)_16rem]">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <AuthTextField
            id="username"
            label="Username"
            type="text"
            autoComplete="username"
            error={errors.username?.message}
            registration={register('username', {
              required: 'Enter a username',
              maxLength: {
                value: 64,
                message: 'Username must be 64 characters or fewer',
              },
              setValueAs: value => typeof value === 'string' ? value.trim() : value,
            })}
          />

          <AuthTextField
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            registration={register('email', {
              required: 'Enter your email',
              validate: value => (
                profileSchema.shape.email.safeParse(value).success ||
                'Enter a valid email address'
              ),
            })}
          />

          <AuthTextField
            id="avatarUrl"
            label="Avatar URL"
            type="url"
            autoComplete="url"
            error={errors.avatarUrl?.message}
            placeholder="/static/avatars/default.svg"
            registration={register('avatarUrl', {
              maxLength: {
                value: 1000,
                message: 'Avatar URL must be 1000 characters or fewer',
              },
              setValueAs: value => typeof value === 'string' ? value.trim() : value,
            })}
          />

          {formError && (
            <div
              role="alert"
              className="rounded-xs border border-accent bg-bg px-3 py-2 font-sans text-sm text-link"
            >
              {formError}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={isBusy || !isDirty}
              className="h-9 rounded-xs border border-accent bg-accent px-4 font-sans text-sm font-medium text-bg transition-colors hover:bg-highlight disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isBusy ? 'Saving...' : 'Save profile'}
            </button>
            <Link
              to="/profile"
              className="font-sans text-sm text-link transition-colors hover:text-highlight"
            >
              Cancel
            </Link>
          </div>
        </form>

        <aside className="lg:border-l lg:border-border lg:pl-6">
          <h2 className="border-b border-border pb-2 font-sans text-xs uppercase tracking-wide text-accent">
            Preview
          </h2>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex size-14 items-center justify-center overflow-hidden rounded-full border border-border bg-surface font-sans text-xl uppercase text-highlight">
              {previewAvatarUrl ? (
                <img
                  src={previewAvatarUrl}
                  alt={`${previewUsername} avatar`}
                  className="h-full w-full object-cover"
                />
              ) : (
                previewUsername.slice(0, 1)
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate font-serif text-xl leading-tight text-ink">{previewUsername}</p>
              <p className="truncate font-sans text-sm text-sepia">{previewEmail}</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
