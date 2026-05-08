/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import LoginForm from '../components/features/auth/LoginForm'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate({ from: '/login' })

  return (
    <div className="pb-8">
      <div className=" mb-2">
        <h1 className="font-serif text-2xl font-medium text-ink leading-tight">
          Log in
        </h1>
        {/* <p className="font-sans text-sm text-sepia mt-1">
          Continue to your ClassicsDB account.
        </p> */}
      </div>

      <LoginForm onSuccess={() => navigate({ to: '/' })} />
    </div>
  )
}
