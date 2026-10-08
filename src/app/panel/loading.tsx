// The panel reads from the database on every screen, so the shell shows
// while that happens rather than a blank column. Shaped like the content it
// replaces -- a heading, a paragraph, three tiles -- so nothing jumps when
// the real thing arrives.
export default function PanelLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-7" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando tu panel…</span>
      <div className="flex flex-col gap-3">
        <div className="h-8 w-[min(260px,70%)] rounded-lg bg-[#16222F]" />
        <div className="h-4 w-[min(420px,90%)] rounded bg-[#131E2B]" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((tile) => (
          <div key={tile} className="h-[118px] rounded-[14px] border border-[#1F2A3C] bg-[#0E192A]" />
        ))}
      </div>
      <div className="h-[132px] rounded-[14px] border border-[#1F2A3C] bg-[#0E192A]" />
    </div>
  );
}
