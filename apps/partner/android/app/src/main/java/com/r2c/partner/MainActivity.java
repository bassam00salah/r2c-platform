package com.r2c.partner;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onBackPressed() {
        if (this.bridge != null) {
            this.bridge.triggerWindowJSEvent("backButton");
        }
    }
}
