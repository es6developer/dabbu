package app.dabbu.mobile

import android.content.ComponentName
import android.content.pm.PackageManager
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Callback

class DynamicAppIconModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "DynamicAppIcon"

    companion object {
        private val ICONS = listOf("Default", "Personal", "Couple", "Family", "Full")
    }

    @ReactMethod
    fun setAppIcon(name: String?) {
        try {
            val pm = reactApplicationContext.packageManager
            val packageName = reactApplicationContext.packageName
            val target = name ?: "Default"

            // Detect the currently running Activity's alias so we never disable it
            val currentComponent = reactApplicationContext.currentActivity?.intent?.component

            ICONS.forEach { icon ->
                val component = ComponentName(packageName, "$packageName.MainActivity$icon")
                try {
                    val state = when {
                        icon == target -> PackageManager.COMPONENT_ENABLED_STATE_ENABLED
                        component == currentComponent -> {
                            // Keep the current Activity's alias enabled to avoid destroying it
                            PackageManager.COMPONENT_ENABLED_STATE_ENABLED
                        }
                        else -> PackageManager.COMPONENT_ENABLED_STATE_DISABLED
                    }
                    pm.setComponentEnabledSetting(
                        component,
                        state,
                        PackageManager.DONT_KILL_APP
                    )
                } catch (_: Exception) {
                    // Ignore per-component failures — at least try the rest
                }
            }
        } catch (_: Exception) {
            // Ignore overall failures gracefully
        }
    }

    @ReactMethod
    fun supportsDynamicAppIcon(promise: com.facebook.react.bridge.Promise) {
        promise.resolve(true)
    }

    @ReactMethod
    fun getIconName(callback: Callback) {
        val pm = reactApplicationContext.packageManager
        val packageName = reactApplicationContext.packageName

        var currentName = "Default"
        for (icon in ICONS) {
            val component = ComponentName(packageName, "$packageName.MainActivity$icon")
            val state = pm.getComponentEnabledSetting(component)
            if (state == PackageManager.COMPONENT_ENABLED_STATE_ENABLED) {
                currentName = icon
                break
            }
        }
        callback(currentName)
    }
}
