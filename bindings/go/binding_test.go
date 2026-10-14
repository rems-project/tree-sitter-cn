package tree_sitter_cn_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_cn "github.com/rems-project/tree-sitter-cn/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_cn.Language())
	if language == nil {
		t.Errorf("Error loading CN grammar")
	}
}
