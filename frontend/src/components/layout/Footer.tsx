import React from "react";

export default function Footer() {
  return (
    <footer className="border-t border-border py-8 mt-8 text-center">
      <p className="font-serif italic text-sepia mb-2 text-sm">
        "No... I don't want translations!"
      </p>
      <div className="flex items-center justify-center gap-0 font-sans text-sepia text-sm">
        {['About Us', 'Privacy Policy', 'Contact Us', 'Github'].map((item, i, arr) => (
          <React.Fragment key={item}>
            <a href="#" className="hover:text-ink hover:underline underline-offset-2 decoration-dotted">
              {item}
            </a>
            {i < arr.length - 1 && <span className="mx-2 text-[#C8C0A8]">|</span>}
          </React.Fragment>
        ))}
      </div>
    </footer>
  )
}