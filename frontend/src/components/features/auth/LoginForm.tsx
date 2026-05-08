import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { type SubmitHandler, useForm } from 'react-hook-form'
import { z } from 'zod'
import useAuth from '../../../auth/useAuth'
import AuthTextField from './AuthTextField'

const loginSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginForm({ onSuccess }: { onSuccess: () => void | Promise<void> }) {
  const { isLoggingIn, login } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<LoginFormValues>({
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit: SubmitHandler<LoginFormValues> = async values => {
    const credentials = loginSchema.parse(values)
    setFormError(null)

    try {
      await login(credentials.email, credentials.password)
      await onSuccess()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to log in. Please try again.')
    }
  }

  const isBusy = isSubmitting || isLoggingIn

  return (
    <div className="max-w-md py-5">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
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
              loginSchema.shape.email.safeParse(value).success ||
              'Enter a valid email address'
            ),
          })}
        />

        <AuthTextField
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          placeholder="Password"
          registration={register('password', {
            required: 'Enter your password',
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
          {isBusy ? 'Logging in...' : 'Log in'}
        </button>
      </form>

      <p className="mt-4 border-t border-border pt-4 font-sans text-sm text-sepia">
        No account?{' '}
        <Link
          to="/register"
          className="text-link underline underline-offset-2 decoration-accent hover:text-highlight hover:decoration-highlight transition-colors"
        >
          Register here
        </Link>
      </p>
    </div>
  )
}
