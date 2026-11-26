import AVFoundation
import UIKit

/// Small shims the vendored native sources expect from their host app.
///
/// `scripts/sync_liveness_native.py` copies the native screens in **verbatim** so they cannot
/// drift from Face-LivenessDetection-iOS. Those files reference a handful of things that live in
/// the native demo app rather than in the kit — the palette, a padded label, the nav chrome and
/// the lens/threshold preference — so the plugin supplies them here under the same names. Keeping
/// the names is deliberate: it means the vendored code needs no rewriting.
enum ScreenChrome {
    /// The native demo shows a labelled Back control on pushed screens. The plugin presents its
    /// screens modally, with their own close buttons, so there is no navigation bar to style.
    static func showInnerBar(on viewController: UIViewController) {
        viewController.navigationController?.setNavigationBarHidden(true, animated: false)
    }
}

/// The lens and score threshold the host passed in for this presentation.
///
/// The plugin stores no settings of its own — the Flutter layer owns them and hands them over
/// before a screen opens, which is why these are plain static values rather than `UserDefaults`.
enum AppSettings {
    static var useFrontCamera: Bool = true

    static var cameraPosition: AVCaptureDevice.Position { useFrontCamera ? .front : .back }

    /// Lowest score that counts as a live face.
    static var livenessThreshold: Float = 0.5

    /// The same rule the native app applies: a spoof label wins over any score.
    static func livenessPassed(score: Float, label: String?) -> Bool {
        let lower = (label ?? "").lowercased()
        if lower.contains("spoof") || lower.contains("fake") { return false }
        return score >= livenessThreshold
    }
}

/// Passive-liveness verdict colours, matching the native demo's `liveness_*` palette.
enum FPColor {
    static let livenessReal = UIColor(rgb: 0x2EE6A6)
    static let livenessSpoof = UIColor(rgb: 0xFF6B6B)
    static let livenessNeutral = UIColor.white
}

/// A label with text insets, used for the passive screen's title and hint pills.
final class PaddedLabel: UILabel {
    var insets = UIEdgeInsets(top: 8, left: 14, bottom: 8, right: 14)

    override func drawText(in rect: CGRect) {
        super.drawText(in: rect.inset(by: insets))
    }

    override var intrinsicContentSize: CGSize {
        let size = super.intrinsicContentSize
        return CGSize(
            width: size.width + insets.left + insets.right,
            height: size.height + insets.top + insets.bottom
        )
    }
}

extension UIColor {
    convenience init(rgb: UInt32, alpha: CGFloat = 1) {
        self.init(
            red: CGFloat((rgb >> 16) & 0xFF) / 255,
            green: CGFloat((rgb >> 8) & 0xFF) / 255,
            blue: CGFloat(rgb & 0xFF) / 255,
            alpha: alpha
        )
    }
}
