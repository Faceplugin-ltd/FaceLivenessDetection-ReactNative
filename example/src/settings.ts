import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  type ActiveCheckKey,
  type ActiveLivenessOptions,
  DEFAULT_OPTIONS,
  DEFAULT_POOL,
} from 'face-liveness-sdk';

/**
 * Every preference this demo stores, in one place.
 *
 * The plugin takes its configuration as arguments, so this is the only part of the app that knows
 * about persistence: it reads what the user chose and builds the options the native
 * active-liveness screen runs with.
 *
 * The fields and defaults mirror Android `data/AppSettings` and iOS `AppSettings`, so the demos
 * behave the same. Defaults are the engine's own operating points.
 */
export interface LivenessSettings {
  useFrontCamera: boolean;
  livenessThreshold: number;
  pool: ActiveCheckKey[];
  count: number;
  randomize: boolean;
  framesWait: number;
  yaw: number;
  pitch: number;
  smile: number;
  blink: number;
  blinksNumber: number;
  perspective: number;
  alignAngle: number;
  minFace: number;
  quality: number;
  invertTurn: boolean;
  invertTilt: boolean;
}

export const DEFAULT_SETTINGS: LivenessSettings = {
  useFrontCamera: true,
  livenessThreshold: DEFAULT_OPTIONS.livenessThreshold,
  pool: [...DEFAULT_POOL],
  count: DEFAULT_OPTIONS.count,
  randomize: DEFAULT_OPTIONS.randomize,
  framesWait: DEFAULT_OPTIONS.framesWait,
  yaw: DEFAULT_OPTIONS.yawThreshold,
  pitch: DEFAULT_OPTIONS.pitchThreshold,
  smile: DEFAULT_OPTIONS.smileThreshold,
  blink: DEFAULT_OPTIONS.blinkThreshold,
  blinksNumber: DEFAULT_OPTIONS.blinksNumber,
  perspective: DEFAULT_OPTIONS.perspectiveThreshold,
  alignAngle: DEFAULT_OPTIONS.alignAngle,
  minFace: DEFAULT_OPTIONS.minFaceFraction,
  quality: DEFAULT_OPTIONS.qualityThreshold,
  invertTurn: DEFAULT_OPTIONS.invertTurn,
  invertTilt: DEFAULT_OPTIONS.invertTilt,
};

const STORAGE_KEY = 'faceplugin.liveness.settings';

export async function loadSettings(): Promise<LivenessSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const stored = JSON.parse(raw) as Partial<LivenessSettings>;
    // Merge over the defaults so a key added in a later build still has a value.
    return { ...DEFAULT_SETTINGS, ...stored };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: LivenessSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // A demo should not fail because a preference could not be written.
  }
}

export async function restoreDefaults(): Promise<LivenessSettings> {
  await AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
  return { ...DEFAULT_SETTINGS };
}

/** What the native active-liveness screen should run, as the user has it configured. */
export function toOptions(s: LivenessSettings): ActiveLivenessOptions {
  return {
    pool: s.pool.length ? s.pool : [...DEFAULT_POOL],
    count: s.count,
    randomize: s.randomize,
    livenessThreshold: s.livenessThreshold,
    framesWait: s.framesWait,
    yawThreshold: s.yaw,
    pitchThreshold: s.pitch,
    smileThreshold: s.smile,
    blinkThreshold: s.blink,
    blinksNumber: s.blinksNumber,
    perspectiveThreshold: s.perspective,
    alignAngle: s.alignAngle,
    minFaceFraction: s.minFace,
    qualityThreshold: s.quality,
    invertTurn: s.invertTurn,
    invertTilt: s.invertTilt,
    useFrontCamera: s.useFrontCamera,
  };
}
