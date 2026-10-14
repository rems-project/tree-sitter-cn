; Highlights for CN. Capture names follow the nvim-treesitter conventions;
; general patterns come first and more specific ones later, so that editors
; which give later patterns priority pick the specific capture.

; ---------------------------------------------------------------------------
; Identifiers
; ---------------------------------------------------------------------------

(identifier) @variable

((identifier) @variable.builtin
  (#eq? @variable.builtin "return"))

(arg name: (identifier) @variable.parameter)

(record (arg name: (identifier) @variable.member))
(cons_case (arg name: (identifier) @variable.member))

(expr_memberof member: (identifier) @variable.member)
(expr_arrow member: (identifier) @variable.member)
(expr_membershift member: (identifier) @variable.member)
(expr_offsetof member: (identifier) @variable.member)
(member_def member: (identifier) @variable.member)
(pattern_member_def member: (identifier) @variable.member)

(expr_at_env label: (identifier) @label)
(attrs (identifier) @attribute)

; ---------------------------------------------------------------------------
; Types
; ---------------------------------------------------------------------------

(user_type_name (identifier) @type)
(struct tag: (identifier) @type)
(datatype name: (identifier) @type)
(expr_struct tag: (identifier) @type)
(expr_offsetof tag: (identifier) @type)
(type_identifier) @type
(struct_specifier tag: (identifier) @type)
(union_specifier tag: (identifier) @type)
(enum_specifier tag: (identifier) @type)

(datatype_definition name: (identifier) @type.definition)
(type_synonym name: (identifier) @type.definition)

[
  (unit)
  (bool)
  (integer)
  (bits)
  (real)
  (loc)
  (alloc_id)
  (primitive_type)
] @type.builtin

[
  "map"
  "cn_list"
  "cn_tuple"
  "cn_set"
] @type.builtin

[
  "struct"
  "union"
  "enum"
  "datatype"
] @keyword.type

[
  (type_qualifier)
  (storage_class_specifier)
  (function_specifier)
] @keyword.modifier

; ---------------------------------------------------------------------------
; Functions, predicates, lemmas, constructors
; ---------------------------------------------------------------------------

(function name: (identifier) @function)
(predicate name: (identifier) @function)
(lemma name: (identifier) @function)
(decl_spec name: (identifier) @function)
(mk_function name: (identifier) @function)

(expr_call function: (identifier) @function.call)
(unfold function: (identifier) @function.call)
(apply lemma: (identifier) @function.call)
(instantiate function: (identifier) @function.call)
(named (identifier) @function.call)

[
  "RW"
  "Owned"
  "W"
  "Block"
  "array_shift"
  "member_shift"
  "good"
  "default"
] @function.builtin

(cons_case name: (identifier) @constructor)
(expr_cons constructor: (identifier) @constructor)
(pat_constructor constructor: (identifier) @constructor)

; ---------------------------------------------------------------------------
; Keywords
; ---------------------------------------------------------------------------

[
  "requires"
  "ensures"
  "accesses"
  "trusted"
  "cn_function"
  "cn_ghost"
  "inv"
  "spec"
  "take"
  "let"
  "unchanged"
  "assert"
  "cn_have"
  "split_case"
  "unfold"
  "apply"
  "instantiate"
  "focus"
  "extract"
  "pack"
  "unpack"
  "to_bytes"
  "from_bytes"
  "derive_constraints"
  "inline"
  "cn_print"
] @keyword

[
  "function"
  "predicate"
  "lemma"
] @keyword.function

"type_synonym" @keyword.type

"return" @keyword.return

[
  "if"
  "else"
  "match"
] @keyword.conditional

(expr_ite "?" @keyword.conditional.ternary ":" @keyword.conditional.ternary)

[
  "each"
  "implies"
  "sizeof"
  "offsetof"
] @keyword.operator

; ---------------------------------------------------------------------------
; Literals
; ---------------------------------------------------------------------------

[
  (const_integer)
  (const_bits)
] @number

(floating_const) @number.float
(character_const) @character
(const_bool) @boolean
(const_null) @constant.builtin
(pat_wild) @character.special

; ---------------------------------------------------------------------------
; Operators and punctuation
; ---------------------------------------------------------------------------

[
  "+" "-" "*" "/" "%"
  "&" "|" "^" "~" "!"
  "&&" "||"
  "==" "!=" "<" ">" "<=" ">="
  "=" "=>" ".."
] @operator

[
  "(" ")"
  "[" "]"
  "{" "}"
] @punctuation.bracket

; Angle brackets around type arguments.
(owned "<" @punctuation.bracket ">" @punctuation.bracket)
(block "<" @punctuation.bracket ">" @punctuation.bracket)
(expr_array_shift "<" @punctuation.bracket ">" @punctuation.bracket)
(expr_membershift "<" @punctuation.bracket ">" @punctuation.bracket)
(expr_good "<" @punctuation.bracket ">" @punctuation.bracket)
(expr_sizeof "<" @punctuation.bracket ">" @punctuation.bracket)
(expr_default "<" @punctuation.bracket ">" @punctuation.bracket)
(instantiate "<" @punctuation.bracket ">" @punctuation.bracket)
(map "<" @punctuation.bracket ">" @punctuation.bracket)
(list "<" @punctuation.bracket ">" @punctuation.bracket)
(tuple "<" @punctuation.bracket ">" @punctuation.bracket)
(set "<" @punctuation.bracket ">" @punctuation.bracket)

[
  "," ";" ":" "." "->" "@"
] @punctuation.delimiter

(expr_at_env "%" @punctuation.delimiter)

(elided_arguments "..." @punctuation.special)
(abstract_function_declarator "..." @punctuation.special)

; ---------------------------------------------------------------------------
; Comments and magic-comment delimiters
; ---------------------------------------------------------------------------

(comment) @comment

[
  (magic_open)
  (magic_close)
] @punctuation.special
