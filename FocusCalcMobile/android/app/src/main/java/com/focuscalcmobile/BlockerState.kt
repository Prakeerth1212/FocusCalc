package com.focuscalcmobile

object BlockerState {
    var isFocusActive: Boolean = false
    var blockedPackages: MutableSet<String> = mutableSetOf()
}