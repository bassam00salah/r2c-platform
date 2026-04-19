package com.r2c.user;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    createNotificationChannels();
  }

  private void createNotificationChannels() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

    NotificationManager manager = getSystemService(NotificationManager.class);
    if (manager == null) return;

    // Channel رئيسي لتحديثات الطلبات — IMPORTANCE_HIGH = صوت + banner
    NotificationChannel orderChannel = new NotificationChannel(
      "order_updates",
      "تحديثات الطلبات",
      NotificationManager.IMPORTANCE_HIGH
    );
    orderChannel.setDescription("إشعارات حالة الطلب");
    orderChannel.enableVibration(true);
    orderChannel.enableLights(true);
    orderChannel.setLightColor(0xFFee7b26);

    AudioAttributes audioAttr = new AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_NOTIFICATION)
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
      .build();
    orderChannel.setSound(
      Uri.parse("android.resource://" + getPackageName() + "/raw/notification"),
      audioAttr
    );

    manager.createNotificationChannel(orderChannel);
  }
}
