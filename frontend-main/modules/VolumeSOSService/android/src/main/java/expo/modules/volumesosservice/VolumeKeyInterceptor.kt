package expo.modules.volumesosservice

import android.content.Context
import android.content.Intent
import android.view.KeyEvent

object VolumeKeyInterceptor {
    fun handleKeyEvent(context: Context, event: KeyEvent): Boolean {
        if ((event.keyCode == KeyEvent.KEYCODE_VOLUME_DOWN ||
             event.keyCode == KeyEvent.KEYCODE_VOLUME_UP) &&
             event.action == KeyEvent.ACTION_DOWN) {
            val intent = Intent(context, VolumeSOSService::class.java).apply {
                action = "VOLUME_PRESS"
            }
            context.startService(intent)
            return true
        }
        return false
    }
}
