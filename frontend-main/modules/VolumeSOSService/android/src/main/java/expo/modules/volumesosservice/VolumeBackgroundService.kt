package expo.modules.volumesosservice

import android.app.*
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

class VolumeBackgroundService : Service() {
    private val CHANNEL_ID = "sos_background_channel"
    private val NOTIFICATION_ID = 2001
    private var pressCount = 0
    private var firstPressTime = 0L
    private var sosTriggeredAt = 0L
    private val PRESS_WINDOW_MS = 20000L
    private val REQUIRED_PRESSES = 5
    private val COOLDOWN_MS = 30000L
    private var volumeReceiver: BroadcastReceiver? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, buildNotification())
        registerVolumeReceiver()
    }

    private fun registerVolumeReceiver() {
        volumeReceiver = object : BroadcastReceiver() {
            override fun onReceive(ctx: Context, intent: Intent) {
                if (intent.action == "com.umoja.VOLUME_PRESSED") {
                    handleVolumePress()
                }
            }
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(
                volumeReceiver,
                IntentFilter("com.umoja.VOLUME_PRESSED"),
                RECEIVER_NOT_EXPORTED
            )
        } else {
            registerReceiver(volumeReceiver, IntentFilter("com.umoja.VOLUME_PRESSED"))
        }
    }

    private fun handleVolumePress() {
        val now = System.currentTimeMillis()
        if (sosTriggeredAt > 0 && now - sosTriggeredAt < COOLDOWN_MS) return
        if (pressCount == 0 || now - firstPressTime > PRESS_WINDOW_MS) {
            pressCount = 1
            firstPressTime = now
        } else {
            pressCount++
        }
        if (pressCount == REQUIRED_PRESSES) {
            sosTriggeredAt = now
            pressCount = 0
            firstPressTime = 0L
            triggerSOS()
        }
    }

    private fun triggerSOS() {
        val prefs = getSharedPreferences("umoja_sos", Context.MODE_PRIVATE)
        val token = prefs.getString("auth_token", null) ?: return
        val apiUrl = prefs.getString("api_url", "http://192.168.43.98:8000")

        Thread {
            try {
                val url = URL("$apiUrl/api/v1/emergency/webhook")
                val conn = url.openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                conn.setRequestProperty("Content-Type", "application/json")
                conn.setRequestProperty("Authorization", "Bearer $token")
                conn.doOutput = true
                conn.connectTimeout = 15000
                conn.readTimeout = 15000
                OutputStreamWriter(conn.outputStream).use { it.write("{\"type\":\"sos\"}") }
                android.util.Log.d("VolumeBackgroundService", "SOS webhook: ${conn.responseCode}")
                conn.disconnect()
            } catch (e: Exception) {
                android.util.Log.e("VolumeBackgroundService", "SOS webhook failed: $e")
            }
        }.start()
    }

    private fun buildNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Emergency Protection Active")
            .setContentText("Press volume 5 times to trigger SOS")
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID, "SOS Background Service",
                NotificationManager.IMPORTANCE_LOW
            )
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int = START_STICKY

    override fun onDestroy() {
        volumeReceiver?.let { try { unregisterReceiver(it) } catch (e: Exception) {} }
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
