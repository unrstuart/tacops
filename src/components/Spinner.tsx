interface SpinnerProps {
  size?: number;
  seconds?: number;
}

export function Spinner({ size = 30, seconds }: SpinnerProps) {
  return (
    <div className="relative inline-flex items-center justify-center" style={{ height: size, width: size }}>
      <div
        role="status"
        aria-label="Loading"
        className="absolute inset-0 animate-spin rounded-full border-4 border-neutral-300 border-t-blue-500 dark:border-neutral-600 dark:border-t-blue-400"
      />
      {seconds !== undefined && (
        <span
          className="font-bold text-neutral-700 dark:text-neutral-200"
          style={{ fontSize: Math.max(8, Math.round(size * 0.3)) }}
        >
          {seconds}
        </span>
      )}
    </div>
  );
}
