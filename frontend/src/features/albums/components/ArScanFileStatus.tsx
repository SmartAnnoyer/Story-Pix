import { AlbumStatus } from '@/types/album.types';

interface ArScanFileStatusProps {
  status: AlbumStatus;
  ready: boolean;
  compiledAt: string | null;
}

export const ArScanFileStatus = ({ status, ready, compiledAt }: ArScanFileStatusProps) => {
  if (status !== AlbumStatus.PUBLISHED) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
        Publish the album to build the customer scan file.
      </div>
    );
  }

  if (ready) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2">
        <p className="text-sm font-medium text-green-800">AR scan file ready</p>
        {compiledAt ? (
          <p className="mt-0.5 text-xs text-green-700">
            Built {new Date(compiledAt).toLocaleString()} — safe to print QR and share the link.
          </p>
        ) : (
          <p className="mt-0.5 text-xs text-green-700">Safe to print QR and share the link.</p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
      <p className="text-sm font-medium text-amber-900">Building AR scan file…</p>
      <p className="mt-0.5 text-xs text-amber-800">
        Wait for this to finish before printing the QR. Customers may face long waits without it.
      </p>
    </div>
  );
};
