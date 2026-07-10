interface ViewerErrorStateProps {
  title: string;
  message: string;
  variant?: 'error' | 'warning';
}

export const ViewerErrorState = ({
  title,
  message,
  variant = 'error',
}: ViewerErrorStateProps) => {
  const accent = variant === 'warning' ? 'text-amber-200' : 'text-red-100';

  return (
    <div className="flex h-[100dvh] items-center justify-center bg-black p-6">
      <div className="max-w-md text-center text-white">
        <p className={`mb-2 text-lg font-semibold ${accent}`}>{title}</p>
        <p className="text-sm text-white/70">{message}</p>
      </div>
    </div>
  );
};
