import type { ComponentPropsWithoutRef } from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'

interface AuthTextFieldProps extends Omit<ComponentPropsWithoutRef<'input'>, 'className'> {
  error?: string
  label: string
  registration: UseFormRegisterReturn
}

export default function AuthTextField({
  error,
  id,
  label,
  registration,
  ...inputProps
}: AuthTextFieldProps) {
  const errorId = error && id ? `${id}-error` : undefined

  return (
    <div>
      <label htmlFor={id} className="block font-sans text-xs uppercase tracking-wide text-sepia mb-1.5">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={errorId}
        className="h-9 w-full rounded-xs border border-border bg-bg px-3 font-sans text-sm text-ink outline-none transition-colors placeholder:text-dust focus:border-accent"
        {...registration}
        {...inputProps}
      />
      {error && (
        <p id={errorId} className="mt-1.5 font-sans text-xs text-link">
          {error}
        </p>
      )}
    </div>
  )
}
