/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Lychee-Mobile contributors.
 */

package com.mlapaglia.lycheemobile;

import android.Manifest;
import android.app.Activity;
import android.content.ClipData;
import android.content.ContentUris;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.database.Cursor;
import android.media.ExifInterface;
import android.media.MediaMetadataRetriever;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.BaseColumns;
import android.provider.MediaStore;
import android.provider.OpenableColumns;
import android.webkit.MimeTypeMap;
import androidx.activity.result.ActivityResult;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.io.File;
import java.io.FileInputStream;
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
 *
 * <p>NC-007-04 (Feature 007, ADR-007-01): saves downloaded files into {@code Pictures/Lychee} or
 * {@code Movies/Lychee}, where they outlive the app (Q-007-07).
 *
 * <p>NC-011-01 (Feature 011, ADR-011-01): opens the phone's camera app, which writes the photo
 * straight into the app's capture folder; the file stays until Lychee has it.
 *
 * <p>NC-009-02 (Feature 009, ADR-009-01): with photo and video read access, picked files carry the
 * camera's file name from MediaStore instead of the picker's {@code <id>.<ext>}.
 */
@CapacitorPlugin(
    name = "OriginalMedia",
    permissions = {
        @Permission(alias = OriginalMediaPlugin.STORAGE, strings = { Manifest.permission.WRITE_EXTERNAL_STORAGE }),
        @Permission(alias = OriginalMediaPlugin.MEDIA, strings = { Manifest.permission.READ_MEDIA_IMAGES, Manifest.permission.READ_MEDIA_VIDEO }),
        @Permission(alias = OriginalMediaPlugin.LEGACY_MEDIA, strings = { Manifest.permission.READ_EXTERNAL_STORAGE }),
    }
)
public class OriginalMediaPlugin extends Plugin {

    /** Android 7–9 only; the manifest declares it with {@code maxSdkVersion="28"} (FR-007-05). */
    static final String STORAGE = "storage";
    /** NC-009-02 (ADR-009-01): reading the camera's file names; Android 13+ and older use different permissions. */
    static final String MEDIA = "media";
    static final String LEGACY_MEDIA = "legacyMedia";

    private static final String UNREADABLE = "UNREADABLE";
    private static final String CANCELLED = "CANCELLED";
    private static final String UNAVAILABLE = "UNAVAILABLE";
    private static final String PERMISSION_DENIED = "PERMISSION_DENIED";
    private static final String UNSAVEABLE = "UNSAVEABLE";
    private static final String GALLERY_FOLDER = "Lychee";
    private static final String NO_CAMERA = "NO_CAMERA";
    /** NC-011-01: file names JavaScript may ask for in the capture folder. */
    private static final Pattern CAPTURE_NAME = Pattern.compile("[A-Za-z0-9_.-]{1,100}");
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

    /** NC-011-01: whether a camera app can take a photo for the app. */
    @PluginMethod
    public void hasCamera(PluginCall call) {
        JSObject result = new JSObject();
        result.put("available", cameraIntent().resolveActivity(getContext().getPackageManager()) != null);
        call.resolve(result);
    }

    /**
     * NC-011-01: the camera app writes the photo to {@code files/captures/<name>} (made unique). The
     * target path travels in the call's data, so a result after Android recreated the activity still
     * finds its file.
     */
    @PluginMethod
    public void capture(PluginCall call) {
        String name = call.getString("name");
        if (name == null || !CAPTURE_NAME.matcher(name).matches()) {
            call.reject("A plain file name is required.", UNREADABLE);
            return;
        }
        File dir = capturesDir();
        if (!dir.isDirectory() && !dir.mkdirs()) {
            call.reject("Can't create the capture folder.", UNREADABLE);
            return;
        }
        File target = freeFileIn(dir, name);
        Uri output = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", target);
        Intent intent = cameraIntent();
        if (intent.resolveActivity(getContext().getPackageManager()) == null) {
            call.reject("No camera app.", NO_CAMERA);
            return;
        }
        intent.putExtra(MediaStore.EXTRA_OUTPUT, output);
        intent.setClipData(ClipData.newRawUri("", output));
        intent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
        call.getData().put("target", target.getAbsolutePath());
        startActivityForResult(call, intent, "captureResult");
    }

