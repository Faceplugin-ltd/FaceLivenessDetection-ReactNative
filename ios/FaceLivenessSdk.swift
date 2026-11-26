import React
import Foundation
import UIKit

/// Bridges React Native to the native FacePlugin liveness implementation.
///
/// The engine and both camera screens are the native ones — `FaceEngine` from the vendored
/// `FaceLivenessKit`, `ActiveLivenessViewController` and `LivenessCameraViewController`. Nothing
/// about liveness is re-implemented in JavaScript, so the camera preview, the anti-spoofing gate,
/// the challenge sequence and the result card behave exactly as they do in
/// Face-LivenessDetection-iOS.
@objc(FaceLivenessSdk)
final class FaceLivenessSdk: NSObject {

    /// The screens are presented from the key window, so this module does not need the main
    /// queue at start-up.
    @objc static func requiresMainQueueSetup() -> Bool { false }

    // MARK: - Engine

    @objc(start:withResolver:withRejecter:)
    func start(license: String,
               resolve: @escaping RCTPromiseResolveBlock,
               reject: @escaping RCTPromiseRejectBlock) {
        guard !license.trimmingCharacters(in: .whitespaces).isEmpty else {
            reject("E_LICENSE", "A license key is required.", nil)
            return
        }
        // The kit activates and initialises on its own worker and calls back on the main queue.
        FaceEngine.shared.start(license: license) { code in resolve(code) }
    }

    @objc(licenseStatus:withRejecter:)
    func licenseStatus(resolve: @escaping RCTPromiseResolveBlock,
                       reject: @escaping RCTPromiseRejectBlock) {
        FaceEngine.shared.async {
            let status = FaceEngine.shared.licenseStatus()
            DispatchQueue.main.async { resolve(Self.map(status)) }
        }
    }

    @objc(lastLicenseError:withRejecter:)
    func lastLicenseError(resolve: @escaping RCTPromiseResolveBlock,
                          reject: @escaping RCTPromiseRejectBlock) {
        resolve(FaceEngine.shared.lastLicenseError())
    }

    @objc(machineCode:withRejecter:)
    func machineCode(resolve: @escaping RCTPromiseResolveBlock,
                     reject: @escaping RCTPromiseRejectBlock) {
        FaceEngine.shared.async {
            let code = FaceEngine.shared.machineCode()
            DispatchQueue.main.async { resolve(code) }
        }
    }

    // MARK: - Screens

    @objc(startActiveLiveness:withResolver:withRejecter:)
    func startActiveLiveness(options: NSDictionary,
                             resolve: @escaping RCTPromiseResolveBlock,
                             reject: @escaping RCTPromiseRejectBlock) {
        let args = options as? [String: Any] ?? [:]
        DispatchQueue.main.async {
            guard let host = Self.topViewController() else {
                reject("E_NO_VIEW_CONTROLLER", "No view controller to present from.", nil)
                return
            }
            AppSettings.useFrontCamera = args["useFrontCamera"] as? Bool ?? true
            AppSettings.livenessThreshold = (args["livenessThreshold"] as? NSNumber)?.floatValue
                ?? ActiveLivenessOptions.defaultLivenessThreshold

            ActiveLivenessViewController.present(
                from: host,
                options: Self.options(from: args)
            ) { outcome in
                // A closed screen produces no result, which JavaScript reads as null.
                resolve(outcome.map(Self.map))
            }
        }
    }

    @objc(startPassiveLiveness:withResolver:withRejecter:)
    func startPassiveLiveness(options: NSDictionary,
                              resolve: @escaping RCTPromiseResolveBlock,
                              reject: @escaping RCTPromiseRejectBlock) {
        let args = options as? [String: Any] ?? [:]
        DispatchQueue.main.async {
            guard let host = Self.topViewController() else {
                reject("E_NO_VIEW_CONTROLLER", "No view controller to present from.", nil)
                return
            }
            AppSettings.useFrontCamera = args["useFrontCamera"] as? Bool ?? true
            AppSettings.livenessThreshold =
                (args["livenessThreshold"] as? NSNumber)?.floatValue ?? 0.5

            let controller = LivenessCameraViewController()
            let nav = UINavigationController(rootViewController: controller)
            nav.modalPresentationStyle = .fullScreen
            nav.setNavigationBarHidden(true, animated: false)
            host.present(nav, animated: true)
            resolve(nil)
        }
    }

