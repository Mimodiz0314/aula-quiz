package com.edumaster.aula;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Registrar el plugin del servidor local ANTES de super.onCreate.
        registerPlugin(LanServerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
