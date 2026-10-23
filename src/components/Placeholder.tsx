/** Calm loading state shown for the instant before local data is read. */
export function Placeholder({ label = "Loading your study space" }: { label?: string }) {
  return (
    <div role="status" aria-label={label} className="animate-pulse space-y-6 motion-reduce:animate-none">
      <div className="h-10 w-2/3 max-w-md rounded-control bg-sunken" />
      <div className="h-5 w-1/2 max-w-sm rounded-control bg-sunken" />
      <div className="h-64 rounded-panel bg-sunken/70" />
    </div>
  );
}