    // MARK: - Mapping

    /// Builds the native options from the JavaScript payload, falling back to engine defaults.
    private static func options(from args: [String: Any]) -> ActiveLivenessOptions {
        var options = ActiveLivenessOptions()
        if let keys = args["pool"] as? [String] {
            // Keep the canonical enum order so the pool is stable when randomize is off.
            let wanted = Set(keys)
            let pool = ActiveCheck.allCases.filter { wanted.contains($0.key) }
            if !pool.isEmpty { options.pool = pool }
        }
        func int(_ key: String) -> Int? { (args[key] as? NSNumber)?.intValue }
        func float(_ key: String) -> Float? { (args[key] as? NSNumber)?.floatValue }
        func bool(_ key: String) -> Bool? { args[key] as? Bool }

        options.count = int("count") ?? options.count
        options.randomize = bool("randomize") ?? options.randomize
        options.livenessThreshold = float("livenessThreshold") ?? options.livenessThreshold
        options.passiveSamples = int("passiveSamples") ?? options.passiveSamples
        options.framesWait = int("framesWait") ?? options.framesWait
        options.yawThreshold = float("yawThreshold") ?? options.yawThreshold
        options.pitchThreshold = float("pitchThreshold") ?? options.pitchThreshold
        options.smileThreshold = float("smileThreshold") ?? options.smileThreshold
        options.blinkThreshold = float("blinkThreshold") ?? options.blinkThreshold
        options.blinksNumber = int("blinksNumber") ?? options.blinksNumber
        options.perspectiveThreshold = float("perspectiveThreshold") ?? options.perspectiveThreshold
        options.alignAngle = float("alignAngle") ?? options.alignAngle
        options.minFaceFraction = float("minFaceFraction") ?? options.minFaceFraction
        options.qualityThreshold = float("qualityThreshold") ?? options.qualityThreshold
        options.invertTurn = bool("invertTurn") ?? options.invertTurn
        options.invertTilt = bool("invertTilt") ?? options.invertTilt
        return options
    }

    private static func map(_ status: LicenseStatus) -> [String: Any] {
        [
            "licensed": status.licensed,
            "level": status.level,
            "levelName": status.levelName,
            "recognition": status.recognition,
            "liveness": status.liveness,
            "label": status.label,
        ]
    }

    private static func map(_ result: ActiveLivenessResult) -> [String: Any] {
        [
            "passed": result.passed,
            "failure": wire(result.failure),
            "passiveScore": result.passiveScore,
            "passivePassed": result.passivePassed,
            "challenges": result.challenges.map { $0.key },
            "outcomes": result.outcomes.map(wire),
            "durationMs": result.durationMs,
        ]
    }

    /// The wire names JavaScript and Android share.
    private static func wire(_ failure: ActiveLivenessSession.Failure) -> String {
        switch failure {
        case .none: return "NONE"
        case .spoof: return "SPOOF"
        case .check: return "CHECK"
        case .timeout: return "TIMEOUT"
        case .cancelled: return "CANCELLED"
        }
    }

    private static func wire(_ step: ActiveLivenessSession.StepState) -> String {
        switch step {
        case .pending: return "PENDING"
        case .active: return "ACTIVE"
        case .passed: return "PASSED"
        case .failed: return "FAILED"
        }
    }

    private static func topViewController() -> UIViewController? {
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        let window = scenes.flatMap { $0.windows }.first { $0.isKeyWindow }
            ?? scenes.first?.windows.first
        var top = window?.rootViewController
        while let presented = top?.presentedViewController {
            top = presented
        }
        return top
    }
}
