# Android runtime

`facerecognitionsdk.aar` — the same engine the native Android and iOS liveness apps run, built by
`Face-Recognition-LivenessDetection-Android-LX-SDK`.

```text
example/android/libfacesdk/facerecognitionsdk.aar
```

Copy it from `Face-LivenessDetection-Android/libs/`, or:

```bash
python scripts/sync_liveness_native.py --engine \
    --engine-dest repositories/APPs/Face-LivenessDetection-ReactNative/example/android/libfacesdk
```

Gradle fails with this path in the message when the file is absent.
