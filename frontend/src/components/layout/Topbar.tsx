import { Link, useNavigate } from "@tanstack/react-router"
import useAuth from "../../auth/useAuth"
import { useEffect, useRef, useState, type ReactNode } from "react"

interface UserDropDownProps {
  label: string
  children: (closeMenu: () => void) => ReactNode
}

function UserDropDown({ label, children } : UserDropDownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    function handlePointerDown(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open])

  function closeMenu() {
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? "account-menu" : undefined}
        className="inline-flex items-center gap-1 text-base text-link transition-colors hover:text-highlight"
      >
        <span>{label}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className={[
            "h-3 w-3 text-dust transition-transform",
            open ? "rotate-180 text-highlight" : "",
          ].join(" ")}
        >
          <path
            d="M4 6L8 10L12 6"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
        </svg>
      </button>

      {open && (
        <ul
          id="account-menu"
          role="menu"
          className="absolute right-0 z-20 mt-2 w-44 rounded-xs border border-border bg-bg py-2 shadow-sm"
        >
          {children(closeMenu)}
        </ul>
      )}
    </div>
  )
}

export default function Topbar() {
  const navigate = useNavigate()
  const { currentUser, isAuthenticated, isLoadingUser, isLoggingOut, logout } = useAuth()
  const accountLabel = isLoggingOut ? 'Signing out...' : currentUser?.username || 'Account'

  return (
    <header className="relative flex min-h-20 w-full flex-col items-center justify-center gap-3 py-4 sm:min-h-18 sm:flex-row sm:gap-0">
      <div className="absolute bottom-0 left-0 right-0 h-1 border-t border-b border-border" />
      <Link
        to="/"
        className="font-serif font-medium text-3xl text-ink tracking-tight leading-none underline-offset-4 decoration-highlight hover:underline"
      >
        ClassicsDB
      </Link>

      <div className="flex items-center gap-4 font-sans text-sm sm:absolute sm:right-4">
        {isLoadingUser ? null : isAuthenticated ? (
          <UserDropDown label={accountLabel}>
            {closeMenu => (
              <>
                <li role="none">
                  <Link
                    to="/profile"
                    role="menuitem"
                    onClick={closeMenu}
                    className="block px-3 py-1.5 text-sepia hover:text-highlight transition-colors"
                  >
                    Profile
                  </Link>
                </li>
                <li role="none">
                  <Link
                    to="/profile/edit"
                    role="menuitem"
                    onClick={closeMenu}
                    className="block px-3 py-1.5 text-sepia hover:text-highlight transition-colors"
                  >
                    Edit profile
                  </Link>
                </li>
                <li role="none">
                  <Link
                    to="/suggestions"
                    role="menuitem"
                    onClick={closeMenu}
                    className="block px-3 py-1.5 text-sepia hover:text-highlight transition-colors"
                  >
                    Suggestions
                  </Link>
                </li>
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    disabled={isLoggingOut}
                    onClick={() => {
                      closeMenu()
                      void logout().then(() => {
                        navigate({to: '/'})
                      })
                    }}
                    className="block w-full px-3 py-1.5 text-left text-sepia transition-colors hover:text-highlight disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoggingOut ? 'Signing out...' : 'Sign out'}
                  </button>
                </li>
              </>
            )}
          </UserDropDown>
        ) : (
          <>
            <Link
              to="/login"
              className="text-link hover:text-highlight transition-colors"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="rounded-xs border border-accent bg-accent px-3 py-1.5 text-bg transition-colors hover:border-highlight hover:bg-highlight"
            >
              Register
            </Link>
          </>
        )}
      </div>
    </header>
  )
}
