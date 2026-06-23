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
        private const val PREFS_NAME = "dynamic_app_icon"
        private const val PREF_ICON_NAME = "icon_name"
    }

    @ReactMethod
    fun setAppIcon(name: String?) {
        try {
            val pm = reactApplicationContext.packageManager
            val packageName = reactApplicationContext.packageName
            val target = name ?: "Default"
            if (!ICONS.contains(target)) {
                return
            }

            reactApplicationContext
                .getSharedPreferences(PREFS_NAME, 0)
                .edit()
                .putString(PREF_ICON_NAME, target)
                .apply()

            // Enabling the new alias is safe. Disabling the old launcher alias while
            // its Activity is alive can make some Android launchers kill/recreate the app.
            val targetComponent = ComponentName(packageName, "$packageName.MainActivity$target")
            pm.setComponentEnabledSetting(
                targetComponent,
                PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                PackageManager.DONT_KILL_APP
            )
        } catch (_: Exception) {
            // Ignore overall failures gracefully
        }
    }

    @ReactMethod
    fun cleanupStaleIcons() {
        try {
            val pm = reactApplicationContext.packageManager
            val packageName = reactApplicationContext.packageName
            val target = reactApplicationContext
                .getSharedPreferences(PREFS_NAME, 0)
                .getString(PREF_ICON_NAME, "Default") ?: "Default"

            ICONS.forEach { icon ->
                if (icon != target) {
                    val component = ComponentName(packageName, "$packageName.MainActivity$icon")
                    try {
                        pm.setComponentEnabledSetting(
                            component,
                            PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                            PackageManager.DONT_KILL_APP
                        )
                    } catch (_: Exception) {
                        // Ignore per-component failures.
                    }
                }
            }
        } catch (_: Exception) {
            // Ignore overall failures gracefully.
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

        val savedName = reactApplicationContext
            .getSharedPreferences(PREFS_NAME, 0)
            .getString(PREF_ICON_NAME, null)
        if (savedName != null && ICONS.contains(savedName)) {
            callback(savedName)
            return
        }

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
