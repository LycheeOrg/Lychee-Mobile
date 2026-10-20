/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

import AVFoundation
import Capacitor
import CoreLocation
import ImageIO
import UIKit
import UniformTypeIdentifiers

/// NC-011-02 (Feature 011, ADR-011-01): takes a photo with Apple's camera and writes it once as a
/// JPEG with the capture's metadata and, when the phone has a fix, its location. The file stays
/// in Application Support until Lychee has it (FR-011-04).
@objc(OriginalCameraPlugin)
public class OriginalCameraPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "OriginalCameraPlugin"
    public let jsName = "OriginalCamera"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "capture", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "deleteCapture", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "hasCamera", returnType: CAPPluginReturnPromise),
    ]

    /// FR-011-03: how long a photo waits for a location fix after it was taken.
    private static let locationWait: TimeInterval = 10
    private static let captureName = "^[A-Za-z0-9_.-]{1,100}$"

    private var pendingCall: CAPPluginCall?
    private var pendingName: String?
    private let locator = Locator()

    @objc func hasCamera(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            call.resolve(["available": UIImagePickerController.isSourceTypeAvailable(.camera)])
        }
    }

    @objc func capture(_ call: CAPPluginCall) {
        guard let name = call.getString("name"), name.range(of: Self.captureName, options: .regularExpression) != nil else {
            call.reject("A plain file name is required.", "UNREADABLE")
            return
        }
        DispatchQueue.main.async {
            guard UIImagePickerController.isSourceTypeAvailable(.camera) else {
                call.reject("No camera.", "NO_CAMERA")
                return
            }
            switch AVCaptureDevice.authorizationStatus(for: .video) {
            case .authorized:
                self.openCamera(call, name)
            case .notDetermined:
                AVCaptureDevice.requestAccess(for: .video) { granted in
                    DispatchQueue.main.async {
                        if granted {
                            self.openCamera(call, name)
                        } else {
                            call.reject("Camera access denied.", "PERMISSION_DENIED")
                        }
                    }
                }
            default:
                call.reject("Camera access denied.", "PERMISSION_DENIED")
            }
        }
    }

    /// FR-011-04: deletes a taken photo once Lychee has it; only files in the capture folder.
    @objc func deleteCapture(_ call: CAPPluginCall) {
        if let path = call.getString("path"), let url = URL(string: path), let dir = try? Self.capturesDir(),
           url.deletingLastPathComponent().standardizedFileURL == dir.standardizedFileURL {
            try? FileManager.default.removeItem(at: url)
        }
        call.resolve()
    }

    private func openCamera(_ call: CAPPluginCall, _ name: String) {
        locator.start()
        pendingCall = call
        pendingName = name
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.cameraCaptureMode = .photo
        picker.delegate = self
        bridge?.viewController?.present(picker, animated: true)
    }

    private func finish() -> (CAPPluginCall, String)? {
        defer {
            pendingCall = nil
            pendingName = nil
        }
        guard let call = pendingCall, let name = pendingName else {
            return nil
        }
        return (call, name)
    }

    /// One JPEG at full quality with the capture's metadata and a GPS block (NFR-011-01).
    private static func write(_ image: CGImage, metadata: [String: Any], location: CLLocation?, name: String) throws -> URL {
        let url = try freeURL(in: capturesDir(), name: name)
        guard let destination = CGImageDestinationCreateWithURL(url as CFURL, UTType.jpeg.identifier as CFString, 1, nil) else {
            throw CaptureError.unwritable
        }
        var properties = metadata
        if let location {
            properties[kCGImagePropertyGPSDictionary as String] = gps(location)
        }
        properties[kCGImageDestinationLossyCompressionQuality as String] = 1.0
        CGImageDestinationAddImage(destination, image, properties as CFDictionary)
        guard CGImageDestinationFinalize(destination) else {
            throw CaptureError.unwritable
        }
        return url
    }

    /// EXIF GPS as Apple's Camera writes it: unsigned degrees with N/S and E/W references, UTC time.
    private static func gps(_ location: CLLocation) -> [String: Any] {
        let coordinate = location.coordinate
        let date = DateFormatter()
        date.timeZone = TimeZone(identifier: "UTC")
        date.locale = Locale(identifier: "en_US_POSIX")
        date.dateFormat = "yyyy:MM:dd"
        let time = DateFormatter()
        time.timeZone = date.timeZone
        time.locale = date.locale
        time.dateFormat = "HH:mm:ss.SS"
        var gps: [String: Any] = [
            kCGImagePropertyGPSLatitude as String: abs(coordinate.latitude),
            kCGImagePropertyGPSLatitudeRef as String: coordinate.latitude >= 0 ? "N" : "S",
            kCGImagePropertyGPSLongitude as String: abs(coordinate.longitude),
            kCGImagePropertyGPSLongitudeRef as String: coordinate.longitude >= 0 ? "E" : "W",
            kCGImagePropertyGPSDateStamp as String: date.string(from: location.timestamp),
            kCGImagePropertyGPSTimeStamp as String: time.string(from: location.timestamp),
            kCGImagePropertyGPSHPositioningError as String: location.horizontalAccuracy,
        ]
        if location.verticalAccuracy >= 0 {
            gps[kCGImagePropertyGPSAltitude as String] = abs(location.altitude)
            gps[kCGImagePropertyGPSAltitudeRef as String] = location.altitude < 0 ? 1 : 0
        }
        return gps
    }

    /// App-private and persistent, not backed up (FR-011-04).
    private static func capturesDir() throws -> URL {
        let support = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
        var dir = support.appendingPathComponent("captures", isDirectory: true)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        try? dir.setResourceValues(values)
        return dir
    }

    /// `name`, or `name (2).jpg`, … when taken.
    private static func freeURL(in dir: URL, name: String) -> URL {
        let base = (name as NSString).deletingPathExtension
        let ext = (name as NSString).pathExtension
        var url = dir.appendingPathComponent(name)
        var index = 2
        while FileManager.default.fileExists(atPath: url.path) {
            url = dir.appendingPathComponent("\(base) (\(index)).\(ext)")
            index += 1
        }
        return url
    }

    /// The capture's orientation when its metadata lacks one (the pixels are as the sensor saw them).
    private static func withOrientation(_ metadata: [String: Any], of image: UIImage) -> [String: Any] {
        guard metadata[kCGImagePropertyOrientation as String] == nil else {
            return metadata
        }
        var result = metadata
        let orientations: [UIImage.Orientation: CGImagePropertyOrientation] = [
            .up: .up, .down: .down, .left: .left, .right: .right,
            .upMirrored: .upMirrored, .downMirrored: .downMirrored, .leftMirrored: .leftMirrored, .rightMirrored: .rightMirrored,
        ]
        result[kCGImagePropertyOrientation as String] = (orientations[image.imageOrientation] ?? .up).rawValue
        return result
    }

    private enum CaptureError: Error {
        case unwritable
    }
}

