# tree-sitter-sapvc

Tree-sitter grammar for the **SAP Variant Configuration (LO-VC / AVC) dependency language**.

Validated against 21 real production dependency files (17,988 lines) — procedures
(`PRO_*.txt`) and constraints (`CONS_*.txt`) from an elevator product line (2026-08-03).

## Usage

```bash
npm install            # installs tree-sitter-cli
npm run generate       # generates src/parser.c from grammar.js
npm run parse <file>   # parse a file and print the syntax tree
npm run highlight <file>  # render the file with highlights.scm
```

## Language surface (validated)

**Procedure body**

```
$SELF.THIS_WILL_STOP = $SELF.NULL              # assignment
$SELF.TXT_ELE_VENDOR ?= 'VER_03'               # conditional assignment
$SELF.POS_S_COP is invisible                   # visibility statement
$DEL_DEFAULT ($SELF,TXT_ELE_VENDOR,$SELF.TXT_ELE_VENDOR)
TABLE TB_TM_GROOVE (WGT_CAR_TOTAL = $SELF.WGT_CAR_TOTAL, ...)
PFUNCTION Z_MFT_UPD_VTABLE ( ZVTABLE = 'TBL_SCREEN_PRINT2', ...)
($SELF.A ?= 'X', $SELF.B ?= 'Y')               # paren statement group
IF <multi-line condition>,                      # postfix guard, comma-terminated
```

**Constraint body**

```
OBJECTS:
ET1 IS_A(300) ETOPARAMETERGROUP,
ET2 IS_A(300) ETOPARAMETERGROUP where Remark = TXT_NON_STD_REMARK,
CONDITION:
ET1.TXT_MODEL_NAME IN ( 'FULL_MODEL_VC') AND PART_OF(SPB,ET2)
RESTRICTIONS:
SPB.TYP_CONFIG_CATEGORY = 'ETO2'
```

Comments: whole-line `*`. Case-insensitive. Values: single-quoted strings, integers (dates), `$SELF.NULL`.

## Consumers

- **Zed** (primary): tree-sitter is Zed's native parsing + highlighting engine.
  See `../zed-sapvc/` for the Zed extension.
- **LSP** (next): the same parser backs the `sapvc-lsp` language server
  (completion, hover, references, validation).

## License

MIT
