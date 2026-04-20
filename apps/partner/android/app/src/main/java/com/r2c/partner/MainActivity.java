package com.r2c.partner;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createNotificationChannels();
    }

    @Override
    public void onBackPressed() {
        if (this.bridge != null) {
            this.bridge.triggerWindowJSEvent("backButton");
        }
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager == null) return;

            // قناة الطلبات الجديدة — أولوية عالية + صوت + اهتزاز
            NotificationChannel newOrdersChannel = new NotificationChannel(
                "new_orders",
                "الطلبات الجديدة",
                NotificationManager.IMPORTANCE_HIGH
            );
            newOrdersChannel.setDescription("إشعارات الطلبات الجديدة الواردة للفرع");
            newOrdersChannel.enableVibration(true);
            newOrdersChannel.enableLights(true);
            manager.createNotificationChannel(newOrdersChannel);

            // قناة تحديثات الطلبات — أولوية متوسطة
            NotificationChannel orderUpdatesChannel = new NotificationChannel(
                "order_updates",
                "تحديثات الطلبات",
                NotificationManager.IMPORTANCE_DEFAULT
            );
            orderUpdatesChannel.setDescription("تحديثات حالة الطلبات");
            manager.createNotificationChannel(orderUpdatesChannel);
        }
    }
}
