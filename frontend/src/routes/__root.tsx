/* eslint-disable react-refresh/only-export-components */
import { Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import Footer from '../components/layout/Footer'
import Sidebar from '../components/layout/Sidebar'
import NotFound from '../components/layout/NotFound'
import Topbar from '../components/layout/Topbar'
import AuthProvider from '../auth/AuthProvider'

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFound,
})

function RootComponent() {
  return (
    <AuthProvider>
      <div className="mx-auto min-h-screen w-full max-w-7xl border-border px-3 sm:border-x sm:px-4 lg:px-6">
        <Topbar />
        <div className="flex min-h-[calc(100vh-5rem)] flex-col font-serif">
          <div className="mt-4 flex flex-col gap-5 lg:mt-6 lg:flex-row lg:gap-8">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <main className="flex-1">
                <Outlet />
              </main>
            </div>
          </div>
          <Footer />
          {import.meta.env.DEV && (
            <TanStackRouterDevtools position="bottom-right" />
          )}
        </div>
      </div>
    </AuthProvider>
  )
}
