/**
 * Types mirroring the native FacePlugin liveness API field for field, so the React Native demo,
 * the Android app and the iOS app describe an attempt the same way.
 */

/** One active-liveness challenge. The key is the wire value shared with the native side. */
export type ActiveCheckKey =
  | 'blink'
  | 'smile'
  | 'turn_left'
  | 'turn_right'
  | 'turn_up'
  | 'turn_down'
  | 'perspective';

export interface ActiveCheckInfo {
  key: ActiveCheckKey;
  /** Label shown on the challenge card and in the result list. */
  title: string;
  /** One-line instruction shown under the title. */
  hint: string;
}

/** Every challenge, in the canonical order the native enum declares. */
export const ACTIVE_CHECKS: readonly ActiveCheckInfo[] = [
  { key: 'blink', title: 'Blink', hint: 'Blink your eyes a couple of times' },
  { key: 'smile', title: 'Smile', hint: 'Give the camera a clear smile' },
  { key: 'turn_left', title: 'Turn left', hint: 'Turn your head to your left' },
  {
    key: 'turn_right',
    title: 'Turn right',
    hint: 'Turn your head to your right',
  },
  {
    key: 'turn_up',
    title: 'Look up',
    hint: 'Tilt your head up, keep your eyes on the screen',
  },
  { key: 'turn_down', title: 'Look down', hint: 'Tilt your head down slowly' },
  {
    key: 'perspective',
    title: 'Move closer',
    hint: 'Bring the phone a little closer to your face',
  },
] as const;

/** Every challenge but "move closer", which not every placement of the phone allows. */
export const DEFAULT_POOL: readonly ActiveCheckKey[] = [
  'blink',
  'smile',
  'turn_left',
  'turn_right',
  'turn_up',
  'turn_down',
] as const;

export function checkInfo(key: ActiveCheckKey): ActiveCheckInfo {
  return ACTIVE_CHECKS.find((c) => c.key === key) ?? ACTIVE_CHECKS[0]!;
}

/** The engine's own return codes (`FaceRecognitionSDK.SDK_*`). */
export const SdkCode = {
  success: 0,
  licenseInvalid: 1,
  licenseExpired: 2,
  notActivated: 3,
  initFailed: 4,
} as const;

export type EngineState =
  | 'loading'
  | 'ready'
  | 'notActivated'
  | 'licenseInvalid'
  | 'licenseExpired'
  | 'failed';

export function stateForCode(code: number): EngineState {
  switch (code) {
    case SdkCode.success:
      return 'ready';
    case SdkCode.licenseInvalid:
      return 'licenseInvalid';
    case SdkCode.licenseExpired:
      return 'licenseExpired';
    case SdkCode.notActivated:
      return 'notActivated';
    default:
      return 'failed';
  }
}

/** The short message the native home screen shows in its status pill. */
export function messageForCode(code: number): string {
  switch (code) {
    case SdkCode.licenseInvalid:
      return 'Invalid license!';
    case SdkCode.licenseExpired:
      return 'License expired!';
    case SdkCode.notActivated:
      return 'No activated!';
    case SdkCode.initFailed:
      return 'Init error!';
    default:
      return `SDK not ready: ${code}`;
  }
}

/**
 * License capabilities from the engine. The liveness screens unlock when `liveness` is granted
 * (a "Liveness only" or "Recognition + Liveness" key).
 */
export interface LicenseStatus {
  licensed: boolean;
  level: number;
  levelName: string;
  recognition: boolean;
  liveness: boolean;
  label: string;
}

export const NOT_LICENSED: LicenseStatus = {
  licensed: false,
  level: -1,
  levelName: 'None',
  recognition: false,
  liveness: false,
  label: 'Not licensed',
};

/**
 * How one active-liveness attempt is run.
 *
 * Every attempt begins with the passive anti-spoofing gate, which the face has to clear at
 * `livenessThreshold` before any challenge is asked. The angles are degrees, as the engine reports
 * head pose. Every field is optional; the native side falls back to the engine's own defaults.
 */
export interface ActiveLivenessOptions {
  /** Pool the sequence is drawn from. */
  pool?: readonly ActiveCheckKey[];
  /** How many challenges one attempt asks for (1–6). */
  count?: number;
  /** Shuffle the order per attempt so a recording cannot be replayed. */
  randomize?: boolean;
  livenessThreshold?: number;
  passiveSamples?: number;
  framesWait?: number;
  yawThreshold?: number;
  pitchThreshold?: number;
  smileThreshold?: number;
  blinkThreshold?: number;
  blinksNumber?: number;
  perspectiveThreshold?: number;
  alignAngle?: number;
  /** Smallest the face may be, as a fraction of the frame's short side, to be scored. */
  minFaceFraction?: number;
  /** Lowest image quality the engine's own score may report and still be judged. */
  qualityThreshold?: number;
  invertTurn?: boolean;
  invertTilt?: boolean;
  useFrontCamera?: boolean;
}

/** Defaults, matching the native `ActiveLivenessOptions` exactly. */
export const DEFAULT_OPTIONS = {
  count: 3,
  randomize: true,
  /** The engine's own passive-liveness operating point. */
  livenessThreshold: 0.5,
  /** Frames the passive gate averages before it decides. */
  passiveSamples: 3,
  /** About 15 analyzed frames a second on a mid-range phone. */
  framesWait: 150,
  yawThreshold: 25,
  pitchThreshold: 15,
  smileThreshold: 0.5,
  blinkThreshold: 0.3,
  blinksNumber: 2,
  perspectiveThreshold: 0.15,
  alignAngle: 12,
  minFaceFraction: 0.3,
  qualityThreshold: 0.3,
  invertTurn: false,
  invertTilt: false,
} as const;

/** Outcome of one challenge, or of the anti-spoofing gate. */
export type StepState = 'PENDING' | 'ACTIVE' | 'PASSED' | 'FAILED';

/** The word the native result card shows for an outcome. */
export function stepLabel(step: StepState): string {
  switch (step) {
    case 'PASSED':
      return 'Passed';
    case 'FAILED':
      return 'Failed';
    default:
      return 'Not reached';
  }
}

/** Why an attempt did not pass. */
export type ActiveLivenessFailure =
  'NONE' | 'SPOOF' | 'CHECK' | 'TIMEOUT' | 'CANCELLED';

/**
 * What one attempt came to, handed back by the native active-liveness screen.
 *
 * `passed` is the only thing most callers need: it is true when the passive anti-spoofing gate
 * cleared *and* every challenge was completed.
 */
export interface ActiveLivenessResult {
  passed: boolean;
  failure: ActiveLivenessFailure;
  /** Averaged passive anti-spoofing score, or -1 when the engine never returned one. */
  passiveScore: number;
  passivePassed: boolean;
  /** The challenges asked, in the order they were asked. */
  challenges: ActiveCheckKey[];
  /** One outcome per entry of `challenges`. */
  outcomes: StepState[];
  durationMs: number;
}

/** The challenge that ended the attempt, when one did. */
export function failedCheck(
  result: ActiveLivenessResult
): ActiveCheckKey | null {
  const index = result.outcomes.indexOf('FAILED');
  if (index < 0 || index >= result.challenges.length) return null;
  return result.challenges[index] ?? null;
}