extension OriginalCameraPlugin: UIImagePickerControllerDelegate, UINavigationControllerDelegate {
    public func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
        picker.dismiss(animated: true)
        locator.stop()
        finish()?.0.reject("capture canceled.", "CANCELLED")
    }

    public func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
        picker.dismiss(animated: true)
        guard let (call, name) = finish() else {
            return
        }
        guard let image = info[.originalImage] as? UIImage, let cgImage = image.cgImage else {
            locator.stop()
            call.reject("The camera returned no image.", "UNREADABLE")
            return
        }
        let metadata = Self.withOrientation(info[.mediaMetadata] as? [String: Any] ?? [:], of: image)
        locator.waitForFix(timeout: Self.locationWait) { location in
            DispatchQueue.global(qos: .userInitiated).async {
                do {
                    let url = try Self.write(cgImage, metadata: metadata, location: location, name: name)
                    let size = (try? FileManager.default.attributesOfItem(atPath: url.path)[.size] as? NSNumber)?.intValue ?? 0
                    call.resolve([
                        "path": url.absoluteString,
                        "name": url.lastPathComponent,
                        "mimeType": "image/jpeg",
                        "size": size,
                        "modifiedAt": Int(Date().timeIntervalSince1970 * 1000),
                    ])
                } catch {
                    call.reject("Couldn't save the photo.", "UNREADABLE")
                }
            }
        }
    }
}

/// FR-011-03: the phone's location around the time of capture (When In Use).
private final class Locator: NSObject, CLLocationManagerDelegate {
    private var manager: CLLocationManager?
    private var latest: CLLocation?
    private var waiting: ((CLLocation?) -> Void)?

    /// Starts as the camera opens, so a fix is usually ready by the time the photo is taken.
    func start() {
        let manager = self.manager ?? CLLocationManager()
        self.manager = manager
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBest
        switch manager.authorizationStatus {
        case .notDetermined:
            manager.requestWhenInUseAuthorization()
        case .authorizedWhenInUse, .authorizedAlways:
            manager.startUpdatingLocation()
        default:
            break
        }
    }

    func stop() {
        manager?.stopUpdatingLocation()
        waiting = nil
    }

    /// Calls back on the main queue with a fix from the last minute, or `nil` after `timeout`.
    func waitForFix(timeout: TimeInterval, _ completion: @escaping (CLLocation?) -> Void) {
        if let latest, -latest.timestamp.timeIntervalSinceNow < 60 {
            stop()
            completion(latest)
            return
        }
        guard let status = manager?.authorizationStatus, status == .authorizedWhenInUse || status == .authorizedAlways || status == .notDetermined else {
            stop()
            completion(nil)
            return
        }
        waiting = completion
        DispatchQueue.main.asyncAfter(deadline: .now() + timeout) { [weak self] in
            self?.deliver(nil)
        }
    }

    private func deliver(_ location: CLLocation?) {
        guard let completion = waiting else {
            return
        }
        stop()
        completion(location)
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        latest = locations.last
        if let latest {
            deliver(latest)
        }
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        switch manager.authorizationStatus {
        case .authorizedWhenInUse, .authorizedAlways:
            manager.startUpdatingLocation()
        case .denied, .restricted:
            deliver(nil)
        default:
            break
        }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        // Keep waiting for the timeout; a later update may still arrive.
    }
}
