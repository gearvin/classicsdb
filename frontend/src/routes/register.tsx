/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import RegisterForm from '../components/features/auth/RegisterForm'

export const Route = createFileRoute('/register')({
  component: RegisterPage,
})

function RegisterPage() {
  const navigate = useNavigate({ from: '/register' })

  return (
    <div className="pb-8">
      <div className=" mb-2">
        <h1 className="font-serif text-2xl font-medium text-ink leading-tight">
          Register
        </h1>
        {/* <p className="font-sans text-sm text-sepia mt-1">
          Create your ClassicsDB account.
        </p> */}
      </div>

      <RegisterForm onSuccess={() => navigate({ to: '/' })} />
    </div>
  )
}
