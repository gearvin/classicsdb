import { Link } from "@tanstack/react-router"

export default function Footer() {
  return (
    <footer className="mt-10 border-t border-border py-8 text-center">
      <p className="font-serif italic text-sepia mb-2">
        "No... I don't want translations!"
      </p>
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 font-sans text-sm text-sepia">
        <Link
          to="/about-us"
          className="hover:text-highlight hover:underline underline-offset-2 decoration-accent"
        >
          About Us
        </Link>
        <span className="text-accent">|</span>
        <a
          href="/privacy-policy"
          className="hover:text-highlight hover:underline underline-offset-2 decoration-accent"
        >
          Privacy Policy
        </a>
        <span className="text-accent">|</span>
        <a
          href="/contact-us"
          className="hover:text-highlight hover:underline underline-offset-2 decoration-accent"
        >
          Contact Us
        </a>
        <span className="text-accent">|</span>
        <a
          target="_blank"
          rel="noopener noreferrer"
          href="https://github.com/gearvin/classicsdb"
          className="hover:text-highlight hover:underline underline-offset-2 decoration-accent"
        >
          Github
        </a>
      </div>
      {/* <div className="flex items-center justify-center gap-0 font-sans text-sepia text-sm">
        {['About Us', 'Privacy Policy', 'Contact Us', 'Github'].map((item, i, arr) => (
          <React.Fragment key={item}>
            <a href="#" className="hover:text-highlight hover:underline underline-offset-2 decoration-accent">
              {item}
            </a>
            {i < arr.length - 1 && <span className="mx-2 text-accent">|</span>}
          </React.Fragment>
        ))}
      </div> */}
    </footer>
  )
}
