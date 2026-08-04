//! This crate provides SAP VC/AVC dependency language support for the
//! [tree-sitter](https://tree-sitter.github.io) parsing library.
//!
//! Grammar validated against 21 real production dependency files
//! (17,988 lines, elevator product line, 2026-08-03).

use tree_sitter::Language;

extern "C" {
    fn tree_sitter_sapvc() -> *const tree_sitter::ffi::TSLanguage;
}

/// Get the tree-sitter [Language][] for this grammar.
pub fn language() -> Language {
    unsafe { Language::from_raw(tree_sitter_sapvc()) }
}

/// The content of the [`node-types.json`][] file for this grammar.
pub const NODE_TYPES: &str = include_str!("../../src/node-types.json");

#[cfg(test)]
mod tests {
    use super::*;
    use tree_sitter::Parser;

    #[test]
    fn parses_minimal_assignment() {
        let mut parser = Parser::new();
        parser.set_language(&language()).expect("language");
        let tree = parser
            .parse("$SELF.TXT_ELE_VENDOR ?= 'VER_03'", None)
            .expect("parse");
        assert!(!tree.root_node().has_error(), "no errors expected");
    }

    #[test]
    fn parses_comment() {
        let mut parser = Parser::new();
        parser.set_language(&language()).expect("language");
        let tree = parser.parse("* comment line\n$SELF.X = 1\n", None).expect("parse");
        assert!(!tree.root_node().has_error(), "no errors expected");
    }
}
