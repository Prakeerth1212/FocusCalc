package com.focuscalcmobile

import android.app.Activity
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import android.view.WindowManager
import android.content.Intent

class OverlayActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        val layout = android.widget.LinearLayout(this)
        layout.orientation = android.widget.LinearLayout.VERTICAL
        layout.gravity = android.view.Gravity.CENTER
        layout.setBackgroundColor(android.graphics.Color.parseColor("#0f0f0f"))
        layout.setPadding(60, 60, 60, 60)

        val emoji = TextView(this)
        emoji.text = "🔒"
        emoji.textSize = 64f
        emoji.gravity = android.view.Gravity.CENTER
        layout.addView(emoji)

        val title = TextView(this)
        title.text = "You're in Focus Mode"
        title.textSize = 24f
        title.setTextColor(android.graphics.Color.parseColor("#4ade80"))
        title.gravity = android.view.Gravity.CENTER
        title.setPadding(0, 30, 0, 16)
        layout.addView(title)

        val subtitle = TextView(this)
        val blockedApp = intent.getStringExtra("blocked_app") ?: "this app"
        subtitle.text = "$blockedApp is blocked during focus sessions.\n\nStay focused!"
        subtitle.textSize = 16f
        subtitle.setTextColor(android.graphics.Color.parseColor("#888888"))
        subtitle.gravity = android.view.Gravity.CENTER
        subtitle.setPadding(0, 0, 0, 40)
        layout.addView(subtitle)

        val backBtn = Button(this)
        backBtn.text = "Go Back"
        backBtn.setBackgroundColor(android.graphics.Color.parseColor("#4ade80"))
        backBtn.setTextColor(android.graphics.Color.parseColor("#0f0f0f"))
        backBtn.textSize = 16f
        backBtn.setPadding(40, 20, 40, 20)
        backBtn.setOnClickListener {
            val homeIntent = Intent(Intent.ACTION_MAIN)
            homeIntent.addCategory(Intent.CATEGORY_HOME)
            homeIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            startActivity(homeIntent)
            finish()
        }
        layout.addView(backBtn)

        setContentView(layout)
    }
}