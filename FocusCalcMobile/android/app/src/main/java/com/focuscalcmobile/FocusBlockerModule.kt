package com.focuscalcmobile

import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.provider.Settings
import com.facebook.react.bridge.*

class FocusBlockerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "FocusBlocker"

    @ReactMethod
    fun setFocusActive(active: Boolean) {
        BlockerState.isFocusActive = active
    }

    @ReactMethod
    fun setBlockedApps(packages: ReadableArray) {
        BlockerState.blockedPackages.clear()
        for (i in 0 until packages.size()) {
            BlockerState.blockedPackages.add(packages.getString(i))
        }
    }

    @ReactMethod
    fun isAccessibilityEnabled(promise: Promise) {
        val enabledServices = Settings.Secure.getString(
            reactApplicationContext.contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        ) ?: ""
        val enabled = enabledServices.contains("com.focuscalcmobile/com.focuscalcmobile.FocusAccessibilityService")
        promise.resolve(enabled)
    }

    @ReactMethod
    fun openAccessibilitySettings() {
        val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        reactApplicationContext.startActivity(intent)
    }

    @ReactMethod
    fun getInstalledApps(promise: Promise) {
        try {
            val pm = reactApplicationContext.packageManager
            val packages = pm.getInstalledApplications(PackageManager.GET_META_DATA)
            val result = Arguments.createArray()
            for (appInfo in packages) {
                // only include user installed apps and launchable apps
                val isUserApp = (appInfo.flags and ApplicationInfo.FLAG_SYSTEM) == 0
                val isLaunchable = pm.getLaunchIntentForPackage(appInfo.packageName) != null
                if (isUserApp && isLaunchable) {
                    val app = Arguments.createMap()
                    app.putString("name", pm.getApplicationLabel(appInfo).toString())
                    app.putString("packageName", appInfo.packageName)
                    result.pushMap(app)
                }
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
}