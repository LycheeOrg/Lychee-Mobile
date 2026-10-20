package com.mlapaglia.lycheemobile;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // App-local plugins (NC-005-03) must be registered before the bridge starts.
        registerPlugin(OriginalMediaPlugin.class);
        registerPlugin(UploadKeepAlivePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
