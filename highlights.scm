; Tree-sitter highlight queries for the SAP VC/AVC dependency language.
; Consumed by Zed (primary) and by `tree-sitter highlight` for offline testing.
; Node names verified against node-types.json of the VALIDATED grammar
; (21 production files / 17,988 lines, 2026-08-03).

(comment) @comment
(string) @string
(number) @number

; $SELF / $ROOT / $PARENT object variables
(object_var) @variable.builtin

; dotted chains: ET1.CHAR, TXT_DESIGN_CODE, M.TYP_EM, $SELF.CHAR
(bare_ref (identifier) @variable)
(object_ref (identifier) @variable)

; function calls: FRAC(), ABS(), PART_OF(a,b), user functions
(call (identifier) @function.call)
(keyword_call (identifier) @function.call)

; system procedure verbs (regex token, both cases covered by the regex /i)
"$SET_DEFAULT" @function.builtin
"$DEL_DEFAULT" @function.builtin
"$SET_PRICING_FACTOR" @function.builtin
"$COUNT_PARTS" @function.builtin
"$SUM_PARTS" @function.builtin

; control keywords (corpus uses both cases)
"IF" @keyword.control
"if" @keyword.control
"is" @keyword.operator
"IS" @keyword.operator
"where" @keyword.operator
"WHERE" @keyword.operator

; logical / relational operators
"AND" @keyword.operator
"and" @keyword.operator
"OR" @keyword.operator
"or" @keyword.operator
"NOT" @keyword.operator
"not" @keyword.operator
"IN" @keyword.operator
"in" @keyword.operator
"SPECIFIED" @keyword.operator
"specified" @keyword.operator

; constraint sections
"OBJECTS" @keyword
"CONDITION" @keyword
"RESTRICTIONS" @keyword
"INFERENCES" @keyword

; object declaration
"IS_A" @keyword

; keyword calls (variant table / custom function invocations)
"table" @keyword
"TABLE" @keyword
"function" @keyword
"FUNCTION" @keyword
"pfunction" @keyword
"PFUNCTION" @keyword

; operators
"=" @operator
"?=" @operator
"<>" @operator
"<" @operator
">" @operator
"<=" @operator
">=" @operator
"||" @operator
"+" @operator
"-" @operator
"*" @operator
"/" @operator
