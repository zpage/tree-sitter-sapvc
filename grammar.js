// tree-sitter grammar for the SAP VC/AVC dependency language — VALIDATED EDITION.
// Validated against 21 real production dependency files (17,988 lines):
// procedures (PRO_*) and constraints (CONS_*), elevator product line, 2026-08-03.
//
// Design notes:
// - A file is a FLAT sequence of units: statements, IF clauses, and constraint
//   sections (OBJECTS:/CONDITION:/RESTRICTIONS:/INFERENCES:). No file-type
//   choice => no LALR common-prefix conflicts.
// - Statement/reference split by '$' prefix: procedure statements assign to
//   $SELF/$ROOT/$PARENT refs; constraint RESTRICTIONS statements assign to
//   bare object refs (ET1, NS, SPB.TYP_CONFIG_CATEGORY). The two never mix in
//   the validated corpus, so the grammar is unambiguous.
// - comment is a REGEX in extras (position-independent). '*' is BOTH the
//   whole-line comment marker and the multiplication operator; when the lexer
//   sees '*' the comment regex matches longest and wins. KNOWN LIMITATION:
//   61 corpus lines use '*' as multiplication (0.34%); those lines parse with
//   the '*' tail consumed as a comment (no ERROR node). The LSP semantic layer
//   re-parses such lines with line-aware logic (see validate_grammar.py).

