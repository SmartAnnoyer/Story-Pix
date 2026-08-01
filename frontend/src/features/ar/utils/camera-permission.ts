import type { CameraFacing } from './mindar-scene';

export type CameraPermissionResult = {
  ok: boolean;
  facingMode: CameraFacing;
  error: string | null;
};

/**
 * Request camera during a user gesture (Open camera tap).
 * Stops the stream immediately — MindAR opens its own — but unlocks permission
 * so Safari/Chrome don't block the later async getUserMedia.
 */
export const primeCameraPermission = async (
  preferred: CameraFacing = 'environment',
): Promise<CameraPermissionResult> => {
  if (!navigator.mediaDevices?.getUserMedia) {
    return {
      ok: false,
      facingMode: preferred,
      error: 'This browser does not support camera access.',
    };
  }

  const attempts: CameraFacing[] =
    preferred === 'environment' ? ['environment', 'user'] : ['user', 'environment'];

  let lastError: string | null = null;

  for (const facingMode of attempts) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      stream.getTracks().forEach((track) => track.stop());
      return { ok: true, facingMode, error: null };
    } catch (error) {
      const name = error instanceof DOMException ? error.name : 'Error';
      const message = error instanceof Error ? error.message : 'Camera request failed';
      lastError =
        name === 'NotAllowedError' || name === 'PermissionDeniedError'
          ? 'Camera permission was denied. Allow camera access in browser settings, then try again.'
          : name === 'NotFoundError'
            ? 'No camera was found on this device.'
            : message;
    }
  }

  return { ok: false, facingMode: preferred, error: lastError };
};
