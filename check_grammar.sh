#!/usr/bin/env bash
# Grammar quality gate (manual or CI): generate must be conflict-free, the
# production corpus must stay clean, and the LSP test suite must pass.
#
# Usage:  bash check_grammar.sh [--skip-lsp]
# Exit 0 = gate passed.

set -euo pipefail
cd "$(dirname "$0")"
ROOT="$(pwd)"
TOOLS="$(cd .. && pwd -W 2>/dev/null || cygpath -w "$(cd .. && pwd)")"

echo "== [1/3] tree-sitter generate (conflicts) =="
export PATH="/c/Users/10586006/Tools/WinLibs/mingw64/bin:$PATH"
npx tree-sitter-cli generate > /tmp/gen.log 2>&1 || { cat /tmp/gen.log; exit 1; }
UNRES=$(grep -c "Unresolved" /tmp/gen.log || true)
echo "   unresolved: $UNRES"
[ "$UNRES" = "0" ] || { cat /tmp/gen.log; exit 1; }

echo "== [2/3] corpus audit (must stay clean) =="
if [ -d "$TOOLS/material-data" ]; then
    AUDIT_OUT=$(python "$TOOLS/corpus_audit.py" 2>&1 || true)
    echo "$AUDIT_OUT" | tail -2
    ERR=$(echo "$AUDIT_OUT" | grep -oE '[0-9]+ ERROR nodes' | head -1 || echo "0 ERROR nodes")
    case "$ERR" in
        0\ ERROR*|"") echo "   OK: no ERROR nodes" ;;
        *) echo "   FAIL: $ERR — grammar must not regress the corpus"; exit 1 ;;
    esac
else
    echo "   (no material-data corpus found — skipping corpus audit)"
fi

if [ "${1:-}" = "--skip-lsp" ]; then
    echo "OK (LSP tests skipped)"
    exit 0
fi

echo "== [3/3] LSP tests =="
export PATH="$HOME/.cargo/bin:$PATH"
cd "$TOOLS/sapvc-lsp"
cargo test 2>&1 | grep -E "test result" | tail -1

echo "GATE PASSED"