module.exports = grammar({
  name: 'sapvc',

  extras: $ => [/\\s/],

  word: $ => $.identifier,

  // '(' inside a paren_group can start an assignment or a condition
  // comparison; the next token (',' vs 'AND'/'OR') decides, so GLR forks
  // between the assignment and reference interpretations.
  conflicts: $ => [[$.assignment, $.reference], [$.object_ref, $.reference], [$.bare_ref, $.reference], [$.call, $.reference], [$.condition_term], [$.object_decl], [$.objects_section]],

  rules: {
    source_file: $ => repeat(choice(
      seq($.statement, optional(choice(',', ';'))),   // statements may carry a trailing comma [V]
      $.comment_statement,
      $.if_clause,
      $.objects_section,
      $.condition_section,
      $.restrictions_section,
      $.inferences_section
    )),

    // ==================================================================
    // Procedure statements [V]
    // ==================================================================

    // $SELF.X = $SELF.NULL | $SELF.X = 'STR' | $SELF.X = 123
    // multi-line forms:  ref \n = value   and   ref = \n value
    assignment: $ => seq(
      $.object_ref, '=', $.expression
    ),

    // $SELF.X ?= 'VER_02'   (conditional value assignment, 251x in sample)
    // RHS allows unary '-' prefix: `?=-(20+(...))` (corpus-observed)
    conditional_assignment: $ => seq(
      $.object_ref, '?=', prec(3, seq(optional('-'), $.expression))
    ),

    // $SELF.POS_S_COP is invisible | <ref> IS INVISIBLE  (case-insensitive) [V]
    is_statement: $ => seq(
      $.object_ref, choice('is', 'IS'),
      choice('invisible', 'INVISIBLE', 'visible', 'VISIBLE', 'hidden', 'HIDDEN',
             'required', 'REQUIRED', 'optional', 'OPTIONAL')
    ),

    // $DEL_DEFAULT ($SELF,TXT_ELE_VENDOR,$SELF.TXT_ELE_VENDOR)  [V]
    system_call: $ => seq(
      // literal tokens (not regex) so highlights.scm can target them;
      // corpus has $DEL_DEFAULT x197, other verbs from the UDL Keywords1
      choice('$SET_DEFAULT', '$set_default', '$DEL_DEFAULT', '$del_default',
             '$SET_PRICING_FACTOR', '$set_pricing_factor', '$COUNT_PARTS', '$count_parts',
             '$SUM_PARTS', '$sum_parts'),
      '(', $.object_ref, ',', $.identifier, ',', $.value, ')'
    ),

    // TABLE TB_TM_GROOVE (WGT_CAR_TOTAL = $SELF.WGT_CAR_TOTAL, ...)   [V]
    // FUNCTION SAP_VF_SUBSTRING( SAP_VF_CHARIN = ..., ...)             [V]
    // PFUNCTION Z_MFT_UPD_VTABLE ( ZVTABLE = 'TBL_SCREEN_PRINT2', ...) [V]
    // case: corpus has both TABLE and table, PFUNCTION and pfunction
    keyword_call: $ => seq(
      choice('table', 'TABLE', 'function', 'FUNCTION', 'pfunction', 'PFUNCTION'),
      $.identifier,
      '(',
      optional(seq($.named_argument, repeat(seq(',', $.named_argument)))),
      ')'
    ),
    named_argument: $ => seq($.identifier, choice('=', '?='), $.value),

    // ($SELF.TXT_SCREEN_PRINT ?='B', $SELF.TYP_CONTROL_SYSTEM ?='MC2-B')  [V]
    // groups may also contain full conditions:
    //   ( $SELF.A = 'BX' AND $SELF.B = 'B' OR $SELF.A = 'CX' AND ... )   [V]
    paren_group: $ => seq(
      '(',
      repeat(seq(choice($.assignment, $.conditional_assignment, $.is_statement, $.condition), optional(choice(',', ';')))),
      ')'
    ),

    statement: $ => choice(
      $.assignment,
      $.conditional_assignment,
      $.is_statement,
      $.system_call,
      $.keyword_call,
      $.paren_group
    ),

    // IF <condition>[,|.] — guards the preceding statement; the terminator is
    // optional (corpus: last IF in a file often has none; 2 files end with '.') [V]
    if_clause: $ => seq(choice('IF', 'if'), $.condition, optional(choice(',', '.'))),

    // ==================================================================
    // Constraint sections [V]
    // ==================================================================

    // OBJECTS:
    // ET1 IS_A(300) ETOPARAMETERGROUP,
    // ET2 IS_A(300) ETOPARAMETERGROUP where Remark = TXT_NON_STD_REMARK
    objects_section: $ => seq(
      choice('OBJECTS', 'Objects', 'objects'), ':',
      // object_decl carries its own optional ','; a bare where on an object
      // declaration is followed by THAT object's restriction statements
      // inline inside OBJECTS (constraint corpus: '(300)CLS where' then C_V2 = ...;)
      repeat(choice($.object_decl, $.restriction_statement, $.comment_statement))
    ),
    object_decl: $ => choice(
      seq(
        $.identifier, 'IS_A', '(', $.number, ')', $.identifier,
        optional(seq(choice('where', 'WHERE'), optional(seq($.identifier, '=', $.identifier)))),
        // trailing comma is OPTIONAL: real corpus has both `...,` and bare
        // line-end after the class name (e.g. NET_CN_ENTA_VILLA.sapvc)
        optional(choice(',', ';'))
      ),
      // `(300)CN_ELEV_ENG_M where TM = TYP_TM,` — object declared by class
      // number + class name, no separate object identifier (cons corpus)
      seq(
        '(', $.number, ')', $.identifier,
        optional(seq(choice('where', 'WHERE'), optional(seq($.identifier, '=', $.identifier)))),
        optional(choice(',', ';'))
      )
    ),

    condition_section: $ => seq(choice('CONDITION', 'Condition', 'condition'), ':', $.condition),

    // RESTRICTIONS/INFERENCES content: bare-ref statements and IF clauses
    // interleaved [V]. prec.RIGHT: after section content, an IF/statement
    // SHIFTS to continue the section (prec.left would reduce = end the
    // section, breaking restriction-after-IF sequences).
    restrictions_section: $ => seq(choice('RESTRICTIONS', 'Restrictions', 'restrictions'), ':', prec.right(repeat1(choice($.restriction_statement, $.if_clause, $.comment_statement)))),
    inferences_section: $ => seq(choice('INFERENCES', 'Inferences', 'inferences'), ':', prec.right(repeat1(choice($.restriction_statement, $.if_clause, $.comment_statement)))),

    restriction_statement: $ => choice(
      seq($.bare_ref, '=', $.expression, optional(choice(',', ';'))),
      seq($.bare_ref, '?=', $.expression, optional(choice(',', ';'))),
      // object-ref assignment: `ET1.DIM_CWF_H = SPB.DIM_CWF_H` in
      // RESTRICTIONS (constraint corpus)
      seq($.object_ref, '=', $.expression, optional(choice(',', ';'))),
      seq($.object_ref, '?=', $.expression, optional(choice(',', ';'))),
      // TABLE/FUNCTION/system calls and is-statements also appear in
      // RESTRICTIONS/INFERENCES. NOTE: NOT `$.statement` — its assignment arm
      // GLR-forks against the bare_ref/object_ref arms above.
      $.keyword_call,
      $.system_call,
      $.is_statement
    ),

    // ==================================================================
    // Conditions / expressions [V]
    // ==================================================================

    // term (AND term)* — multi-line chains; also OR, NOT (case-insensitive)
    condition: $ => prec.left(seq(
      $.condition_term,
      repeat(seq(choice('AND', 'And', 'and', 'OR', 'Or', 'or'), $.condition_term))
    )),

    // prec(2): condition contexts must win over plain value/expression
    // parses when both could start at the same token (e.g. 'NOT (').
    condition_term: $ => prec(2, choice(
      seq($.value, choice('SPECIFIED', 'Specified', 'specified')),               // X SPECIFIED (postfix) [V]
      seq(choice('SPECIFIED', 'Specified', 'specified'), $.value),               // SPECIFIED X (prefix) [V]
      seq($.value, choice('IN', 'In', 'in'), '(', $.in_item, repeat(seq(',', $.in_item)), ')'),  // X IN (...) [V]
      // comparisons (both sides arithmetic) [V]
      // RHS allows a unary '-' prefix: `>=-(X-Y)` / `<= -5` (corpus-observed).
      // Scoped to the RHS position only, so it never forks against binary
      // '-' chains elsewhere (unlike a global value-level unary minus).
      seq($.expression, choice('=', '<>', '<', '>', '<=', '>='),
          prec(3, seq(optional('-'), $.expression))),
      seq('(', $.condition, ')'),                      // parenthesized condition: (NOT X SPECIFIED) [V]
      prec(3, seq(choice('NOT', 'Not', 'not'), $.condition_term)),         // NOT X
      prec(3, seq(choice('NOT', 'Not', 'not'), '(', $.condition, ')')),    // NOT (X AND Y)
      $.call,                                          // FRAC(...) / PART_OF(a,b) / math builtins [V]
      $.value
    )),

    // generic function call: math builtins (FRAC/ABS/SIN...), PART_OF(a,b),
    // user functions. Args may be arithmetic expressions. [V]
    // prec(3): at an identifier followed by '(', the call shift must beat the
    // reference reduce (PART_OF(...) must parse as a call, not a bare ref).
    call: $ => prec(3, seq(
      $.identifier,
      '(',
      optional(seq($.expression, repeat(seq(',', $.expression)))),
      ')'
    )),

    // IN-list items: plain values or numeric ranges  IN (>2400 - 2600) [V]
    in_item: $ => choice(
      $.value,
      seq(optional(choice('>', '>=', '<', '<=')), $.value,
          '-', optional(choice('>', '>=', '<', '<=')), $.value)
    ),

    // Arithmetic / concatenation expression (RHS of assignments) [V]
    // NOTE: unary minus (`?= -50`) is NOT supported — attempts to add it
    // (leading-operand or value-level prec) break multi-line `.../2-\n$SELF...`
    // chains via GLR forks. Rare in corpus (1-2 occurrences); LSP filters it.
    expression: $ => prec.left(seq(
      $.value,
      // '**' exponentiation added from the author's VCE template library
      // (2026-01-05, `$self.POWER = $self.TORQUE * $self.SPEED ** 2`);
      // not observed in the 21-file corpus but documented VC syntax [T]
      repeat(seq(choice('||', '+', '-', '*', '/', '**'), $.value))
    )),

    value: $ => choice(
      $.reference,
      // MDATA <char>: material-data reference in variant function args
      // (e.g. `SAP_VF_CHARIN = MDATA $self.TXT_MATNR`) [constraint corpus]
      seq(choice('MDATA', 'mdata'), $.reference),
      $.string,
      $.number,
      $.keyword_call,                 // TABLE/FUNCTION/PFUNCTION calls in conditions [V]
      $.call,                         // FRAC(x), ABS(x), ... [V]
      seq('(', $.expression, ')')     // nested arithmetic: (A/2 + B)
    ),

    // $SELF / $ROOT / $PARENT object variables [V: $SELF; T: $ROOT/$PARENT]
    object_var: $ => /\$(?:SELF|ROOT|PARENT)/i,

    // $SELF.CHAR dotted chains (procedure statements).
    // Left-recursive: avoids the '.'-continuation shift/reduce ambiguity of
    // identifier + repeat(seq('.', ...)) at runtime.
    object_ref: $ => prec.left(choice(
      $.object_var,
      seq($.object_ref, '.', $.identifier)
    )),

    // bare chains: ET1.CHAR, TXT_DESIGN_CODE, M.TYP_EM (constraints + conditions)
    bare_ref: $ => prec.left(choice(
      $.identifier,
      seq($.bare_ref, '.', $.identifier)
    )),

    reference: $ => choice($.object_ref, $.bare_ref),

    string: $ => seq("'", /[^'\r\n]*/, "'"),
    number: $ => /-?\d+(?:\.\d+)?/,
    identifier: $ => /[A-Za-z_][A-Za-z0-9_]*/,

    // Line-start comment: '*' as first non-space char of a line.
    // (multiplication '*' is matched only in non-line-start positions)
    comment_statement: $ => seq('*', /[^\r\n]*/)
  }
});
