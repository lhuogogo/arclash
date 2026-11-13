use dark_light::{Mode as SystemTheme, detect as detect_system_theme};
use tauri::utils::config::Color;
use tauri::webview::PageLoadEvent;
use tauri::{Theme, WebviewWindow};

use crate::{config::Config, core::handle, utils::resolve::window_script::build_window_initial_script};
use clash_verge_logging::{Type, logging, logging_error};

const DARK_BACKGROUND_COLOR: Color = Color(46, 48, 61, 255); // #2E303D
const LIGHT_BACKGROUND_COLOR: Color = Color(245, 245, 245, 255); // #F5F5F5
const DARK_BACKGROUND_HEX: &str = "#2E303D";
const LIGHT_BACKGROUND_HEX: &str = "#F5F5F5";

/// Fallback size used when no monitor information is available.
const DEFAULT_WIDTH: f64 = 920.0;
const DEFAULT_HEIGHT: f64 = 520.0;

/// The window never grows beyond this share of the monitor work area.
const WORK_AREA_MAX_RATIO: f64 = 0.86;

// The three-column shell (88 rail + main view + 268 button matrix + gaps)
// stops fitting below this width: the main view collapses and the matrix
// clips its labels. Measured on the running build by dragging the window to
// the smallest usable size, then rounded to the nearest 10.
const MINIMAL_WIDTH: f64 = 920.0;
const MINIMAL_HEIGHT: f64 = 520.0;

/// Resolves the startup window size.
///
/// The shell is tuned for one size: the three columns are fixed-width, so the
/// layout only looks right at a narrow band of window sizes. Opening at a share
/// of the monitor made the window too tall on large displays (the right matrix
/// stretched and its rows drifted apart). So the window now opens at
/// [`DEFAULT_WIDTH`]x[`DEFAULT_HEIGHT`] — the size picked by dragging the
/// running build to its smallest usable size — and is only shrunk when the
/// monitor work area is too small to hold it.
fn resolve_startup_size(app: &tauri::AppHandle) -> (f64, f64) {
    let fallback = (DEFAULT_WIDTH, DEFAULT_HEIGHT);

    let Some(monitor) = app.primary_monitor().ok().flatten() else {
        logging!(warn, Type::Window, "未获取到主显示器信息，使用默认窗口尺寸 {DEFAULT_WIDTH}x{DEFAULT_HEIGHT}");
        return fallback;
    };

    let work_area = monitor.work_area();
    let scale = monitor.scale_factor();
    if scale <= 0.0 {
        return fallback;
    }

    let area_width = work_area.size.width as f64 / scale;
    let area_height = work_area.size.height as f64 / scale;
    if area_width <= 0.0 || area_height <= 0.0 {
        return fallback;
    }

    // Never exceed the work area: a 920x520 window on a smaller desktop would
    // otherwise hang off the screen edge.
    let width = DEFAULT_WIDTH.min(area_width * WORK_AREA_MAX_RATIO).max(MINIMAL_WIDTH);
    let height = DEFAULT_HEIGHT
        .min(area_height * WORK_AREA_MAX_RATIO)
        .max(MINIMAL_HEIGHT);

    logging!(
        info,
        Type::Window,
        "启动窗口尺寸 {width:.0}x{height:.0}（主显示器工作区 {area_width:.0}x{area_height:.0}）"
    );

    (width.round(), height.round())
}

#[cfg(target_os = "linux")]
const DEFAULT_DECORATIONS: bool = false;
#[cfg(not(target_os = "linux"))]
const DEFAULT_DECORATIONS: bool = true;

const fn restored_window_size_is_too_small(width: u32, height: u32) -> bool {
    width < MINIMAL_WIDTH as u32 || height < MINIMAL_HEIGHT as u32
}

fn restore_default_size_if_needed(window: &WebviewWindow, startup_size: (f64, f64)) {
    let Ok(size) = window.outer_size() else {
        return;
    };

    if !restored_window_size_is_too_small(size.width, size.height) {
        return;
    }

    logging_error!(
        Type::Window,
        window.set_size(tauri::LogicalSize::new(startup_size.0, startup_size.1))
    );
    logging_error!(Type::Window, window.center());
}

