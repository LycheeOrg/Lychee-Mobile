/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import Capacitor
import UIKit

/// ADR-011-01: registers the app's own iOS plugins with the bridge.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(OriginalCameraPlugin())
    }
}
