package com.haile42.umojaairwaysfrontend.volumesos

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import okhttp3.Call
import okhttp3.Callback
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import java.io.IOException
import java.util.concurrent.TimeUnit

class VolumeSOSForegroundService : Service() {

    companion object {
        private const val TAG = "VolumeSOS"
        private const val CHANNEL_ID = "volume_sos_channel"
        private const val NOTIFICATION_ID = 1001
        private const val PREFS_NAME = "VolumeSOSPrefs"
        private const val KEY_AUTH_TOKEN = "auth_token"
        private const val KEY_API_BASE_URL = "api_base_url"

        fun updateAuthToken(context: Context, token: String, apiBaseUrl: String) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit()
                .putString(KEY_AUTH_TOKEN, token)
                .putString(KEY_API_BASE_URL, apiBaseUrl)
                .apply()
        }
    }

    private var sosReceiver: BroadcastReceiver? = null
    private var isSOSTriggering = false

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        registerSOSReceiver()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val notification = buildNotification()
        startForeground(NOTIFICATION_ID, notification)
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Whisper SOS Protection",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps Whisper SOS active in background"
                setShowBadge(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("🛡️ Whisper is protecting you")
            .setContentText("Volume SOS active · Hold volume down for 15s")
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun registerSOSReceiver() {
        sosReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                if (intent.action == VolumeSOSAccessibilityService.SOS_TRIGGERED_ACTION) {
                    if (!isSOSTriggering) {
                        triggerSOSViaBackend()
                    }
                }
            }
        }

        val filter = IntentFilter(VolumeSOSAccessibilityService.SOS_TRIGGERED_ACTION)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(sosReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(sosReceiver, filter)
        }
    }

    private fun triggerSOSViaBackend() {
        isSOSTriggering = true

        val prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
        val authToken = prefs.getString(KEY_AUTH_TOKEN, "") ?: ""
        val apiBaseUrl = prefs.getString(KEY_API_BASE_URL, "http://192.168.8.86:3001") ?: ""

        if (authToken.isEmpty()) {
            Log.e(TAG, "No auth token available for SOS trigger")
            isSOSTriggering = false
            return
        }

        val url = "$apiBaseUrl/api/emergency/webhook"
        val jsonBody = """{"type":"volume_sos","source":"volume_button_hold"}"""

        val client = OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(10, TimeUnit.SECONDS)
            .build()

        val body = jsonBody.toRequestBody("application/json".toMediaType())
        val request = Request.Builder()
            .url(url)
            .addHeader("Authorization", "Bearer $authToken")
            .addHeader("Content-Type", "application/json")
            .post(body)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Log.e(TAG, "SOS trigger failed: ${e.message}")
                isSOSTriggering = false
            }

            override fun onResponse(call: Call, response: Response) {
                Log.i(TAG, "SOS triggered successfully: ${response.code}")
                response.close()
                isSOSTriggering = false
            }
        })
    }

    override fun onDestroy() {
        super.onDestroy()
        sosReceiver?.let { unregisterReceiver(it) }
    }
}