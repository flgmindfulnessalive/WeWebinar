// Wraps standalone product landing pages that live under the WeWebinars
// domain but are NOT the WeWebinars app itself (their own brand, their own
// header/footer, no signup/login CTA into the SaaS product). Deliberately
// does not reuse (marketing)/layout.tsx's header/nav/footer -- each page
// in this group renders its own chrome from scratch.
export default function BookLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
