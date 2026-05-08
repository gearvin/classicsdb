import { type ComponentPropsWithoutRef, type ReactNode } from 'react'

export function FieldLabel({
  children,
  htmlFor,
  optional = false,
}: {
  children: string
  htmlFor: string
  optional?: boolean
}) {
  return (
    <label htmlFor={htmlFor} className="flex items-baseline font-sans text-xs uppercase tracking-wide text-sepia mb-1.5">
      <span>{children}</span>
      {!optional && <span className="text-accent">*</span>}
    </label>
  )
}

export function TextInput({
  containerClassName = '',
  id,
  label,
  optional,
  note,
  ...props
}: {
  containerClassName?: string
  id: string
  label: string
  optional?: boolean
  note?: string
} & Omit<ComponentPropsWithoutRef<'input'>, 'className'>) {
  return (
    <div className={containerClassName}>
      <FieldLabel htmlFor={id} optional={optional}>{label}</FieldLabel>
      <input
        id={id}
        className="h-9 w-full rounded-xs border border-border bg-bg px-3 font-sans text-sm text-ink outline-none transition-colors placeholder:text-dust focus:border-accent"
        {...props}
      />
      {note && (
        <p className="font-sans text-xs text-sepia mt-2">{note}</p>
      )}
    </div>
  )
}

export function SelectInput({
  children,
  id,
  label,
  optional,
  ...props
}: {
  children: ReactNode
  id: string
  label: string
  optional?: boolean
} & Omit<ComponentPropsWithoutRef<'select'>, 'className'>) {
  return (
    <div>
      <FieldLabel htmlFor={id} optional={optional}>{label}</FieldLabel>
      <select
        id={id}
        className="h-9 w-full rounded-xs border border-border bg-bg px-3 font-sans text-sm text-ink outline-none transition-colors focus:border-accent disabled:opacity-60"
        {...props}
      >
        {children}
      </select>
    </div>
  )
}

export function FormSection({
  action,
  children,
  title,
}: {
  action?: ReactNode
  children: ReactNode
  title: string
}) {
  return (
    <section className="border-b border-border pb-6">
      {action ? (
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="font-sans text-xs uppercase tracking-wide text-accent">{title}</h2>
          {action}
        </div>
      ) : (
        <h2 className="font-sans text-xs uppercase tracking-wide text-accent mb-4">{title}</h2>
      )}
      {children}
    </section>
  )
}

export function SmallButton({
  children,
  className = '',
  ...props
}: {
  children: ReactNode
  className?: string
} & ComponentPropsWithoutRef<'button'>) {
  return (
    <button
      type="button"
      className={`font-sans text-xs text-link hover:text-highlight underline underline-offset-2 decoration-accent transition-colors ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
