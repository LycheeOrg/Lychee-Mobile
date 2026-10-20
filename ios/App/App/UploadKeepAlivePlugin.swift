/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import Capacitor
import UIKit

/// NC-012-02 (Feature 012, ADR-012-01): asks iOS for background time while an upload run lasts,
/// so the WebView's queue keeps going for a while (about 30 s) after the user leaves the app.
/// When iOS expires the time, the task ends; the interrupted file is retried on return.
@objc(UploadKeepAlivePlugin)
public class UploadKeepAlivePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "UploadKeepAlivePlugin"
    public let jsName = "UploadKeepAlive"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestNotifications", returnType: CAPPluginReturnPromise),
    ]

    private var task: UIBackgroundTaskIdentifier = .invalid

    @objc func start(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.endTask()
            self.task = UIApplication.shared.beginBackgroundTask(withName: "Lychee uploads") { [weak self] in
                self?.endTask()
            }
            call.resolve()
        }
    }

    /// Progress is shown in the app only; iOS has no notification for background time.
    @objc func update(_ call: CAPPluginCall) {
        call.resolve()
    }

    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.endTask()
            call.resolve()
        }
    }

    /// No notification is posted on iOS.
    @objc func requestNotifications(_ call: CAPPluginCall) {
        call.resolve(["granted": true])
    }

    private func endTask() {
        if task != .invalid {
            UIApplication.shared.endBackgroundTask(task)
            task = .invalid
        }
    }
}
