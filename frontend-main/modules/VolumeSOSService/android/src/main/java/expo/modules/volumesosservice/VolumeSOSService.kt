package expo.modules.volumesosservice

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat

class VolumeSOSService : Service() {
    private val CHANNEL_ID = "sos_service_channel"
    private val NOTIFICATION_ID = 1001
    private var pressCount = 0
    private var firstPressTime = 0L
    private val PRESS_WINDOW_MS = 20000L
    private val REQUIRED_PRESSES = 5
    private val handler = Handler(Looper.getMainLooper())

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, buildNotification())
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        intent?.action?.let { action ->
            when (action) {
                "VOLUME_PRESS" -> handleVolumePress()
                "STOP_SERVICE" -> stopSelf()
            }
        }
        return START_STICKY
    }

    private fun handleVolumePress() {
        val now = System.currentTimeMillis()
        if (pressCount == 0 || now - firstPressTime > PRESS_WINDOW_MS) {
            pressCount = 1
            firstPressTime = now
        } else {
            pressCount++
        }
        if (pressCount >= REQUIRED_PRESSES) {
            pressCount = 0
            triggerSOS()
        }
    }

    private fun triggerSOS() {
        val intent = Intent("com.umoja.SOS_TRIGGERED")
        sendBroadcast(intent)
    }

    private fun buildNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Umojee Protection")
            .setContentText("Your safety monitor is active")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setOngoing(true)
            .setShowWhen(false)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "SOS Emergency Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Monitors volume button for emergency SOS"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
