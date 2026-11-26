package com.faceplugin.face_liveness_sdk

import android.app.Activity
import android.content.Intent
import android.os.Handler
import android.os.Looper
import androidx.camera.core.CameraSelector
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.faceplugin.face_liveness_sdk.passive.PassiveLivenessActivity
import com.faceplugin.faceliveness.active.ActiveCheck
import com.faceplugin.faceliveness.active.ActiveLivenessActivity
import com.faceplugin.faceliveness.active.ActiveLivenessOptions
import com.faceplugin.faceliveness.active.ActiveLivenessResult
import com.faceplugin.faceliveness.kit.FaceEngine
import com.faceplugin.faceliveness.kit.LicenseStatus
import com.faceplugin.facerecognitionsdk.FaceRecognitionSDK

/**
 * Bridges React Native to the native FacePlugin liveness implementation.
 *
 * The engine and both camera screens are the native ones — [FaceEngine] from `face-liveness-kit`,
 * [ActiveLivenessActivity] from `face-liveness-active`, and [PassiveLivenessActivity], a port of
 * the native demo's passive screen. Nothing about liveness is re-implemented in JavaScript, so the
 * camera preview, the anti-spoofing gate, the challenge sequence and the result card behave
 * exactly as they do in Face-LivenessDetection-Android.
 */
class FaceLivenessSdkModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val main = Handler(Looper.getMainLooper())

    /** The pending `startActiveLiveness` call, answered from the activity result. */
    private var activePromise: Promise? = null

    private val activityListener: ActivityEventListener = object : BaseActivityEventListener() {
        override fun onActivityResult(
            activity: Activity?,
            requestCode: Int,
            resultCode: Int,
            data: Intent?,
        ) {
            if (requestCode != REQUEST_ACTIVE_LIVENESS) return
            val pending = activePromise ?: return
            activePromise = null
            // A closed screen produces no result, which JavaScript reads as null.
            pending.resolve(ActiveLivenessActivity.result(data)?.toWritableMap())
        }
    }

    init {
        reactContext.addActivityEventListener(activityListener)
    }

    override fun getName(): String = NAME

    override fun invalidate() {
        reactApplicationContext.removeActivityEventListener(activityListener)
        super.invalidate()
    }

    // region engine

    @ReactMethod
    fun start(license: String, promise: Promise) {
        if (license.isBlank()) {
            promise.reject("E_LICENSE", "A license key is required.")
            return
        }
        // The kit activates and initialises on its own worker and calls back on the main thread.
        FaceEngine.start(reactApplicationContext, license) { code -> promise.resolve(code) }
    }

    @ReactMethod
    fun licenseStatus(promise: Promise) {
        FaceEngine.async {
            val status = FaceEngine.licenseStatus()
            main.post { promise.resolve(status.toWritableMap()) }
        }
    }

    @ReactMethod
    fun lastLicenseError(promise: Promise) {
        promise.resolve(FaceEngine.lastLicenseError())
    }

    @ReactMethod
    fun machineCode(promise: Promise) {
        FaceEngine.async {
            val code = try {
                synchronized(FaceEngine.lock) {
                    FaceRecognitionSDK.machineCode(reactApplicationContext)
                }
            } catch (_: Throwable) {
                ""
            }
            main.post { promise.resolve(code.orEmpty()) }
        }
    }

    // endregion

    // region screens

    @ReactMethod
    fun startActiveLiveness(options: ReadableMap, promise: Promise) {
        val host = currentActivity
        if (host == null) {
            promise.reject("E_NO_ACTIVITY", "The screen needs a foreground Activity.")
            return
        }
        if (activePromise != null) {
            promise.reject("E_BUSY", "An active-liveness attempt is already running.")
            return
        }
        val lens = if (options.optBoolean("useFrontCamera", true)) {
            CameraSelector.LENS_FACING_FRONT
        } else {
            CameraSelector.LENS_FACING_BACK
        }
        activePromise = promise
        try {
            host.startActivityForResult(
                ActiveLivenessActivity.intent(host, options.toOptions(), lens),
                REQUEST_ACTIVE_LIVENESS,
            )
        } catch (t: Throwable) {
            activePromise = null
            promise.reject("E_LAUNCH", t.message, t)
        }
    }

    @ReactMethod
    fun startPassiveLiveness(options: ReadableMap, promise: Promise) {
        val host = currentActivity
        if (host == null) {
            promise.reject("E_NO_ACTIVITY", "The screen needs a foreground Activity.")
            return
        }
        host.startActivity(
            PassiveLivenessActivity.intent(
                host,
                useFrontCamera = options.optBoolean("useFrontCamera", true),
                livenessThreshold = options.optFloat(
                    "livenessThreshold",
                    ActiveLivenessOptions.DEFAULT_LIVENESS_THRESHOLD,
                ),
            ),
        )
        promise.resolve(null)
    }

    // endregion

    private companion object {
        const val NAME = "FaceLivenessSdk"
        const val REQUEST_ACTIVE_LIVENESS = 0xFA11
    }
}

