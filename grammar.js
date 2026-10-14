/**
 * @file Tree-sitter grammar for CN, the separation-logic specification language for C
 * @author RE Ltd
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

export default grammar({
  name: "cn",

  rules: {
    // TODO: add the actual grammar rules
    source_file: $ => "hello"
  }
});
