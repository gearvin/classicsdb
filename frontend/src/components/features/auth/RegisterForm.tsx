import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { type SubmitHandler, useForm } from 'react-hook-form'
import { z } from 'zod'
import useAuth from '../../../auth/useAuth'
import AuthTextField from './AuthTextField'

const registerSchema = z.object({
  username: z.string().trim().min(1, 'Enter a username').max(64, 'Username must be 64 characters or fewer'),
  email: z.email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(255, 'Password must be 255 characters or fewer'),
  confirmPassword: z.string().min(1, 'Confirm your password'),
}).refine(values => values.password === values.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type RegisterFormValues = z.infer<typeof registerSchema>

export default function RegisterForm({ onSuccess }: { onSuccess: () => void | Promise<void> }) {
  const { isRegistering, register: registerAccount } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    formState: { errors, isSubmitting },
    getValues,
    handleSubmit,
    register,
    setError,
  } = useForm<RegisterFormValues>({
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit: SubmitHandler<RegisterFormValues> = async values => {
    const result = registerSchema.safeParse(values)

    if (!result.success) {
      setFormError(null)
      for (const issue of result.error.issues) {
        const field = issue.path[0]
        if (
          field === 'username' ||
          field === 'email' ||
          field === 'password' ||
          field === 'confirmPassword'
        ) {
          setError(field, { message: issue.message })
        }
      }
      return
    }

    setFormError(null)

    try {
      await registerAccount({
        username: result.data.username,
        email: result.data.email,
        password: result.data.password,
      })
      await onSuccess()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to create your account. Please try again.')
    }
  }

  const isBusy = isSubmitting || isRegistering

  return (
    <div className="max-w-md py-5">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <AuthTextField
          id="username"
          label="Username"
          type="text"
          autoComplete="username"
          error={errors.username?.message}
          placeholder="readername"
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
          placeholder="you@example.com"
          registration={register('email', {
            required: 'Enter your email',
            validate: value => (
              registerSchema.shape.email.safeParse(value).success ||
              'Enter a valid email address'
            ),
          })}
        />

        <AuthTextField
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          placeholder="At least 8 characters"
          registration={register('password', {
            required: 'Enter your password',
            minLength: {
              value: 8,
              message: 'Password must be at least 8 characters',
            },
            maxLength: {
              value: 255,
              message: 'Password must be 255 characters or fewer',
            },
          })}
        />

        <AuthTextField
          id="confirmPassword"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          placeholder="Repeat password"
          registration={register('confirmPassword', {
            required: 'Confirm your password',
            validate: value => value === getValues('password') || 'Passwords do not match',
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

        <button
          type="submit"
          disabled={isBusy}
          className="h-9 rounded-xs border border-accent bg-accent px-4 font-sans text-sm font-medium text-bg transition-colors hover:bg-highlight disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isBusy ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="mt-4 border-t border-border pt-4 font-sans text-sm text-sepia">
        Already registered?{' '}
        <Link
          to="/login"
          className="text-link underline underline-offset-2 decoration-accent hover:text-highlight hover:decoration-highlight transition-colors"
        >
          Log in
        </Link>
      </p>
    </div>
  )
}
