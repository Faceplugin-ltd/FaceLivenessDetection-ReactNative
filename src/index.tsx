import { NativeModules, Platform } from 'react-native';

import {
  type ActiveLivenessOptions,
  type ActiveLivenessResult,
  type EngineState,
  type LicenseStatus,
  messageForCode,
  NOT_LICENSED,
  SdkCode,
  stateForCode,
} from './types';

export * from './types';

const LINKING_ERROR =
  `The package 'face-liveness-sdk' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

interface NativeFaceLivenessSdk {
  start(license: string): Promise<number>;
  licenseStatus(): Promise<LicenseStatus>;
  lastLicenseError(): Promise<string>;
  machineCode(): Promise<string>;
  startActiveLiveness(
    options: Record<string, unknown>
  ): Promise<ActiveLivenessResult | null>;
  startPassiveLiveness(options: Record<string, unknown>): Promise<void>;
}

const Native: NativeFaceLivenessSdk = NativeModules.FaceLivenessSdk
  ? NativeModules.FaceLivenessSdk
  : new Proxy({} as NativeFaceLivenessSdk, {
      get() {
        throw new Error(LINKING_ERROR);
      },
    });

/**
 * Process-wide engine owner: activation, and the licence state the UI reads.
 *
 * The engine is `FaceRecognitionSDK` — the same build the native Android and iOS liveness apps
 * run, loaded natively. Call `start` once.
 *
 * Mirrors Android `face-liveness-kit/FaceEngine` and iOS `FaceEngine`.
 */
class Engine {
  private _state: EngineState = 'loading';
  private _license: LicenseStatus = NOT_LICENSED;
  private _lastCode: number = SdkCode.initFailed;
  private _listeners = new Set<(state: EngineState) => void>();

  get state(): EngineState {
    return this._state;
  }

  get isReady(): boolean {
    return this._state === 'ready';
  }

  /** What the last `start` found the key to unlock. */
  get license(): LicenseStatus {
    return this._license;
  }

  get lastCode(): number {
    return this._lastCode;
  }

  /** Called whenever the state changes. Returns an unsubscribe function. */
  addListener(listener: (state: EngineState) => void): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  private publish(next: EngineState): void {
    this._state = next;
    this._listeners.forEach((listener) => listener(next));
  }

  /**
   * Activate with `license` and load the models. Safe to call more than once; a ready engine
   * returns immediately.
   */
  async start(license: string): Promise<number> {
    if (this.isReady) return SdkCode.success;
    this.publish('loading');
    const code = await Native.start(license);
    this._lastCode = code;
    this.publish(stateForCode(code));
    this._license = await this.refreshLicense();
    return code;
  }

  async refreshLicense(): Promise<LicenseStatus> {
    this._license = (await Native.licenseStatus()) ?? NOT_LICENSED;
    return this._license;
  }

  lastLicenseError(): Promise<string> {
    return Native.lastLicenseError();
  }

  machineCode(): Promise<string> {
    return Native.machineCode();
  }

  /** The message the native home screen shows in its status pill. */
  async statusMessage(): Promise<string> {
    switch (this._state) {
      case 'loading':
        return 'Loading on-device models…';
      case 'ready':
        return `Ready · ${this._license.label}`;
      case 'failed': {
        const detail = (await this.lastLicenseError()).trim();
        return detail ? `Init error! ${detail}` : 'Init error!';
      }
      default:
        return messageForCode(this._lastCode);
    }
  }
}

/** The engine, as one process-wide instance. */
export const FaceLivenessEngine = new Engine();

/**
 * Launches the native liveness screens.
 *
 * `FaceLivenessEngine.start` has to have succeeded first; the screens refuse to run on an engine
 * that is not ready.
 */
export const FaceLiveness = {
  /**
   * Opens the guided active-liveness screen and waits for the attempt to finish.
   *
   * One attempt runs in three stages: the face is found and aligned, the **passive anti-spoofing
   * gate** scores it, and only then are the challenges asked — so a printed photo or a replayed
   * video is turned away before it is ever invited to blink.
   *
   * Resolves to `null` when the user closed the screen before an attempt produced a result.
   */
  startActiveLiveness(
    options: ActiveLivenessOptions = {}
  ): Promise<ActiveLivenessResult | null> {
    return Native.startActiveLiveness({
      ...options,
      pool: options.pool ? [...options.pool] : undefined,
    });
  },

  /**
   * Opens the passive-liveness screen: every camera frame is scored on its own, with no action
   * asked of the user, and the HUD shows liveness, quality and head pose.
   */
  startPassiveLiveness(
    options: { useFrontCamera?: boolean; livenessThreshold?: number } = {}
  ): Promise<void> {
    return Native.startPassiveLiveness({
      useFrontCamera: options.useFrontCamera ?? true,
      livenessThreshold: options.livenessThreshold ?? 0.5,
    });
  },
};
