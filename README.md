CN grammar for [tree-sitter]. Based on [Cerberus]
([a963cb0](https://github.com/kmemarian/cerberus/commit/a963cb0af7eeb0bcaa134e43d07649635659038f)).

No promises about it being up-to-date with the upstream grammar.

[tree-sitter]: https://github.com/tree-sitter/tree-sitter
[Cerberus]: https://github.com/rems-project/cerberus/

## Queries

Highlights follow the [nvim-treesitter capture names].

[nvim-treesitter capture names]: https://github.com/nvim-treesitter/nvim-treesitter/blob/main/CONTRIBUTING.md#highlights

The grammar is not stand-alone, but intended to be injected into C. Add the
following into `queries/c/injections.scm`, under a path that your editor or
other tool recognises:

```scheme
((comment) @injection.content
  (#match? @injection.content "^/\\*[@$]")
  (#set! injection.language "cn"))
```
