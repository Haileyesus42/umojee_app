package expo.modules.volumesosservice

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class VolumeSOSServiceModule : Module() {
    private var sosReceiver: BroadcastReceiver? = null
    private var volumeReceiver: BroadcastReceiver? = null
    private var pressCount = 0
    private var firstPressTime = 0L
    private var sosTriggeredAt = 0L
    private val PRESS_WINDOW_MS = 20000L   // 20 seconds to press 5 times
    private val REQUIRED_PRESSES = 5
    private val COOLDOWN_MS = 30000L       // 30 second lockout after SOS fires

    override fun definition() = ModuleDefinition {
        Name("VolumeSOSService")

        Function("startService") { ->
            val context = appContext.reactContext ?: return@Function Unit
            if (volumeReceiver != null) return@Function Unit // already running

            volumeReceiver = object : BroadcastReceiver() {
                override fun onReceive(ctx: Context, intent: Intent) {
                    if (intent.action == "com.umoja.VOLUME_PRESSED") {
                        handleVolumePress(ctx)
                    }
                }
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                context.registerReceiver(
                    volumeReceiver,
                    IntentFilter("com.umoja.VOLUME_PRESSED"),
                    Context.RECEIVER_NOT_EXPORTED
                )
            } else {
                context.registerReceiver(
                    volumeReceiver,
                    IntentFilter("com.umoja.VOLUME_PRESSED")
                )
            }
            android.util.Log.d("VolumeSOSService", "Started")
            Unit
        }

        Function("stopService") { ->
            val context = appContext.reactContext ?: return@Function Unit
            volumeReceiver?.let {
                try { context.unregisterReceiver(it) } catch (e: Exception) {}
            }
            volumeReceiver = null
            reset()
            Unit
        }

        Function("resetCooldown") { ->
            // Called from JS after SOS is handled
            reset()
            android.util.Log.d("VolumeSOSService", "Cooldown reset")
            Unit
        }

        Function("registerSOSListener") { ->
            val context = appContext.reactContext ?: return@Function Unit
            if (sosReceiver != null) return@Function Unit // already registered

            sosReceiver = object : BroadcastReceiver() {
                override fun onReceive(ctx: Context, intent: Intent) {
                    if (intent.action == "com.umoja.SOS_TRIGGERED") {
                        sendEvent("onSOSTriggered", mapOf("triggered" to true))
                    }
                }
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                context.registerReceiver(
                    sosReceiver,
                    IntentFilter("com.umoja.SOS_TRIGGERED"),
                    Context.RECEIVER_NOT_EXPORTED
                )
            } else {
                context.registerReceiver(
                    sosReceiver,
                    IntentFilter("com.umoja.SOS_TRIGGERED")
                )
            }
            Unit
        }

        Function("unregisterSOSListener") { ->
            val context = appContext.reactContext ?: return@Function Unit
            sosReceiver?.let {
                try { context.unregisterReceiver(it) } catch (e: Exception) {}
            }
            sosReceiver = null
            Unit
        }

        Events("onSOSTriggered")
    }

    private fun handleVolumePress(context: Context) {
        val now = System.currentTimeMillis()

        // In cooldown — ignore all presses
        if (sosTriggeredAt > 0 && now - sosTriggeredAt < COOLDOWN_MS) {
            val remaining = (COOLDOWN_MS - (now - sosTriggeredAt)) / 1000
            android.util.Log.d("VolumeSOSService", "In cooldown, $remaining seconds remaining")
            return
        }

        // Reset if outside press window
        if (pressCount == 0 || now - firstPressTime > PRESS_WINDOW_MS) {
            pressCount = 1
            firstPressTime = now
        } else {
            pressCount++
        }

        android.util.Log.d("VolumeSOSService", "Press $pressCount/$REQUIRED_PRESSES")

        // Fire once when threshold reached, ignore extra presses
        if (pressCount == REQUIRED_PRESSES) {
            sosTriggeredAt = now
            pressCount = 0
            firstPressTime = 0L
            android.util.Log.d("VolumeSOSService", "🚨 SOS TRIGGERED")
            context.sendBroadcast(Intent("com.umoja.SOS_TRIGGERED"))
        }
    }

    private fun reset() {
        pressCount = 0
        firstPressTime = 0L
        sosTriggeredAt = 0L
    }
}
