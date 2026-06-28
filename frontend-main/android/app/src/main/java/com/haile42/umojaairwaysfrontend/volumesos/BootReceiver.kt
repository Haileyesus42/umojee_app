package com.haile42.umojaairwaysfrontend.volumesos

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED ||
            intent.action == "android.intent.action.QUICKBOOT_POWERON") {
            
            val prefs = context.getSharedPreferences("VolumeSOSPrefs", Context.MODE_PRIVATE)
            val isEnabled = prefs.getBoolean("volume_sos_enabled", false)

            if (isEnabled) {
                Log.i("BootReceiver", "Starting Volume SOS service after boot")
                val serviceIntent = Intent(context, VolumeSOSForegroundService::class.java)
                context.startForegroundService(serviceIntent)
            }
        }
    }
}