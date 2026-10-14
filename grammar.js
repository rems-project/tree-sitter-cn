/**
 * @file Tree-sitter grammar for CN, the separation-logic specification language for C
 * @author RE Ltd
 * @license MIT
 *
 * The rules mirror the CN surface AST and the menhir grammar:
 * - cerberus/frontend/model/cn.lem
 * - cerberus/parsers/c/cn_parser.mly
 *
 * Node names are the AST constructor (or record type) names:
 * - CNExpr_memberof -> expr_memberof,
 * - CN_letResource -> let_resource,
 * - cn_func_spec -> func_spec.
 * Nodes with no AST counterpart take the menhir nonterminal's name the same
 * way.
 *
 * The grammar is meant to be injected into the C grammar on `/*@ ... @*\/`
 * comments, so `cn` accepts any of the five menhir entry points
 * (function spec, loop spec, statements, ghost arguments, top-level
 * definitions) with optional magic-comment delimiters.
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const PREC = {
  LET: -2,
  TERNARY: -1,
  OR: 1,
  IMPLIES: 2,
  AND: 3,
  REL: 4,
  ADD: 5,
  MUL: 6,
  UNARY: 7,
  POSTFIX: 8,
  MEMBER_SHIFT: 9,
};

const BITS_TYPES = ['i8', 'i16', 'i32', 'i64', 'i128', 'u8', 'u16', 'u32', 'u64', 'u128'];

const INTEGER = /(0[xX][0-9a-fA-F]+|0[bB][01]+|[0-9]+)/;

function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)));
}

function commaSep(rule) {
  return optional(commaSep1(rule));
}

function angled(rule) {
  return seq('<', rule, '>');
}

export default grammar({
  name: 'cn',

  word: $ => $.identifier,

  extras: $ => [/\s/, $.comment],

  conflicts: $ => [
    [$.expr_record, $.expr_memberupdates],
  ],

  supertypes: $ => [
    $._expr,
    $._base_type,
    $._statement,
    $._toplevel,
    $._condition,
    $._resource,
    $._pred,
    $._pat,
  ],

  rules: {
    // ------------------------------------------------------------------
    // Entry point: the body of one magic comment.
    // ------------------------------------------------------------------
    cn: $ => choice(
      seq(alias('/*@', $.magic_open), optional($._cn), alias('@*/', $.magic_close)),
      seq(alias('/*$', $.magic_open), optional($._cn), alias('$*/', $.magic_close)),
      optional($._cn),
    ),

    _cn: $ => choice(
      $.func_spec,
      $.inv,
      repeat1($._statement),
      repeat1($._toplevel),
      $.ghost_args
    ),

    // ------------------------------------------------------------------
    // Function specifications (cn_func_spec)
    // ------------------------------------------------------------------
    func_spec: $ => repeat1(choice(
      $.trusted,
      $.accesses,
      $.mk_function,
      $.requires_clauses,
      $.ensures_clauses,
    )),

    trusted: _ => seq('trusted', ';'),

    accesses: $ => seq('accesses', commaSep1($.identifier), ';'),

    mk_function: $ => seq('cn_function', field('name', $.identifier), ';'),

    requires_clauses: $ => seq('requires', optional($.ghost_binders), repeat1($._condition)),

    ensures_clauses: $ => seq('ensures', optional($.ghost_binders), repeat1($._condition)),

    ghost_binders: $ => seq('cn_ghost', commaSep($.arg), ';'),

    // Loop specifications (cn_loop_spec)
    inv: $ => seq('inv', repeat1($._condition)),

    // Ghost arguments at call sites (cn_ghost_args)
    ghost_args: $ => seq(commaSep1($._expr), optional(seq(';', commaSep($.identifier)))),

    // ------------------------------------------------------------------
    // Conditions (cn_condition)
    // ------------------------------------------------------------------
    _condition: $ => choice($.clet_resource, $.clet_expr, $.cconstr),

    clet_resource: $ => seq(
      'take',
      field('name', $.identifier),
      '=',
      field('resource', $._resource),
      ';',
    ),

    clet_expr: $ => seq('let', field('name', $.identifier), '=', field('value', $._expr), ';'),

    cconstr: $ => seq($._assertion, ';'),

    // cn_assertion
    _assertion: $ => choice($.assert_qexp, $._expr_without_let),

    assert_qexp: $ => seq(
      'each',
      '(',
      field('type', $._base_type),
      field('variable', $.identifier),
      ';',
      field('guard', $._expr),
      ')',
      '{',
      field('body', $._expr),
      '}',
    ),

    // ------------------------------------------------------------------
    // Resources (cn_resource, cn_pred)
    // ------------------------------------------------------------------
    _resource: $ => choice($.pred, $.each),

    pred: $ => seq(
      field('predicate', $._pred),
      field('arguments', choice($.argument_list, $.elided_arguments)),
    ),

    each: $ => seq(
      'each',
      '(',
      field('type', $._base_type),
      field('variable', $.identifier),
      ';',
      field('guard', $._expr),
      ')',
      '{',
      field('body', $.pred),
      '}',
    ),

    _pred: $ => choice($.owned, $.block, $.named),

    owned: $ => seq(choice('RW', 'Owned'), optional(field('type', angled($.type_name)))),

    block: $ => seq(choice('W', 'Block'), optional(field('type', angled($.type_name)))),

    named: $ => $.identifier,

    argument_list: $ => seq('(', commaSep($._expr), ')'),

    elided_arguments: _ => seq('(', '...', ')'),

    // ------------------------------------------------------------------
    // Predicate bodies (cn_clauses, cn_clause)
    // ------------------------------------------------------------------
    pred_clauses: $ => seq('{', $._clauses, '}'),

    _clauses: $ => choice($.clause, $.if, $.clause_block),

    clause_block: $ => seq('{', $._clauses, '}'),

    if: $ => seq(
      'if',
      '(',
      field('condition', $._expr),
      ')',
      '{',
      field('consequence', $.clause),
      '}',
      'else',
      field('alternative', choice($.if, $.clause_block)),
    ),

    clause: $ => seq(
      repeat(choice(
        alias($.clet_resource, $.let_resource),
        alias($.clet_expr, $.let_expr),
        $.assert,
      )),
      $.return,
    ),

    assert: $ => seq('assert', '(', $._assertion, ')', ';'),

    return: $ => seq('return', optional(field('value', $._expr)), ';'),

    // ------------------------------------------------------------------
    // Top-level definitions (cn_toplevel_elem)
    // ------------------------------------------------------------------
    _toplevel: $ => choice(
      $.predicate,
      $.function,
      $.lemma,
      $.datatype_definition,
      $.type_synonym,
      $.decl_spec,
    ),

    attrs: $ => seq('[', commaSep($.identifier), ']'),

    predicate: $ => seq(
      'predicate',
      optional($.attrs),
      field('output', choice($._base_type, seq('(', $._base_type, ')'))),
      field('name', $.identifier),
      field('parameters', $.args),
      optional(field('body', $.pred_clauses)),
    ),

    function: $ => seq(
      'function',
      optional($.attrs),
      '(',
      field('return_type', $._base_type),
      ')',
      field('name', $.identifier),
      field('parameters', $.args),
      optional(field('body', $.func_body)),
    ),

    func_body: $ => seq('{', $._expr, '}'),

    lemma: $ => seq(
      'lemma',
      field('name', $.identifier),
      field('parameters', $.args),
      $.requires_clauses,
      $.ensures_clauses,
    ),

    datatype_definition: $ => seq(
      'datatype',
      field('name', $.identifier),
      '{',
      commaSep($.cons_case),
      '}',
    ),

    cons_case: $ => seq(field('name', $.identifier), '{', commaSep($.arg), '}'),

    type_synonym: $ => seq(
      'type_synonym',
      field('name', $.identifier),
      '=',
      field('type', choice($._base_type, seq('(', $._base_type, ')'))),
    ),

    decl_spec: $ => seq(
      'spec',
      field('name', $.identifier),
      field('parameters', $.args),
      ';',
      optional($.func_spec),
    ),

    args: $ => seq('(', commaSep($.arg), ')'),

    arg: $ => seq(field('type', $._base_type), field('name', $.identifier)),

    // ------------------------------------------------------------------
    // CN base types (cn_base_type)
    // ------------------------------------------------------------------
    _base_type: $ => choice($._base_type_explicit, $.user_type_name),

    _base_type_explicit: $ => choice(
      $.unit,
      $.bool,
      $.integer,
      $.bits,
      $.real,
      $.loc,
      $.alloc_id,
      $.record,
      $.struct,
      $.datatype,
      $.map,
      $.list,
      $.tuple,
      $.set,
    ),

    unit: _ => 'void',
    bool: _ => 'boolean',
    integer: _ => 'integer',
    bits: _ => choice(...BITS_TYPES),
    real: _ => 'real',
    loc: _ => 'pointer',
    alloc_id: _ => 'alloc_id',
    record: $ => seq('{', commaSep1($.arg), '}'),
    struct: $ => seq('struct', field('tag', $.identifier)),
    datatype: $ => seq('datatype', field('name', $.identifier)),
    map: $ => seq('map', '<', field('key', $._base_type), ',', field('value', $._base_type), '>'),
    list: $ => seq('cn_list', angled(field('element', $._base_type))),
    tuple: $ => seq('cn_tuple', '<', commaSep($._base_type), '>'),
    set: $ => seq('cn_set', angled(field('element', $._base_type))),
    user_type_name: $ => $.identifier,

    // ------------------------------------------------------------------
    // C type names (the `ctype` nonterminal: a C type_name)
    // ------------------------------------------------------------------
    type_name: $ => seq(
      repeat1(choice($._type_specifier, $.type_qualifier)),
      optional($._abstract_declarator),
    ),

    _type_specifier: $ => choice(
      $.primitive_type,
      $.struct_specifier,
      $.union_specifier,
      $.enum_specifier,
      alias($.identifier, $.type_identifier),
    ),

    primitive_type: _ => choice(
      'void', '_Bool', 'char', 'short', 'int', 'long',
      'float', 'double', 'signed', 'unsigned', '_Complex',
    ),

    type_qualifier: _ => choice('const', 'restrict', 'volatile', '_Atomic'),

    struct_specifier: $ => seq('struct', field('tag', $.identifier)),
    union_specifier: $ => seq('union', field('tag', $.identifier)),
    enum_specifier: $ => seq('enum', field('tag', $.identifier)),

    _abstract_declarator: $ => choice($.abstract_pointer_declarator, $._direct_abstract_declarator),

    abstract_pointer_declarator: $ => seq(
      '*',
      repeat($.type_qualifier),
      optional($._abstract_declarator),
    ),

    _direct_abstract_declarator: $ => choice(
      $.abstract_parenthesized_declarator,
      $.abstract_array_declarator,
      $.abstract_function_declarator,
    ),

    abstract_parenthesized_declarator: $ => seq('(', $._abstract_declarator, ')'),

    abstract_array_declarator: $ => seq(
      optional($._direct_abstract_declarator),
      '[',
      repeat($.type_qualifier),
      optional(field('size', choice($.const_integer, $.identifier))),
      ']',
    ),

    abstract_function_declarator: $ => seq(
      optional($._direct_abstract_declarator),
      '(',
      commaSep($.parameter_declaration),
      optional(seq(',', '...')),
      ')',
    ),

    parameter_declaration: $ => seq(
      repeat1(choice(
        $._type_specifier,
        $.type_qualifier,
        $.storage_class_specifier,
        $.function_specifier,
      )),
      optional($._abstract_declarator),
    ),

    storage_class_specifier: _ => choice(
      'typedef', 'extern', 'static', '_Thread_local', 'auto', 'register',
    ),

    function_specifier: _ => choice('inline', '_Noreturn'),

    // ------------------------------------------------------------------
    // Expressions (cn_expr)
    // ------------------------------------------------------------------
    _expr: $ => choice($._expr_without_let, $.expr_let),

    _expr_without_let: $ => choice(
      // primaries
      $.identifier,
      alias('return', $.identifier),
      $.const_null,
      $.const_bool,
      $.const_integer,
      $.const_bits,
      $.floating_const,
      $.character_const,
      $.parenthesized_expression,
      $.expr_memberof,
      $.expr_arrow,
      $.expr_array_shift,
      $.expr_membershift,
      $.expr_call,
      $.expr_good,
      $.expr_cons,
      $.expr_map_get,
      $.expr_arrayindexupdates,
      $.expr_at_env,
      $.expr_struct,
      $.expr_record,
      $.expr_memberupdates,
      $.expr_default,
      // unary
      $.expr_deref,
      $.expr_sizeof,
      $.expr_offsetof,
      $.expr_unchanged,
      $.expr_negate,
      $.expr_not,
      $.expr_bnot,
      $.expr_addr,
      $.expr_cast,
      // binary and above
      $.expr_binop,
      $.expr_list,
      $.expr_ite,
      $.expr_each,
      $.expr_match,
    ),

    const_null: _ => 'NULL',

    const_bool: _ => choice('true', 'false'),

    parenthesized_expression: $ => seq('(', $._expr, ')'),

    expr_memberof: $ => prec.left(PREC.POSTFIX, seq(
      field('object', $._expr_without_let),
      '.',
      field('member', $.identifier),
    )),

    expr_arrow: $ => prec.left(PREC.POSTFIX, seq(
      field('object', $._expr_without_let),
      '->',
      field('member', $.identifier),
    )),

    expr_array_shift: $ => seq(
      'array_shift',
      optional(field('type', angled($.type_name))),
      '(',
      field('base', $._expr),
      ',',
      field('index', $._expr),
      ')',
    ),

    expr_membershift: $ => choice(
      seq(
        'member_shift',
        optional(field('type', angled($.type_name))),
        '(',
        field('base', $._expr),
        ',',
        field('member', $.identifier),
        ')',
      ),
      prec(PREC.MEMBER_SHIFT, seq(
        '&',
        '(',
        field('base', $._expr_without_let),
        '->',
        field('member', $.identifier),
        ')',
      )),
    ),

    expr_call: $ => seq(field('function', $.identifier), field('arguments', $.argument_list)),

    expr_good: $ => seq(
      'good',
      field('type', angled($.type_name)),
      '(',
      field('argument', $._expr),
      ')',
    ),

    expr_cons: $ => seq(field('constructor', $.identifier), '{', commaSep($.member_def), '}'),

    expr_map_get: $ => prec.left(PREC.POSTFIX, seq(
      field('map', $._expr_without_let),
      '[',
      field('key', $._expr),
      ']',
    )),

    expr_arrayindexupdates: $ => prec.left(PREC.POSTFIX, seq(
      field('map', $._expr_without_let),
      '[',
      commaSep1($.index_update),
      ']',
    )),

    index_update: $ => seq(field('key', $._expr_without_let), ':', field('value', $._expr)),

    expr_at_env: $ => seq(
      '{',
      field('expression', $._expr),
      '}',
      choice('%', '@'), // `@start` is legacy syntax; CN rewrites it to `%start` before lexing
      field('label', $.identifier),
    ),

    expr_struct: $ => seq('struct', field('tag', $.identifier), '{', commaSep1($.member_def), '}'),

    expr_record: $ => seq('{', commaSep1($.member_def), '}'),

    expr_memberupdates: $ => seq(
      '{',
      repeat1(seq($.member_def, ',')),
      '..',
      field('base', $._expr),
      '}',
    ),

    member_def: $ => seq(field('member', $.identifier), ':', field('value', $._expr)),

    expr_default: $ => seq('default', angled(field('type', $._base_type))),

    expr_deref: $ => prec(PREC.UNARY, seq('*', field('pointer', $._expr_without_let))),

    expr_sizeof: $ => seq('sizeof', angled(field('type', $.type_name))),

    expr_offsetof: $ => seq(
      'offsetof',
      '(',
      field('tag', $.identifier),
      ',',
      field('member', $.identifier),
      ')',
    ),

    expr_unchanged: $ => seq('{', field('expression', $._expr), '}', 'unchanged'),

    expr_negate: $ => prec(PREC.UNARY, seq('-', field('operand', $._expr_without_let))),

    expr_not: $ => prec(PREC.UNARY, seq('!', field('operand', $._expr_without_let))),

    expr_bnot: $ => prec(PREC.UNARY, seq('~', field('operand', $._expr_without_let))),

    expr_addr: $ => seq('&', field('variable', $.identifier)),

    expr_cast: $ => prec(PREC.UNARY, seq(
      '(',
      field('type', $._base_type_explicit),
      ')',
      field('operand', $._expr_without_let),
    )),

    expr_binop: $ => {
      const table = [
        [PREC.MUL, choice('*', '/', '%', '&', '^')],
        [PREC.ADD, choice('+', '-', '|')],
        [PREC.REL, choice('==', '!=', '<', '>', '<=', '>=')],
        [PREC.AND, '&&'],
        [PREC.OR, '||'],
      ];
      return choice(
        ...table.map(([precedence, operator]) => prec.left(precedence, seq(
          field('left', $._expr_without_let),
          field('operator', operator),
          field('right', $._expr_without_let),
        ))),
        prec.right(PREC.IMPLIES, seq(
          field('left', $._expr_without_let),
          field('operator', 'implies'),
          field('right', $._expr_without_let),
        )),
      );
    },

    expr_list: $ => seq('[', commaSep1($._expr_without_let), ']'),

    expr_ite: $ => choice(
      prec.right(PREC.TERNARY, seq(
        field('condition', $._expr_without_let),
        '?',
        field('consequence', $._expr_without_let),
        ':',
        field('alternative', $._expr_without_let),
      )),
      seq(
        'if',
        '(',
        field('condition', $._expr),
        ')',
        '{',
        field('consequence', $._expr),
        '}',
        'else',
        '{',
        field('alternative', $._expr),
        '}',
      ),
    ),

    expr_each: $ => seq(
      'each',
      '(',
      field('type', $._base_type),
      field('variable', $.identifier),
      ':',
      field('lower', $.const_integer),
      ',',
      field('upper', $.const_integer),
      ';',
      field('body', $._expr),
      ')',
    ),

    expr_match: $ => seq(
      'match',
      field('target', choice($.identifier, $.parenthesized_expression)),
      '{',
      repeat1($.match_case),
      '}',
    ),

    match_case: $ => seq(field('pattern', $._pat), '=>', '{', field('body', $._expr), '}'),

    expr_let: $ => prec.right(PREC.LET, seq(
      'let',
      field('name', $.identifier),
      '=',
      field('value', $._expr),
      ';',
      field('body', $._expr),
    )),

    // Patterns (cn_pat)
    _pat: $ => choice($.pat_wild, $.identifier, $.pat_constructor),

    pat_wild: _ => '_',

    pat_constructor: $ => seq(
      field('constructor', $.identifier),
      '{',
      commaSep($.pattern_member_def),
      '}',
    ),

    pattern_member_def: $ => seq(field('member', $.identifier), ':', field('pattern', $._pat)),

    // ------------------------------------------------------------------
    // Proof-guidance statements (cn_statement)
    // ------------------------------------------------------------------
    _statement: $ => choice(
      $.pack_unpack,
      $.derive_constraints,
      $.to_from_bytes,
      $.have,
      $.extract,
      $.instantiate,
      $.split_case,
      $.unfold,
      $.apply,
      $.assert_stmt,
      $.inline,
      $.print,
    ),

    pack_unpack: $ => seq(field('direction', choice('pack', 'unpack')), $.pred, ';'),

    derive_constraints: $ => seq('derive_constraints', '(', commaSep($.pred), ')', ';'),

    to_from_bytes: $ => seq(field('direction', choice('to_bytes', 'from_bytes')), $.pred, ';'),

    have: $ => seq('cn_have', $._assertion, ';'),

    extract: $ => seq(
      choice('focus', 'extract'),
      optional(seq(field('predicate', $._pred), ',')),
      field('index', $._expr),
      ';',
    ),

    instantiate: $ => seq(
      'instantiate',
      optional(choice(
        seq(field('function', $.identifier), ','),
        seq('good', field('type', angled($.type_name)), ','),
      )),
      field('argument', $._expr),
      ';',
    ),

    split_case: $ => seq('split_case', $._assertion, ';'),

    unfold: $ => seq(
      'unfold',
      field('function', $.identifier),
      field('arguments', $.argument_list),
      ';',
    ),

    apply: $ => seq(
      'apply',
      field('lemma', $.identifier),
      field('arguments', $.argument_list),
      ';',
    ),

    assert_stmt: $ => seq('assert', '(', $._assertion, ')', ';'),

    inline: $ => seq('inline', commaSep($.identifier), ';'),

    print: $ => seq('cn_print', '(', $._expr, ')', ';'),

    // ------------------------------------------------------------------
    // Lexical
    // ------------------------------------------------------------------
    identifier: _ => /[A-Za-z_][A-Za-z0-9_]*/,

    const_integer: _ => token(seq(
      INTEGER,
      optional(choice(/[uU](ll|LL|l|L)?/, /(ll|LL|l|L)[uU]?/)),
    )),

    const_bits: _ => token(seq(INTEGER, /[iu](8|16|32|64|128)/)),

    floating_const: _ => token(choice(
      /([0-9]+\.[0-9]*|\.[0-9]+)([eE][+-]?[0-9]+)?[fFlL]?/,
      /[0-9]+[eE][+-]?[0-9]+[fFlL]?/,
      /0[xX]([0-9a-fA-F]+\.?[0-9a-fA-F]*|\.[0-9a-fA-F]+)[pP][+-]?[0-9]+[fFlL]?/,
    )),

    character_const: _ => token(/[LuU]?'([^'\\\n]|\\.)+'/),

    comment: _ => token(choice(
      seq('//', /[^\n]*/),
      /\/\*\*+\//,
      /\/\*([^*@$]|\*+[^*\/])([^*]|\*+[^*\/])*\*+\//,
    )),
  },
});
