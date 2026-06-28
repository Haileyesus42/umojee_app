package com.haile42.umojaairwaysfrontend.volumesos

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class VolumeSOSModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "VolumeSOS"

    @ReactMethod
    fun startService(promise: Promise) {
        try {
            val context = reactApplicationContext
            val serviceIntent = Intent(context, VolumeSOSForegroundService::class.java)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }

            val prefs = context.getSharedPreferences("VolumeSOSPrefs", Context.MODE_PRIVATE)
            prefs.edit().putBoolean("volume_sos_enabled", true).apply()

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("START_FAILED", e.message)
        }
    }

    @ReactMethod
    fun stopService(promise: Promise) {
        try {
            val context = reactApplicationContext
            val serviceIntent = Intent(context, VolumeSOSForegroundService::class.java)
            context.stopService(serviceIntent)

            val prefs = context.getSharedPreferences("VolumeSOSPrefs", Context.MODE_PRIVATE)
            prefs.edit().putBoolean("volume_sos_enabled", false).apply()

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STOP_FAILED", e.message)
        }
    }

    @ReactMethod
    fun isServiceRunning(promise: Promise) {
        promise.resolve(VolumeSOSAccessibilityService.isServiceRunning())
    }

    @ReactMethod
    fun isAccessibilityServiceEnabled(promise: Promise) {
        val context = reactApplicationContext
        val prefString = Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        )

        var enabled = false
        if (prefString != null) {
            val services = prefString.split(":")
            val myService = "${context.packageName}/${VolumeSOSAccessibilityService::class.java.canonicalName}"
            enabled = services.any { it.equals(myService, ignoreCase = true) }
        }
        promise.resolve(enabled)
    }

    @ReactMethod
    fun openAccessibilitySettings(promise: Promise) {
        try {
            val context = reactApplicationContext
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("OPEN_FAILED", e.message)
        }
    }

    @ReactMethod
    fun isBatteryOptimizationIgnored(promise: Promise) {
        val context = reactApplicationContext
        val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            promise.resolve(pm.isIgnoringBatteryOptimizations(context.packageName))
        } else {
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun requestIgnoreBatteryOptimization(promise: Promise) {
        try {
            val context = reactApplicationContext
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = Uri.parse("package:${context.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("REQUEST_FAILED", e.message)
        }
    }

    @ReactMethod
    fun updateAuthConfig(authToken: String, apiBaseUrl: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            VolumeSOSForegroundService.updateAuthToken(context, authToken, apiBaseUrl)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("UPDATE_FAILED", e.message)
        }
    }
}