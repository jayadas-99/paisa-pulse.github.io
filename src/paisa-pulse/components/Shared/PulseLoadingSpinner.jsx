export default function PulseLoadingSpinner({ label = "Loading Paysa Pulse..." }) {
  return (
    <div className="flex min-h-[240px] items-center justify-center text-center">
      <div>
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-paisa-border border-t-paisa-accent" />
        <p className="text-sm text-paisa-muted">{label}</p>
      </div>
    </div>
  );
}
