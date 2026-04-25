import { Link } from "@tanstack/react-router";

export default function NotFound() {
  return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center font-serif">
          <p className="text-ink text-xl mb-4">Page not found</p>
          <Link to="/" className="text-sepia underline underline-offset-2 text-sm">
            Return home
          </Link>
        </div>
      </div>
    )
}