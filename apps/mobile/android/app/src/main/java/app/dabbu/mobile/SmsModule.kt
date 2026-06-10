package app.dabbu.mobile

import android.content.ContentResolver
import android.database.Cursor
import android.net.Uri
import android.provider.Telephony
import com.facebook.react.bridge.*
import org.json.JSONObject

class SmsModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "Sms"

    @ReactMethod
    fun list(filter: String, errorCallback: Callback, successCallback: Callback) {
        try {
            val config = JSONObject(filter)
            val maxCount = config.optInt("maxCount", 100)
            val minDate = config.optLong("minDate", 0L)
            val sortOrder = config.optString("sortOrder", "date DESC")

            val resolver: ContentResolver = reactApplicationContext.contentResolver
            val uri: Uri = Telephony.Sms.Inbox.CONTENT_URI

            val selection = if (minDate > 0L) "${Telephony.Sms.DATE} >= ?" else null
            val selectionArgs = if (minDate > 0L) arrayOf(minDate.toString()) else null

            val cursor: Cursor? = resolver.query(
                uri, null, selection, selectionArgs,
                "$sortOrder LIMIT $maxCount"
            )

            val messages = Arguments.createArray()
            cursor?.use { c ->
                val idCol = c.getColumnIndex(Telephony.Sms._ID)
                val addrCol = c.getColumnIndex(Telephony.Sms.ADDRESS)
                val bodyCol = c.getColumnIndex(Telephony.Sms.BODY)
                val dateCol = c.getColumnIndex(Telephony.Sms.DATE)
                val readCol = c.getColumnIndex(Telephony.Sms.READ)
                val scCol = c.getColumnIndex(Telephony.Sms.SERVICE_CENTER)

                while (c.moveToNext()) {
                    val msg = Arguments.createMap()
                    if (idCol >= 0) msg.putString("_id", c.getString(idCol))
                    if (addrCol >= 0) msg.putString("address", c.getString(addrCol) ?: "")
                    if (bodyCol >= 0) msg.putString("body", c.getString(bodyCol) ?: "")
                    if (dateCol >= 0) msg.putDouble("date", c.getLong(dateCol).toDouble())
                    if (readCol >= 0) msg.putInt("read", c.getInt(readCol))
                    if (scCol >= 0) msg.putString("service_center", c.getString(scCol) ?: "")
                    messages.pushMap(msg)
                }
            }

            successCallback(messages.size(), messages.toString())
        } catch (e: Exception) {
            errorCallback("SmsModule.list error: ${e.message}")
        }
    }

    @ReactMethod
    fun getInboxCount(callback: Callback) {
        try {
            val resolver: ContentResolver = reactApplicationContext.contentResolver
            val uri: Uri = Telephony.Sms.Inbox.CONTENT_URI
            val cursor: Cursor? = resolver.query(uri, arrayOf("COUNT(*) as cnt"), null, null, null)
            var count = 0
            cursor?.use { c ->
                if (c.moveToFirst()) count = c.getInt(0)
            }
            callback(count)
        } catch (_e: Exception) {
            callback(0)
        }
    }

    @ReactMethod
    fun searchFinancial(
        maxCount: Int,
        minDate: Double,
        callback: Callback
    ) {
        try {
            val resolver: ContentResolver = reactApplicationContext.contentResolver
            val uri: Uri = Telephony.Sms.Inbox.CONTENT_URI

            val selection = if (minDate > 0.0) "${Telephony.Sms.DATE} >= ?" else null
            val selectionArgs = if (minDate > 0.0) arrayOf(minDate.toLong().toString()) else null

            val cursor: Cursor? = resolver.query(
                uri, null, selection, selectionArgs,
                "${Telephony.Sms.DATE} DESC LIMIT $maxCount"
            )

            val financialPattern = Regex(
                "(?:rs|inr|debited|credited|paid|received|balance|upi|spent|" +
                        "withdrawn|transfer|refund|payment|bill|recharge|emi|trf|" +
                        "amount|ac\\b|card|bank|a\\/c|deposit|withdrawal|txn|trxn|" +
                        "transaction|spent|purchase|pay|sent|collected)",
                RegexOption.IGNORE_CASE
            )

            val messages = Arguments.createArray()
            cursor?.use { c ->
                val idCol = c.getColumnIndex(Telephony.Sms._ID)
                val addrCol = c.getColumnIndex(Telephony.Sms.ADDRESS)
                val bodyCol = c.getColumnIndex(Telephony.Sms.BODY)
                val dateCol = c.getColumnIndex(Telephony.Sms.DATE)
                val readCol = c.getColumnIndex(Telephony.Sms.READ)

                while (c.moveToNext()) {
                    val body = if (bodyCol >= 0) c.getString(bodyCol) ?: "" else ""
                    if (financialPattern.containsMatchIn(body)) {
                        val msg = Arguments.createMap()
                        if (idCol >= 0) msg.putString("_id", c.getString(idCol))
                        if (addrCol >= 0) msg.putString("address", c.getString(addrCol) ?: "")
                        msg.putString("body", body)
                        if (dateCol >= 0) msg.putDouble("date", c.getLong(dateCol).toDouble())
                        if (readCol >= 0) msg.putInt("read", c.getInt(readCol))
                        messages.pushMap(msg)
                    }
                }
            }

            callback(messages.size(), messages.toString())
        } catch (_e: Exception) {
            callback(0, "[]")
        }
    }
}
