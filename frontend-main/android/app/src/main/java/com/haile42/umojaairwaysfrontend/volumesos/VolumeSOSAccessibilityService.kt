package com.haile42.umojaairwaysfrontend.volumesos

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.view.KeyEvent
import android.view.accessibility.AccessibilityEvent
import android.widget.Toast

class VolumeSOSAccessibilityService : AccessibilityService() {

    companion object {
        private var instance: VolumeSOSAccessibilityService? = null
        const val SOS_TRIGGERED_ACTION = "com.haile42.umojaairwaysfrontend.SOS_TRIGGERED"
        private const val SOS_THRESHOLD_MS = 15000L // 15 seconds

        fun isServiceRunning(): Boolean = instance != null
    }

    private var volumeDownPressTime: Long = -1
    private val countdownHandler = Handler(Looper.getMainLooper())
    private var countdownRunnable: Runnable? = null
    private var sosTriggered = false
    private var lastToastSecond = -1

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this

        val info = AccessibilityServiceInfo().apply {
            eventTypes = AccessibilityEvent.TYPES_ALL_MASK
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            flags = AccessibilityServiceInfo.FLAG_REQUEST_FILTER_KEY_EVENTS
            notificationTimeout = 0
        }
        serviceInfo = info
    }

    override fun onKeyEvent(event: KeyEvent): Boolean {
        if (event.keyCode != KeyEvent.KEYCODE_VOLUME_DOWN) {
            return false
        }

        when (event.action) {
            KeyEvent.ACTION_DOWN -> {
                if (event.repeatCount == 0) {
                    startTracking()
                }
                return false
            }
            KeyEvent.ACTION_UP -> {
                stopTracking()
                return false
            }
        }
        return false
    }

    private fun startTracking() {
        volumeDownPressTime = System.currentTimeMillis()
        sosTriggered = false
        lastToastSecond = -1
        startCountdownToasts()
    }

    private fun stopTracking() {
        if (volumeDownPressTime > 0) {
            val duration = System.currentTimeMillis() - volumeDownPressTime
            if (duration < SOS_THRESHOLD_MS) {
                cancelCountdown()
                Toast.makeText(this, "SOS cancelled", Toast.LENGTH_SHORT).show()
            }
        }
        volumeDownPressTime = -1
    }

    private fun startCountdownToasts() {
        countdownRunnable = object : Runnable {
            override fun run() {
                if (volumeDownPressTime <= 0) return

                val elapsed = System.currentTimeMillis() - volumeDownPressTime
                val remaining = SOS_THRESHOLD_MS - elapsed

                if (remaining <= 0 && !sosTriggered) {
                    sosTriggered = true
                    triggerSOS()
                    return
                }

                val secondsRemaining = (remaining / 1000).toInt()
                if (secondsRemaining != lastToastSecond && secondsRemaining in 0..5) {
                    lastToastSecond = secondsRemaining
                    if (secondsRemaining > 0) {
                        Toast.makeText(
                            this@VolumeSOSAccessibilityService,
                            "SOS in ${secondsRemaining}s...",
                            Toast.LENGTH_SHORT
                        ).show()
                    }
                }

                countdownHandler.postDelayed(this, 100)
            }
        }
        countdownHandler.postDelayed(countdownRunnable!!, 100)
    }

    private fun cancelCountdown() {
        countdownRunnable?.let { countdownHandler.removeCallbacks(it) }
    }

    private fun triggerSOS() {
        val intent = Intent(SOS_TRIGGERED_ACTION)
        sendBroadcast(intent)
        Toast.makeText(this, "🚨 SOS ACTIVATED", Toast.LENGTH_LONG).show()
        volumeDownPressTime = -1
        cancelCountdown()
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {}

    override fun onInterrupt() {}

    override fun onDestroy() {
        super.onDestroy()
        cancelCountdown()
        instance = null
    }
}