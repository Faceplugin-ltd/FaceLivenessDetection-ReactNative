require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))
folly_compiler_flags = '-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -Wno-comma -Wno-shorten-64-to-32'

Pod::Spec.new do |s|
  s.name         = "face-liveness-sdk"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => "https://github.com/Faceplugin-ltd/FaceLivenessDetection-React-Native.git", :tag => "#{s.version}" }

  # The bridge (FaceLivenessSdk.swift + the ObjC shim) and the vendored native liveness sources.
  s.source_files  = "ios/**/*.{h,m,mm,swift}"
  s.swift_version = "5.0"

  # Same engine binaries Face-Recognition-LivenessDetection-ReactNative embeds.
  # FacePlugin.xcframework's device slice is named FacePPlugin.framework — link that
  # name or ld looks for FacePlugin and fails.
  frameworks = []
  %w[
    facerecognitionsdk.framework
    FacePluginSDK.xcframework
    FacePPlugin.framework
    FaceDetect.xcframework
  ].each do |name|
    path = File.join(__dir__, "ios/Frameworks", name)
    frameworks << "ios/Frameworks/#{name}" if File.directory?(path)
  end
  plugin_slice = File.join(__dir__, "ios/Frameworks/FacePlugin.xcframework/ios-arm64/FacePPlugin.framework")
  if File.directory?(plugin_slice) && frameworks.none? { |p| p.include?("FacePPlugin") }
    frameworks << "ios/Frameworks/FacePlugin.xcframework/ios-arm64/FacePPlugin.framework"
  end
  frameworks.uniq! { |p| File.basename(p, ".*") }
  frameworks.reject! do |p|
    p.end_with?(".framework") && frameworks.include?(p.sub(/\.framework\z/, ".xcframework"))
  end

  missing = %w[
    facerecognitionsdk.framework
    FacePluginSDK.xcframework
    FaceDetect.xcframework
  ].reject { |name| File.directory?(File.join(__dir__, "ios/Frameworks", name)) }
  if frameworks.none? { |p| p.include?("FacePPlugin") }
    missing << "FacePPlugin.framework (or FacePlugin.xcframework/ios-arm64/FacePPlugin.framework)"
  end

  unless missing.empty?
    raise Pod::Informative, <<~MSG
      face-liveness-sdk: missing engine framework(s) in ios/Frameworks:
        #{missing.join("\n  ")}

      They are the same binaries the native iOS app embeds. Get them from the
      FaceRecognition-LivenessDetection-iOS release and drop them in
      ios/Frameworks/, then run `pod install` again.
    MSG
  end

  s.vendored_frameworks = frameworks

  if respond_to?(:install_modules_dependencies, true)
    install_modules_dependencies(s)
  else
    s.dependency "React-Core"

    if ENV['RCT_NEW_ARCH_ENABLED'] == '1' then
      s.compiler_flags = folly_compiler_flags + " -DRCT_NEW_ARCH_ENABLED=1"
      s.pod_target_xcconfig    = {
          "HEADER_SEARCH_PATHS" => "\"$(PODS_ROOT)/boost\"",
          "OTHER_CPLUSPLUSFLAGS" => "-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1",
          "CLANG_CXX_LANGUAGE_STANDARD" => "c++17"
      }
      s.dependency "React-Codegen"
      s.dependency "RCT-Folly"
      s.dependency "RCTRequired"
      s.dependency "RCTTypeSafety"
      s.dependency "ReactCommon/turbomodule/core"
    end
  end
end
