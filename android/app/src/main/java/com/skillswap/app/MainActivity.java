package com.skillswap.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Create high importance notification channels natively at startup
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // Default channel
            NotificationChannel defaultChannel = new NotificationChannel(
                "default_v2",
                "Default Channel",
                NotificationManager.IMPORTANCE_HIGH
            );
            defaultChannel.setDescription("General notifications with sound");
            defaultChannel.enableLights(true);
            defaultChannel.enableVibration(true);
            defaultChannel.setShowBadge(true);
            
            // Calls channel
            NotificationChannel callsChannel = new NotificationChannel(
                "calls_v2",
                "Call Channel",
                NotificationManager.IMPORTANCE_HIGH
            );
            callsChannel.setDescription("Urgent incoming call notifications");
            callsChannel.enableLights(true);
            callsChannel.enableVibration(true);
            callsChannel.setShowBadge(true);
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(defaultChannel);
                manager.createNotificationChannel(callsChannel);
            }
        }
    }
}
