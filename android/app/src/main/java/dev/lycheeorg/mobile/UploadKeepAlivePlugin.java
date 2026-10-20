/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

package dev.lycheeorg.mobile;

import android.Manifest;
import android.content.Intent;
import android.os.Build;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * NC-012-01 (Feature 012, ADR-012-01): starts, updates and stops {@link UploadService} for an
 * upload run, and asks for the notification permission (Android 13+). Runs start in the
 * foreground, where Android 12+ allows starting a foreground service.
 */
@CapacitorPlugin(
    name = "UploadKeepAlive",
    permissions = { @Permission(alias = UploadKeepAlivePlugin.NOTIFICATIONS, strings = { Manifest.permission.POST_NOTIFICATIONS }) }
)
public class UploadKeepAlivePlugin extends Plugin {

    static final String NOTIFICATIONS = "notifications";
    private boolean running = false;

    @PluginMethod
    public void start(PluginCall call) {
        try {
            ContextCompat.startForegroundService(getContext(), intentFor(call));
            running = true;
            call.resolve();
        } catch (RuntimeException e) {
            // E.g. not allowed from the background; uploads go on while the app is open.
            call.reject(String.valueOf(e.getMessage()), "UNAVAILABLE");
        }
    }

    @PluginMethod
    public void update(PluginCall call) {
        if (running) {
            UploadService.update(getContext(), intentFor(call));
        }
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        running = false;
        getContext().stopService(new Intent(getContext(), UploadService.class));
        call.resolve();
    }

    /** FR-012-03: refusing only hides the notification; the service still runs. */
    @PluginMethod
    public void requestNotifications(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU || getPermissionState(NOTIFICATIONS) == PermissionState.GRANTED) {
            resolveGranted(call);
            return;
        }
        requestPermissionForAlias(NOTIFICATIONS, call, "notificationsResult");
    }

    @PermissionCallback
    private void notificationsResult(PluginCall call) {
        resolveGranted(call);
    }

    private void resolveGranted(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU || getPermissionState(NOTIFICATIONS) == PermissionState.GRANTED);
        call.resolve(result);
    }

    private Intent intentFor(PluginCall call) {
        Intent intent = new Intent(getContext(), UploadService.class);
        intent.putExtra(UploadService.EXTRA_TEXT, call.getString("text", "Uploading"));
        Double progress = call.getDouble("progress");
        intent.putExtra(UploadService.EXTRA_PROGRESS, progress == null ? -1f : progress.floatValue());
        return intent;
    }
}
