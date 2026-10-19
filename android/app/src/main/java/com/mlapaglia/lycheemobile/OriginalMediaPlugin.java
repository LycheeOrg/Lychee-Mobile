/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

package com.mlapaglia.lycheemobile;

import android.app.Activity;
import android.content.ClipData;
import android.content.Intent;
import android.database.Cursor;
import android.media.ExifInterface;
import android.media.MediaMetadataRetriever;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;
import android.provider.OpenableColumns;
import android.webkit.MimeTypeMap;
import androidx.activity.result.ActivityResult;
import androidx.activity.result.contract.ActivityResultContracts;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * NC-005-03 (Feature 005, ADR-005-01): copies a picked photo or video into the app cache for
 * upload, unredacted when possible, and reports whether the copy carries a location. MediaStore
 * only serves the original through {@link MediaStore#setRequireOriginal(Uri)} when the user
 * turned on "Include location" in the photo picker; otherwise it throws, and the file is copied
 * as served (without location) rather than failing (Q-005-06).
 */
@CapacitorPlugin(name = "OriginalMedia")
public class OriginalMediaPlugin extends Plugin {

    private static final String UNREADABLE = "UNREADABLE";
    private static final String CANCELLED = "CANCELLED";
    private static final String UNAVAILABLE = "UNAVAILABLE";
    /** Public since API 35 ({@code MediaStore.EXTRA_ACCEPT_ORIGINAL_MEDIA_FORMAT}): no transcoding. */
    private static final String EXTRA_ACCEPT_ORIGINAL_MEDIA_FORMAT = "android.provider.extra.ACCEPT_ORIGINAL_MEDIA_FORMAT";
    /**
     * Not in the public SDK: read from the system photo picker's code (Q-005-05). With it, and
     * ACCESS_MEDIA_LOCATION, the picker offers "Include location".
     */
    private static final String EXTRA_REQUEST_LOCATION_METADATA_ACCESS = "android.provider.extra.REQUEST_LOCATION_METADATA_ACCESS";
    private static final String DATE_TAKEN = "datetaken";
    private static final int DEFAULT_PICK_LIMIT = 100;
    private static final Pattern ISO_6709_NUMBER = Pattern.compile("[+-]\\d+(?:\\.\\d+)?");
    private static final int BUFFER_SIZE = 64 * 1024;

    @Override
    public void load() {
        // Copies left over from an upload interrupted by the app being killed.
        File[] leftovers = uploadsDir().listFiles();
        if (leftovers != null) {
            for (File leftover : leftovers) {
                leftover.delete();
            }
        }
    }

    /** Q-005-05: the system photo picker, asked to offer "Include location" and keep original formats. */
    @PluginMethod
    public void pick(PluginCall call) {
        if (!ActivityResultContracts.PickVisualMedia.isPhotoPickerAvailable(getContext())) {
            call.reject("No system photo picker.", UNAVAILABLE);
            return;
        }
        Intent intent = new Intent(MediaStore.ACTION_PICK_IMAGES);
        int limit = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU ? MediaStore.getPickImagesMaxLimit() : DEFAULT_PICK_LIMIT;
        intent.putExtra(MediaStore.EXTRA_PICK_IMAGES_MAX, limit);
        intent.putExtra(EXTRA_ACCEPT_ORIGINAL_MEDIA_FORMAT, true);
        intent.putExtra(EXTRA_REQUEST_LOCATION_METADATA_ACCESS, true);
        startActivityForResult(call, intent, "pickResult");
    }

    @ActivityCallback
    private void pickResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            return;
        }
        Intent data = result.getData();
        if (result.getResultCode() != Activity.RESULT_OK || data == null) {
            call.reject("pick canceled.", CANCELLED);
            return;
        }
        JSArray files = new JSArray();
        for (Uri uri : urisOf(data)) {
            files.put(describe(uri));
        }
        JSObject picked = new JSObject();
        picked.put("files", files);
        call.resolve(picked);
    }

    @PluginMethod
    public void prepare(PluginCall call) {
        String uri = call.getString("uri");
        if (uri == null) {
            call.reject("uri is missing.", UNREADABLE);
            return;
        }
        Uri source = Uri.parse(uri);
        Uri original = MediaStore.AUTHORITY.equals(source.getAuthority()) ? MediaStore.setRequireOriginal(source) : source;
        File dir = uploadsDir();
        if (!dir.isDirectory() && !dir.mkdirs()) {
            call.reject("Can't create the upload cache.", UNREADABLE);
            return;
        }
        File target = new File(dir, UUID.randomUUID() + extensionOf(source));
        boolean refused = false;
        try {
            try {
                copy(original, target);
            } catch (UnsupportedOperationException | SecurityException e) {
                // "Include location" was off: upload what MediaStore serves, and say so (Q-005-06).
                refused = true;
                copy(source, target);
            }
        } catch (Exception e) {
            target.delete();
            call.reject(String.valueOf(e.getMessage()), UNREADABLE);
            return;
        }
        JSObject result = new JSObject();
        result.put("path", Uri.fromFile(target).toString());
        result.put("location", refused ? "missing" : locationOf(target, getContext().getContentResolver().getType(source)));
        call.resolve(result);
    }

    @PluginMethod
    public void release(PluginCall call) {
        String path = call.getString("path");
        String filePath = path == null ? null : Uri.parse(path).getPath();
        if (filePath != null) {
            File file = new File(filePath);
            // Only ever delete copies this plugin made.
            if (uploadsDir().equals(file.getParentFile())) {
                file.delete();
            }
        }
        call.resolve();
    }

    private void copy(Uri from, File to) throws IOException {
        try (InputStream in = getContext().getContentResolver().openInputStream(from); OutputStream out = new FileOutputStream(to)) {
            if (in == null) {
                throw new IOException("No data for " + from);
            }
            byte[] buffer = new byte[BUFFER_SIZE];
            int read;
            while ((read = in.read(buffer)) != -1) {
                out.write(buffer, 0, read);
            }
        }
    }

    /**
     * NFR-005-04: "present", "missing" (no location, or 0,0 as Android's redaction leaves it) or
     * "unknown" when the metadata can't be read.
     */
    private String locationOf(File file, String mimeType) {
        String type = mimeType == null ? "" : mimeType;
        try {
            if (type.startsWith("video/")) {
                return videoLocationOf(file);
            }
            boolean heif = type.equals("image/heic") || type.equals("image/heif");
            if (heif && Build.VERSION.SDK_INT < Build.VERSION_CODES.P) {
                return "unknown";
            }
            float[] latLong = new float[2];
            if (!new ExifInterface(file.getAbsolutePath()).getLatLong(latLong)) {
                return "missing";
            }
            return latLong[0] == 0f && latLong[1] == 0f ? "missing" : "present";
        } catch (Exception e) {
            return "unknown";
        }
    }

    /** ISO 6709 location of a video, e.g. "+37.4220-122.0841/". */
    private String videoLocationOf(File file) throws IOException {
        MediaMetadataRetriever retriever = new MediaMetadataRetriever();
        try {
            retriever.setDataSource(file.getAbsolutePath());
            String location = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_LOCATION);
            if (location == null) {
                return "missing";
            }
            Matcher numbers = ISO_6709_NUMBER.matcher(location);
            double sum = 0;
            int count = 0;
            while (numbers.find() && count < 2) {
                sum += Math.abs(Double.parseDouble(numbers.group()));
                count++;
            }
            if (count < 2) {
                return "unknown";
            }
            return sum == 0 ? "missing" : "present";
        } finally {
            retriever.release();
        }
    }

    private List<Uri> urisOf(Intent data) {
        List<Uri> uris = new ArrayList<>();
        ClipData clip = data.getClipData();
        if (clip != null) {
            for (int i = 0; i < clip.getItemCount(); i++) {
                uris.add(clip.getItemAt(i).getUri());
            }
        } else if (data.getData() != null) {
            uris.add(data.getData());
        }
        return uris;
    }

    /** Name, type, size and date taken, as the file picker plugin reports them (DO-005-01). */
    private JSObject describe(Uri uri) {
        JSObject file = new JSObject();
        file.put("path", uri.toString());
        String type = getContext().getContentResolver().getType(uri);
        file.put("mimeType", type == null ? "application/octet-stream" : type);
        file.put("name", "");
        file.put("size", 0);
        try (Cursor cursor = getContext().getContentResolver().query(uri, null, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int name = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                int size = cursor.getColumnIndex(OpenableColumns.SIZE);
                int taken = cursor.getColumnIndex(DATE_TAKEN);
                if (name >= 0 && !cursor.isNull(name)) {
                    file.put("name", cursor.getString(name));
                }
                if (size >= 0 && !cursor.isNull(size)) {
                    file.put("size", cursor.getLong(size));
                }
                if (taken >= 0 && !cursor.isNull(taken)) {
                    file.put("modifiedAt", cursor.getLong(taken));
                }
            }
        } catch (Exception e) {
            // Leave the defaults; the upload reports what it can't read.
        }
        return file;
    }

    private File uploadsDir() {
        return new File(getContext().getCacheDir(), "uploads");
    }

    private String extensionOf(Uri uri) {
        String type = getContext().getContentResolver().getType(uri);
        String extension = type == null ? null : MimeTypeMap.getSingleton().getExtensionFromMimeType(type);
        return extension == null ? "" : "." + extension;
    }
}
