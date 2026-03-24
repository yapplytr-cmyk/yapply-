import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        return true
    }

    // MARK: - Push Notifications

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        // Forward to Capacitor (standard)
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)

        // ALSO: inject the token directly into JavaScript as a global variable
        // This bypasses the Capacitor plugin listener which is unreliable
        let tokenString = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        UserDefaults.standard.set(tokenString, forKey: "yapply_apns_token")

        // Evaluate JS on the web view to set the token globally
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            if let rootVC = self.window?.rootViewController as? CAPBridgeViewController {
                let js = "window.__yapplyAPNsToken = '\(tokenString)'; window.dispatchEvent(new CustomEvent('yapply-apns-token', { detail: { token: '\(tokenString)' } })); console.log('[yapply-push-native] Token injected:', '\(tokenString.prefix(20))...');"
                rootVC.bridge?.webView?.evaluateJavaScript(js) { _, error in
                    if let error = error {
                        print("[Yapply] JS token injection error: \(error)")
                    } else {
                        print("[Yapply] Token injected into JS: \(tokenString.prefix(20))...")
                    }
                }
            }
        }
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
        print("[Yapply] APNs registration FAILED: \(error.localizedDescription)")

        // Also inject the error into JS
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            if let rootVC = self.window?.rootViewController as? CAPBridgeViewController {
                let errorMsg = error.localizedDescription.replacingOccurrences(of: "'", with: "\\'")
                let js = "window.__yapplyAPNsError = '\(errorMsg)'; window.dispatchEvent(new CustomEvent('yapply-apns-error', { detail: { error: '\(errorMsg)' } })); console.error('[yapply-push-native] Registration error:', '\(errorMsg)');"
                rootVC.bridge?.webView?.evaluateJavaScript(js, completionHandler: nil)
            }
        }
    }

    func applicationWillResignActive(_ application: UIApplication) {
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Clear the app icon badge when returning from background
        application.applicationIconBadgeNumber = 0
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Clear the app icon badge when the user opens the app
        application.applicationIconBadgeNumber = 0
    }

    func applicationWillTerminate(_ application: UIApplication) {
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
