import { Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import Footer from '../components/layout/Footer'
import Sidebar from '../components/layout/Sidebar'
import NotFound from '../components/layout/NotFound'

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFound,
})

function RootComponent() {
  return (
      <div className="min-h-screen font-serif flex flex-col max-w-7xl mx-auto">
        <div className="flex px-10">
          <div className="mt-8">
            <Sidebar />
          </div>
          <div className="flex-1 flex flex-col">
            <main className="flex-1 px-10 py-8">
              <Outlet />
            </main>
          </div>
        </div>
        <Footer />
        {import.meta.env.DEV && (
          <TanStackRouterDevtools position="bottom-right" />
        )}
      </div>    
  )
}