// config.js
const CONFIG = {
    // Server settings
    server: {
        host: "localhost",
        port: 8765,
        ssl_enabled: true,
        get protocol() {
            return this.ssl_enabled ? "wss" : "ws"
        }
    },

    // Reconnection settings
    reconnect: {
        max_attempts: 5,
        delay: 1000, // milliseconds
        exponential_backoff: false // optional: increase delay after each attempt
    },

    // Cookie settings
    cookie: {
        name: "current_user",
        expiry_days: 7
    },

    // UI settings
    ui: {
        auto_scroll_chat: true,
        show_timestamps: true,
        date_format: "HH:MM:SS"
    },

    // Feature flags
    features: {
        whisper_enabled: true,
        mod_commands_enabled: true
    }
};