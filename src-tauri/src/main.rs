#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

fn main() {
    // Default to info level, can be overridden by CCG_LOG_LEVEL env var
    let filter = EnvFilter::try_from_env("CCG_LOG_LEVEL")
        .unwrap_or_else(|_| EnvFilter::new("info,ccg_gateway=debug,ccg_gateway_lib=debug"));

    let fmt_layer = tracing_subscriber::fmt::layer();

    // Check if file logging is enabled
    if ccg_gateway_lib::config::is_file_log_enabled() {
        let log_dir = ccg_gateway_lib::config::get_log_dir();
        
        // Ensure log directory exists
        if let Err(e) = std::fs::create_dir_all(&log_dir) {
            eprintln!("Failed to create log directory: {}", e);
        }

        let file_appender = tracing_appender::rolling::daily(&log_dir, "ccg-gateway.log");
        let file_layer = tracing_subscriber::fmt::layer()
            .with_writer(file_appender)
            .with_ansi(false);

        tracing_subscriber::registry()
            .with(filter)
            .with(fmt_layer)
            .with(file_layer)
            .init();

        eprintln!("File logging enabled, log directory: {}", log_dir.display());
    } else {
        tracing_subscriber::registry()
            .with(filter)
            .with(fmt_layer)
            .init();
    }

    ccg_gateway_lib::run();
}
