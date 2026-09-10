import type { CameraFacing } from './mindar-scene';

export type CameraPermissionResult = {
  ok: boolean;
  facingMode: CameraFacing;
  error: string | null;
};

let heldStream: MediaStream | null = null;
let unlockedAudioContext: AudioContext | null = null;
let playbackVideo: HTMLVideoElement | null = null;

/** Pause and clear the shared mapped-video element immediately (frame switches). */
export const stopPlaybackVideoImmediately = (): void => {
  const video = playbackVideo;
  if (!video) return;
  video.pause();
  video.currentTime = 0;
  video.removeAttribute('src');
  video.src = '';
  video.srcObject = null;
  video.load();
};

/** Current playhead of the shared playback element (0 if unavailable). */
export const getPlaybackCurrentTime = (): number => {
  const video = playbackVideo;
  if (!video || !Number.isFinite(video.currentTime)) return 0;
  return video.currentTime;
};

/** Same video element from Open camera tap through overlay playback (needed for unmuted iOS play). */
export const getPlaybackVideoElement = (): HTMLVideoElement => {
  if (playbackVideo) return playbackVideo;
  const video = document.createElement('video');
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.playsInline = true;
  video.preload = 'auto';
  video.autoplay = true;
  video.controls = false;
  video.muted = false;
  video.volume = 1;
  playbackVideo = video;
  return video;
};

/** Call during the Open camera tap so later video can start with sound. */
export const unlockPlaybackAudio = (): void => {
  const video = getPlaybackVideoElement();
  const hasActiveClip =
    Boolean(video.currentSrc || video.getAttribute('src')) &&
    video.readyState >= HTMLMediaElement.HAVE_METADATA;
  const resumeAt = Number.isFinite(video.currentTime) ? video.currentTime : 0;
  const wasPlaying = !video.paused;

  video.muted = false;
  video.volume = 1;

  if (hasActiveClip) {
    // Unmute an in-progress clip — never pause or reload.
    void video.play().catch(() => undefined);
  } else {
    void video.play().catch(() => {
      video.muted = true;
      void video
        .play()
        .then(() => {
          video.pause();
          video.muted = false;
        })
        .catch(() => undefined);
    });
  }

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      unlockedAudioContext ??= new AudioCtx();
      void unlockedAudioContext.resume();
      const oscillator = unlockedAudioContext.createOscillator();
      const gain = unlockedAudioContext.createGain();
      gain.gain.value = 0.0001;
      oscillator.connect(gain);
      gain.connect(unlockedAudioContext.destination);
      oscillator.start(0);
      oscillator.stop(unlockedAudioContext.currentTime + 0.04);
    }
  } catch {
    // ignore — playback can still start muted
  }

  if (hasActiveClip && Number.isFinite(resumeAt) && Math.abs(video.currentTime - resumeAt) > 0.35) {
    video.currentTime = resumeAt;
    if (wasPlaying) void video.play().catch(() => undefined);
  }
};

/** Toggle mute in the same user-gesture turn (required for iOS unmute). */
export const setPlaybackMuted = (muted: boolean): void => {
  const video = getPlaybackVideoElement();
  const resumeAt = Number.isFinite(video.currentTime) ? video.currentTime : 0;
  const wasPlaying = !video.paused || Boolean(video.currentSrc);

  if (!muted) {
    unlockPlaybackAudio();
  }

  video.muted = muted;
  video.volume = 1;

  if (Number.isFinite(resumeAt) && Math.abs(video.currentTime - resumeAt) > 0.05) {
    video.currentTime = resumeAt;
  }

  if (!muted && wasPlaying) {
    void video.play().catch(() => undefined);
  }
};

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
      unlockPlaybackAudio();
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
