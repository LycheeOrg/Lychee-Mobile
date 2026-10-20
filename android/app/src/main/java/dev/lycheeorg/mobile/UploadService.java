/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

package dev.lycheeorg.mobile;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import androidx.core.app.NotificationCompat;

/**
 * NC-012-01 (Feature 012, ADR-012-01): a foreground service that keeps the app, and with it the
 * WebView's upload queue, running while the user is in other apps. Its notification shows the
 * run's progress; the uploads themselves stay in JavaScript.
 */
public class UploadService extends Service {

    static final String EXTRA_TEXT = "text";
    static final String EXTRA_PROGRESS = "progress";
    private static final String CHANNEL_ID = "uploads";
    private static final int NOTIFICATION_ID = 7001;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Notification notification = notification(this, intent);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
        return START_NOT_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    /** Refreshes the notification of the running service. */
    static void update(Context context, Intent intent) {
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.notify(NOTIFICATION_ID, notification(context, intent));
        }
    }

    private static Notification notification(Context context, Intent intent) {
        ensureChannel(context);
        String text = intent == null ? null : intent.getStringExtra(EXTRA_TEXT);
        int percent = intent == null ? -1 : Math.round(intent.getFloatExtra(EXTRA_PROGRESS, -1f) * 100);
        Intent open = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        PendingIntent tap = open == null ? null : PendingIntent.getActivity(context, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        return new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_sys_upload)
            .setContentTitle("Lychee")
            .setContentText(text == null ? "Uploading" : text)
            .setProgress(100, Math.max(percent, 0), percent < 0)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setContentIntent(tap)
            .build();
    }

    private static void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager != null && manager.getNotificationChannel(CHANNEL_ID) == null) {
            manager.createNotificationChannel(new NotificationChannel(CHANNEL_ID, "Uploads", NotificationManager.IMPORTANCE_LOW));
        }
    }
}
