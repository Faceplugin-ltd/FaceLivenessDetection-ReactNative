# Engine frameworks

This plugin launches the **native** liveness screens, so it links the same engine the native iOS
app embeds. Four bundles belong here and none of them are in git:

| Bundle | What it is |
| ------ | ---------- |
| `facerecognitionsdk.framework` | The engine wrapper (FacePlugin engine build) |
| `FacePluginSDK.xcframework` | Vendor runtime the wrapper links |
| `FacePlugin.xcframework` | Vendor runtime the wrapper links |
| `FaceDetect.xcframework` | Vendor detector the wrapper links |

Get them from the
[Face-Recognition-LivenessDetection-iOS](https://github.com/Faceplugin-ltd/FaceRecognition-LivenessDetection-iOS)
release, or copy them from that repository's checkout, then run `pod install` in `example/ios`.

`pod install` fails with a named list if any of them is absent, so a missing engine is reported
before the build rather than as a link error.
