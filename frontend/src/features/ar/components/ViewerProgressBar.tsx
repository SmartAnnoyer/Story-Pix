export type ViewerPhase = 'preparing' | 'loading' | 'scanning' | 'done' | 'error';

const PHASE_STEPS: { key: ViewerPhase; label: string }[] = [
  { key: 'preparing', label: 'Prepare' },
  { key: 'loading', label: 'Camera' },
  { key: 'scanning', label: 'Scan' },
];

interface ViewerProgressBarProps {
  phase: ViewerPhase;
  progress: number;
  scanSeconds?: number;
}

export const ViewerProgressBar = ({ phase, progress, scanSeconds = 0 }: ViewerProgressBarProps) => {
  const activeIndex = phase === 'done' ? 3 : phase === 'error' ? -1 : PHASE_STEPS.findIndex((s) => s.key === phase);
  const percent = Math.min(100, Math.max(0, Math.round(progress * 100)));

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between gap-2 text-[11px] uppercase tracking-wide text-white/60">
        {PHASE_STEPS.map((step, index) => (
          <span
            key={step.key}
            className={
              index <= activeIndex ? 'font-semibold text-[#FF4FA3]' : 'text-white/40'
            }
          >
            {index + 1}. {step.label}
          </span>
        ))}
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-white/15">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#8A2BE2] via-[#2196F3] to-[#FF4FA3] transition-[width] duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className="mb-0 mt-2 text-center text-xs text-white/75">
        {phase === 'preparing' && `Building AR targets… ${percent}%`}
        {phase === 'loading' && `Starting camera… ${percent}%`}
        {phase === 'scanning' && `Looking for your photo… ${scanSeconds}s`}
        {phase === 'done' && 'Match found — playing video'}
        {phase === 'error' && 'Needs your attention'}
      </p>
    </div>
  );
};