pub async fn build_new_window() -> Result<WebviewWindow, String> {
    let app_handle = handle::Handle::app_handle();

    let config = Config::verge().await;
    let latest = config.latest_arc();
    let start_page = latest.start_page.as_deref().unwrap_or("/");
    let initial_theme_mode = match latest.theme_mode.as_deref() {
        Some("dark") => "dark",
        Some("light") => "light",
        _ => "system",
    };

    let resolved_theme = match initial_theme_mode {
        "dark" => Some(Theme::Dark),
        "light" => Some(Theme::Light),
        _ => None,
    };

    let prefers_dark_background = match resolved_theme {
        Some(Theme::Dark) => true,
        Some(Theme::Light) => false,
        _ => !matches!(detect_system_theme().ok(), Some(SystemTheme::Light)),
    };

    let background_color = if prefers_dark_background {
        DARK_BACKGROUND_COLOR
    } else {
        LIGHT_BACKGROUND_COLOR
    };

    let initial_script = build_window_initial_script(initial_theme_mode, DARK_BACKGROUND_HEX, LIGHT_BACKGROUND_HEX);

    let (startup_width, startup_height) = resolve_startup_size(app_handle);

    let mut builder = tauri::WebviewWindowBuilder::new(
        app_handle,
        "main", /* the unique window label */
        tauri::WebviewUrl::App(start_page.into()),
    )
    .title("ArClash")
    .center()
    .decorations(DEFAULT_DECORATIONS)
    .fullscreen(false)
    .inner_size(startup_width, startup_height)
    // The minimum has to be applied after the window exists, not in the
    // builder: a builder-level min_inner_size larger than the platform's
    // initial 160x28 placeholder keeps the webview from finishing its first
    // layout, so on_page_load never fires and the window stays hidden. The
    // restore step below enforces the minimum once the window is real.
    .visible(false) // 等待主题色准备好后再展示，避免启动色差
    .initialization_script(&initial_script)
    .general_autofill_enabled(false) // 禁用自动填充
    .on_page_load(move |window, payload| {
        if payload.event() != PageLoadEvent::Finished {
            return;
        }

        logging_error!(Type::Window, window.show());
        logging_error!(Type::Window, window.set_focus());
    });

    if let Some(theme) = resolved_theme {
        builder = builder.theme(Some(theme));
    }

    builder = builder.background_color(background_color);

    match builder.build() {
        Ok(window) => {
            logging_error!(Type::Window, window.set_background_color(Some(background_color)));
            // Enforce the minimum once the window is real. Doing it here rather
            // than in the builder avoids blocking the first webview layout on a
            // window that starts at the platform placeholder size.
            logging_error!(
                Type::Window,
                window.set_min_size(Some(tauri::LogicalSize::new(
                    MINIMAL_WIDTH,
                    MINIMAL_HEIGHT
                )))
            );
            restore_default_size_if_needed(&window, (startup_width, startup_height));
            // A new page supersedes any reload marker left by the old window.
            #[cfg(target_os = "macos")]
            take_webview_needs_reload();
            Ok(window)
        }
        Err(e) => Err(e.to_string()),
    }
}

/// Defers recovery of a terminated hidden main webview until its next activation.
#[cfg(target_os = "macos")]
static WEBVIEW_NEEDS_RELOAD: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);

#[cfg(target_os = "macos")]
pub fn take_webview_needs_reload() -> bool {
    WEBVIEW_NEEDS_RELOAD.swap(false, std::sync::atomic::Ordering::SeqCst)
}

///
/// macOS may kill hidden WebContent under memory pressure. Clean orphaned Mihomo subscriptions,
/// reload visible webviews immediately, and defer a hidden main-window reload until activation.
/// Registering this callback replaces Tauri's default automatic reload.
#[cfg(target_os = "macos")]
pub fn on_web_content_process_terminated(webview: &tauri::Webview) {
    if handle::Handle::global().is_exiting() {
        return;
    }

    logging!(
        warn,
        Type::Window,
        "WebView 渲染进程已被系统终止（label={}），开始恢复",
        webview.label()
    );

    let window = webview.window();
    let is_user_visible = window.is_visible().unwrap_or(false) && !window.is_minimized().unwrap_or(false);

    // Only the main window has a path that consumes the deferred marker.
    let is_main_window = webview.label() == "main";
    let reload_now = is_user_visible || !is_main_window;

    if !reload_now {
        WEBVIEW_NEEDS_RELOAD.store(true, std::sync::atomic::Ordering::SeqCst);
        logging!(info, Type::Window, "窗口不可见，页面将在下次打开窗口时重载");
    }

    // Clean before reload so cleanup cannot remove subscriptions created by the new page.
    let webview = webview.clone();
    crate::process::AsyncHandler::spawn(move || async move {
        if let Err(err) = handle::Handle::mihomo().clear_all_ws_connections() {
            logging!(warn, Type::Window, "清理 Mihomo WebSocket 连接失败: {err}");
        } else {
            logging!(info, Type::Window, "已清理全部 Mihomo WebSocket 连接");
        }
        if reload_now {
            logging_error!(Type::Window, webview.reload());
        }
    });
}

/// Consumes the shared marker for native unminimize paths that bypass `activate_window`.
#[cfg(target_os = "macos")]
pub fn reload_main_window_if_needed() {
    if !take_webview_needs_reload() {
        return;
    }
    let Some(window) = crate::utils::window_manager::WindowManager::get_main_window() else {
        return;
    };
    logging!(info, Type::Window, "渲染进程曾被系统终止，窗口聚焦后重载页面");
    if let Err(e) = window.reload() {
        logging!(warn, Type::Window, "重载页面失败: {e}");
    }
}
