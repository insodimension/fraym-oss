use std::{
    collections::HashSet,
    env,
    ffi::OsString,
    net::{SocketAddr, TcpStream},
    path::{Path, PathBuf},
    process::{Child, Command},
    sync::Mutex,
    time::Duration,
};
use tauri::{AppHandle, Manager};

const BRIDGE_PORT: u16 = 4319;
const BRIDGE_PROBE_TIMEOUT: Duration = Duration::from_millis(200);

#[derive(Default)]
struct BridgeProcess(Mutex<Option<Child>>);

/// PATH for the bridge: a desktop GUI launch often inherits a thin environment.
/// Keep inherited entries first, then append the same common Bun/Codex/Git locations
/// used by common desktop launchers, de-duplicated, so `bun` can find `codex app-server` too.
fn augmented_path() -> OsString {
    let mut dirs = Vec::new();
    let mut seen = HashSet::new();

    if let Some(existing) = env::var_os("PATH") {
        for dir in env::split_paths(&existing) {
            if seen.insert(dir.clone()) {
                dirs.push(dir);
            }
        }
    }

    let home = env::var_os("USERPROFILE")
        .or_else(|| env::var_os("HOME"))
        .map(PathBuf::from)
        .unwrap_or_default();
    let mut common_dirs = vec![
        home.join(".local").join("bin"),
        home.join(".bun").join("bin"),
        home.join(".codex").join("bin"),
        home.join(".npm-global").join("bin"),
        home.join(".npm").join("bin"),
        home.join(".local").join("share").join("mise").join("shims"),
        home.join(".asdf").join("shims"),
        PathBuf::from("/opt/homebrew/bin"),
        PathBuf::from("/usr/local/bin"),
    ];

    #[cfg(windows)]
    {
        common_dirs.extend([
            home.join("AppData").join("Roaming").join("npm"),
            home.join("AppData").join("Local").join("pnpm"),
            home.join("scoop").join("shims"),
        ]);
        for key in ["ProgramFiles", "ProgramFiles(x86)", "ProgramW6432"] {
            if let Some(program_files) = env::var_os(key) {
                let git = PathBuf::from(program_files).join("Git");
                common_dirs.extend([git.join("cmd"), git.join("bin"), git.join("usr").join("bin")]);
            }
        }
    }

    for dir in common_dirs {
        if dir.is_dir() && seen.insert(dir.clone()) {
            dirs.push(dir);
        }
    }

    env::join_paths(dirs).unwrap_or_else(|_| env::var_os("PATH").unwrap_or_default())
}

#[cfg(windows)]
fn apply_no_window(command: &mut Command) {
    use std::os::windows::process::CommandExt;

    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    command.creation_flags(CREATE_NO_WINDOW);
}

#[cfg(not(windows))]
fn apply_no_window(_command: &mut Command) {}

fn bridge_is_listening() -> bool {
    let address = SocketAddr::from(([127, 0, 0, 1], BRIDGE_PORT));
    TcpStream::connect_timeout(&address, BRIDGE_PROBE_TIMEOUT).is_ok()
}

/// The bridge remains source-run for now. In development, locate it from this
/// app's checkout; bundling bridge.ts and its runtime as a resource is follow-up work.
fn bridge_script_path() -> Result<PathBuf, String> {
    let mut roots = Vec::new();
    if let Ok(cwd) = env::current_dir() {
        roots.extend(cwd.ancestors().map(Path::to_path_buf));
    }

    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    roots.extend(manifest_dir.ancestors().map(Path::to_path_buf));

    roots
        .into_iter()
        .map(|root| root.join("packages").join("driver-codex").join("bridge.ts"))
        .find(|candidate| candidate.is_file())
        .and_then(|candidate| candidate.canonicalize().ok())
        .ok_or_else(|| "Could not find packages/driver-codex/bridge.ts from the desktop checkout.".to_string())
}

fn start_bridge(state: &BridgeProcess) -> Result<(), String> {
    if bridge_is_listening() {
        return Ok(());
    }

    let mut child_guard = state
        .0
        .lock()
        .map_err(|_| "Codex bridge process state was poisoned.".to_string())?;
    if child_guard.is_some() || bridge_is_listening() {
        return Ok(());
    }

    let script = bridge_script_path()?;
    let bridge_dir = script
        .parent()
        .ok_or_else(|| "Codex bridge script has no parent directory.".to_string())?;
    let mut command = Command::new("bun");
    command.arg(&script).current_dir(bridge_dir).env("PATH", augmented_path());
    apply_no_window(&mut command);

    let child = command
        .spawn()
        .map_err(|error| format!("Failed to start Codex bridge at {}: {error}", script.display()))?;
    *child_guard = Some(child);
    Ok(())
}

fn stop_bridge(app: &AppHandle) {
    let state = app.state::<BridgeProcess>();
    let Ok(mut child_guard) = state.0.lock() else {
        return;
    };
    let Some(mut child) = child_guard.take() else {
        return;
    };

    #[cfg(windows)]
    {
        let pid = child.id().to_string();
        let mut taskkill = Command::new("taskkill");
        taskkill.args(["/PID", &pid, "/T", "/F"]);
        apply_no_window(&mut taskkill);
        let _ = taskkill.status();
    }

    let _ = child.kill();
    let _ = child.wait();
}

pub fn run() {
    let app = tauri::Builder::default()
        .manage(BridgeProcess::default())
        .setup(|app| start_bridge(app.state::<BridgeProcess>().inner()).map_err(Into::into))
        .on_window_event(|window, event| {
            if matches!(event, tauri::WindowEvent::CloseRequested { .. }) {
                stop_bridge(window.app_handle());
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building Fraym Codex desktop");

    app.run(|handle, event| {
        if matches!(event, tauri::RunEvent::ExitRequested { .. } | tauri::RunEvent::Exit) {
            stop_bridge(handle);
        }
    });
}
