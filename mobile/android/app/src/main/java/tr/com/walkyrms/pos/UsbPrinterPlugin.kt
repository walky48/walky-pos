package tr.com.walkyrms.pos

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.usb.UsbConstants
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbDeviceConnection
import android.hardware.usb.UsbEndpoint
import android.hardware.usb.UsbManager
import android.os.Build
import android.util.Base64
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/**
 * USB termal yazıcıya, Android'in kendi USB izin sistemi ve UsbManager'ı
 * üzerinden doğrudan ham ESC/POS verisi gönderir. Bulk-OUT uç noktası olan
 * ilk arayüzü otomatik bulur; marka/model bağımsız çalışması hedeflenmiştir.
 */
@CapacitorPlugin(name = "UsbPrinter")
class UsbPrinterPlugin : Plugin() {

    private val ACTION_USB_PERMISSION = "tr.com.walkyrms.pos.USB_PERMISSION"

    @PluginMethod
    fun printBytes(call: PluginCall) {
        val b64 = call.getString("data")
        if (b64 == null) {
            call.reject("data zorunlu")
            return
        }
        val bytes = Base64.decode(b64, Base64.DEFAULT)
        val manager = context.getSystemService(Context.USB_SERVICE) as UsbManager

        val device = findPrinterDevice(manager)
        if (device == null) {
            call.reject("USB yazıcı bulunamadı — bağlı ve açık olduğundan emin olun")
            return
        }

        if (!manager.hasPermission(device)) {
            val granted = requestPermissionSync(manager, device)
            if (!granted) {
                call.reject("USB erişim izni verilmedi")
                return
            }
        }

        val error = sendToDevice(manager, device, bytes)
        if (error == null) call.resolve() else call.reject(error)
    }

    @PluginMethod
    fun isAvailable(call: PluginCall) {
        val manager = context.getSystemService(Context.USB_SERVICE) as UsbManager
        val ret = com.getcapacitor.JSObject()
        ret.put("available", findPrinterDevice(manager) != null)
        call.resolve(ret)
    }

    private fun findPrinterDevice(manager: UsbManager): UsbDevice? {
        for (device in manager.deviceList.values) {
            for (i in 0 until device.interfaceCount) {
                val intf = device.getInterface(i)
                for (e in 0 until intf.endpointCount) {
                    val ep = intf.getEndpoint(e)
                    if (ep.type == UsbConstants.USB_ENDPOINT_XFER_BULK && ep.direction == UsbConstants.USB_DIR_OUT) {
                        return device
                    }
                }
            }
        }
        return null
    }

    private fun requestPermissionSync(manager: UsbManager, device: UsbDevice): Boolean {
        val latch = CountDownLatch(1)
        var granted = false
        val receiver = object : BroadcastReceiver() {
            override fun onReceive(ctx: Context, intent: Intent) {
                if (ACTION_USB_PERMISSION == intent.action) {
                    granted = intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)
                    latch.countDown()
                }
            }
        }
        val filter = IntentFilter(ACTION_USB_PERMISSION)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("UnspecifiedRegisterReceiverFlag")
            context.registerReceiver(receiver, filter)
        }
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE else 0
        val pi = PendingIntent.getBroadcast(context, 0, Intent(ACTION_USB_PERMISSION), flags)
        manager.requestPermission(device, pi)
        latch.await(30, TimeUnit.SECONDS)
        try {
            context.unregisterReceiver(receiver)
        } catch (e: Exception) { /* zaten kaldırılmış olabilir */ }
        return granted
    }

    private fun sendToDevice(manager: UsbManager, device: UsbDevice, bytes: ByteArray): String? {
        for (i in 0 until device.interfaceCount) {
            val intf = device.getInterface(i)
            var outEp: UsbEndpoint? = null
            for (e in 0 until intf.endpointCount) {
                val ep = intf.getEndpoint(e)
                if (ep.type == UsbConstants.USB_ENDPOINT_XFER_BULK && ep.direction == UsbConstants.USB_DIR_OUT) {
                    outEp = ep
                    break
                }
            }
            if (outEp != null) {
                val conn: UsbDeviceConnection = manager.openDevice(device) ?: return "USB cihazı açılamadı"
                if (!conn.claimInterface(intf, true)) {
                    conn.close()
                    return "USB arayüzü talep edilemedi"
                }
                val sent = conn.bulkTransfer(outEp, bytes, bytes.size, 8000)
                conn.releaseInterface(intf)
                conn.close()
                return if (sent >= 0) null else "Yazıcıya veri gönderilemedi"
            }
        }
        return "Yazıcı arayüzü bulunamadı"
    }
}
