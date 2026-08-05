use std::path::PathBuf;

fn main() {
    let dir: PathBuf = std::env::var("CARGO_MANIFEST_DIR").unwrap().into();
    let mut src = dir.join("../../src");
    // Normalize .. components: cargo/cc watch and compile the literal path,
    // and a `bindings
ust\..\..\src` form misbehaves on Windows.
    if let Ok(c) = std::fs::canonicalize(&src) {
        src = c;
    }
    let mut c_config = cc::Build::new();
    c_config.include(&src);
    c_config.warnings(false);
    c_config.flag_if_supported("-Wno-unused-parameter");
    c_config.flag_if_supported("-Wno-unused-but-set-variable");
    c_config.flag_if_supported("-Wno-trigraphs");
    let parser_path = src.join("parser.c");
    c_config.file(&parser_path);
    println!("cargo:rerun-if-changed={}", parser_path.to_str().unwrap());
    c_config.compile("parser");

    // scanner.c was removed in the final grammar (comment is a regex token);
    // kept for forward compatibility if an external scanner returns.
    let scanner_path = src.join("scanner.c");
    if scanner_path.exists() {
        c_config.file(&scanner_path);
        c_config.compile("scanner");
    }
}
