import type { CameraFacing } from './mindar-scene';

export type CameraPermissionResult = {
  ok: boolean;
  facingMode: CameraFacing;
  error: string | null;
};

let heldStream: MediaStream | null = null;

export const takeHeldCameraStream = (): MediaStream | null => {
  const stream = heldStream;
  heldStream = null;
  return stream;
};

export const releaseHeldCameraStream = (): void => {
  heldStream?.getTracks().forEach((track) => track.stop());
  heldStream = null;
};

/**
 * Request camera during the Open camera tap and KEEP the stream.
 * Mobile Safari often blocks a second getUserMedia after the gesture ends;
 * MindAR starts later, so we hand it this live stream instead of stopping it.
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

  releaseHeldCameraStream();

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
      heldStream = stream;
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
