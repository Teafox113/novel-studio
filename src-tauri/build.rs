fn main() {
    println!("cargo:rerun-if-changed=Cargo.toml");
    tauri_build::build()
}