// region mapping

private fun ReadableMap.optBoolean(key: String, fallback: Boolean): Boolean =
    if (hasKey(key) && !isNull(key)) getBoolean(key) else fallback

private fun ReadableMap.optFloat(key: String, fallback: Float): Float =
    if (hasKey(key) && !isNull(key)) getDouble(key).toFloat() else fallback

private fun ReadableMap.optInt(key: String, fallback: Int): Int =
    if (hasKey(key) && !isNull(key)) getDouble(key).toInt() else fallback

/** Builds the native options from the JavaScript payload, falling back to the engine's defaults. */
private fun ReadableMap.toOptions(): ActiveLivenessOptions {
    val defaults = ActiveLivenessOptions()
    val keys = if (hasKey("pool") && !isNull("pool")) {
        getArray("pool")?.toArrayList()?.mapNotNull { it as? String }?.toSet().orEmpty()
    } else {
        emptySet()
    }
    // Keep the canonical enum order so the pool is stable when randomize is off.
    val pool = ActiveCheck.entries.filter { keys.contains(it.key) }
    return ActiveLivenessOptions(
        pool = pool.ifEmpty { ActiveLivenessOptions.DEFAULT_POOL },
        count = optInt("count", defaults.count),
        randomize = optBoolean("randomize", defaults.randomize),
        livenessThreshold = optFloat("livenessThreshold", defaults.livenessThreshold),
        passiveSamples = optInt("passiveSamples", defaults.passiveSamples),
        framesWait = optInt("framesWait", defaults.framesWait),
        yawThreshold = optFloat("yawThreshold", defaults.yawThreshold),
        pitchThreshold = optFloat("pitchThreshold", defaults.pitchThreshold),
        smileThreshold = optFloat("smileThreshold", defaults.smileThreshold),
        blinkThreshold = optFloat("blinkThreshold", defaults.blinkThreshold),
        blinksNumber = optInt("blinksNumber", defaults.blinksNumber),
        perspectiveThreshold = optFloat("perspectiveThreshold", defaults.perspectiveThreshold),
        alignAngle = optFloat("alignAngle", defaults.alignAngle),
        minFaceFraction = optFloat("minFaceFraction", defaults.minFaceFraction),
        qualityThreshold = optFloat("qualityThreshold", defaults.qualityThreshold),
        invertTurn = optBoolean("invertTurn", defaults.invertTurn),
        invertTilt = optBoolean("invertTilt", defaults.invertTilt),
    )
}

private fun LicenseStatus.toWritableMap(): WritableMap = Arguments.createMap().apply {
    putBoolean("licensed", licensed)
    putInt("level", level)
    putString("levelName", levelName)
    putBoolean("recognition", recognition)
    putBoolean("liveness", liveness)
    putString("label", label)
}

private fun ActiveLivenessResult.toWritableMap(): WritableMap = Arguments.createMap().apply {
    putBoolean("passed", passed)
    putString("failure", failure.name)
    putDouble("passiveScore", passiveScore.toDouble())
    putBoolean("passivePassed", passivePassed)
    putArray("challenges", Arguments.createArray().apply {
        challenges.forEach { pushString(it.key) }
    })
    putArray("outcomes", Arguments.createArray().apply {
        outcomes.forEach { pushString(it.name) }
    })
    putDouble("durationMs", durationMs.toDouble())
}

// endregion
