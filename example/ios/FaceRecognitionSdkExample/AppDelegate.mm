#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  // Must match example/app.json "name" / AppRegistry.registerComponent.
  self.moduleName = @"FaceLivenessSdkExample";
  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};

  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self bundleURL];
}

- (NSURL *)bundleURL
{
  // `python run_ios` embeds main.jsbundle. Prefer it so a Debug device install
  // boots without Metro. Fall back to the packager when no bundle is present.
  NSURL *embedded = [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
  if (embedded != nil) {
    return embedded;
  }
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return nil;
#endif
}

@end