    @ActivityCallback
    private void captureResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            return;
        }
        String path = call.getString("target");
        File target = path == null ? null : new File(path);
        if (target == null || !capturesDir().equals(target.getParentFile())) {
            call.reject("Lost the photo's file.", UNREADABLE);
            return;
        }
        if (result.getResultCode() != Activity.RESULT_OK || !target.isFile() || target.length() == 0) {
            target.delete();
            call.reject("capture canceled.", CANCELLED);
            return;
        }
        JSObject file = new JSObject();
        file.put("path", Uri.fromFile(target).toString());
        file.put("name", target.getName());
        file.put("mimeType", "image/jpeg");
        file.put("size", target.length());
        file.put("modifiedAt", target.lastModified());
        call.resolve(file);
    }

    /** FR-011-04: deletes a taken photo once Lychee has it; only files in the capture folder. */
    @PluginMethod
    public void deleteCapture(PluginCall call) {
        String path = call.getString("path");
        String filePath = path == null ? null : Uri.parse(path).getPath();
        if (filePath != null) {
            File file = new File(filePath);
            if (capturesDir().equals(file.getParentFile())) {
                file.delete();
            }
        }
        call.resolve();
    }

    private static Intent cameraIntent() {
        return new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
    }

    /** App-private and persistent, unlike the cache (FR-011-04). */
    private File capturesDir() {
        return new File(getContext().getFilesDir(), "captures");
    }

    /** NC-009-02: asks for photo and video read access; resolves {@code { granted }}, never rejects. */
    @PluginMethod
    public void requestNameAccess(PluginCall call) {
        String alias = mediaAlias();
        if (getPermissionState(alias) == PermissionState.GRANTED) {
            resolveNameAccess(call);
            return;
        }
        requestPermissionForAlias(alias, call, "nameAccessResult");
    }

    @PermissionCallback
    private void nameAccessResult(PluginCall call) {
        resolveNameAccess(call);
    }

    private void resolveNameAccess(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", getPermissionState(mediaAlias()) == PermissionState.GRANTED);
        call.resolve(result);
    }

    private static String mediaAlias() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU ? MEDIA : LEGACY_MEDIA;
    }

    /**
     * FR-009-05: the camera's file name of a picked item, from MediaStore by the picker's ID, or
     * {@code null} without access, with limited access that doesn't cover it, or for cloud-only items.
     */
    private String realNameOf(Uri uri) {
        try {
            long id = ContentUris.parseId(uri);
            if (id < 0) {
                return null;
            }
            String[] projection = { MediaStore.MediaColumns.DISPLAY_NAME };
            String[] args = { String.valueOf(id) };
            Uri files = MediaStore.Files.getContentUri("external");
            try (Cursor cursor = getContext().getContentResolver().query(files, projection, BaseColumns._ID + "=?", args, null)) {
                if (cursor != null && cursor.moveToFirst() && !cursor.isNull(0)) {
                    return cursor.getString(0);
                }
            }
        } catch (Exception e) {
            // No access, or not a MediaStore item: keep the picker's name.
        }
        return null;
    }

    /** NC-007-04: copies a downloaded file into the shared Pictures or Movies folder. */
    @PluginMethod
    public void saveToGallery(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q && getPermissionState(STORAGE) != PermissionState.GRANTED) {
            requestPermissionForAlias(STORAGE, call, "storagePermission");
            return;
        }
        save(call);
    }

    @PermissionCallback
    private void storagePermission(PluginCall call) {
        if (getPermissionState(STORAGE) != PermissionState.GRANTED) {
            call.reject("Storage permission denied.", PERMISSION_DENIED);
            return;
        }
        save(call);
    }

    private void save(PluginCall call) {
        String path = call.getString("path");
        String name = call.getString("name");
        String mimeType = call.getString("mimeType");
        String filePath = path == null ? null : Uri.parse(path).getPath();
        if (filePath == null || name == null || mimeType == null || !new File(filePath).isFile()) {
            call.reject("path, name or mimeType is missing.", UNSAVEABLE);
            return;
        }
        File source = new File(filePath);
        boolean video = mimeType.startsWith("video/");
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                saveToMediaStore(source, name, mimeType, video);
            } else {
                saveToPublicFolder(source, name, mimeType, video);
            }
            call.resolve();
        } catch (Exception e) {
            call.reject(String.valueOf(e.getMessage()), UNSAVEABLE);
        }
    }

    /** API 29+: no permission; pending until the bytes are written, so the gallery never shows half a file. */
    private void saveToMediaStore(File source, String name, String mimeType, boolean video) throws IOException {
        ContentResolver resolver = getContext().getContentResolver();
        Uri collection = video
            ? MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
            : MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
        ContentValues values = new ContentValues();
        values.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
        values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
        values.put(MediaStore.MediaColumns.RELATIVE_PATH, sharedFolderOf(video) + File.separator + GALLERY_FOLDER);
        values.put(MediaStore.MediaColumns.IS_PENDING, 1);
        Uri item = resolver.insert(collection, values);
        if (item == null) {
            throw new IOException("MediaStore refused " + name);
        }
        try {
            try (InputStream in = new FileInputStream(source); OutputStream out = resolver.openOutputStream(item)) {
                if (out == null) {
                    throw new IOException("No output for " + item);
                }
                copyStream(in, out);
            }
            ContentValues done = new ContentValues();
            done.put(MediaStore.MediaColumns.IS_PENDING, 0);
            resolver.update(item, done, null, null);
        } catch (IOException | RuntimeException e) {
            resolver.delete(item, null, null);
            throw e;
        }
    }

    /** API 24–28: a plain copy into the public folder, then a media scan so the gallery sees it. */
    @SuppressWarnings("deprecation")
    private void saveToPublicFolder(File source, String name, String mimeType, boolean video) throws IOException {
        File dir = new File(Environment.getExternalStoragePublicDirectory(sharedFolderOf(video)), GALLERY_FOLDER);
        if (!dir.isDirectory() && !dir.mkdirs()) {
            throw new IOException("Can't create " + dir);
        }
        File target = freeFileIn(dir, name);
        try (InputStream in = new FileInputStream(source); OutputStream out = new FileOutputStream(target)) {
            copyStream(in, out);
        } catch (IOException e) {
            target.delete();
            throw e;
        }
        MediaScannerConnection.scanFile(getContext(), new String[] { target.getAbsolutePath() }, new String[] { mimeType }, null);
    }

    private static String sharedFolderOf(boolean video) {
        return video ? Environment.DIRECTORY_MOVIES : Environment.DIRECTORY_PICTURES;
    }

    /** {@code name}, or {@code name (2).ext}, … when taken (MediaStore numbers names itself on API 29+). */
    private static File freeFileIn(File dir, String name) {
        File file = new File(dir, name);
        int dot = name.lastIndexOf('.');
        String base = dot > 0 ? name.substring(0, dot) : name;
        String extension = dot > 0 ? name.substring(dot) : "";
        for (int n = 2; file.exists(); n++) {
            file = new File(dir, base + " (" + n + ")" + extension);
        }
        return file;
    }

    private void copy(Uri from, File to) throws IOException {
        try (InputStream in = getContext().getContentResolver().openInputStream(from); OutputStream out = new FileOutputStream(to)) {
            if (in == null) {
                throw new IOException("No data for " + from);
            }
            copyStream(in, out);
        }
    }

    private static void copyStream(InputStream in, OutputStream out) throws IOException {
        byte[] buffer = new byte[BUFFER_SIZE];
        int read;
        while ((read = in.read(buffer)) != -1) {
            out.write(buffer, 0, read);
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
        String realName = realNameOf(uri);
        if (realName != null && !realName.isEmpty()) {
            file.put("name", realName);
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
