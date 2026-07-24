#!/usr/bin/env bash
set -euo pipefail
GH=/opt/homebrew/bin/gh
R=Mournerliao/asterism
D=/Users/asherliao/Projects/asterism/.scratch/retrieval-first

echo "TICKET1"
"$GH" issue create --repo "$R" --label ready-for-agent \
  --title "检索优先 · Embeddings 表与 owner-only 写入地基" \
  --body-file "$D/01-embeddings-foundation.md"

echo "TICKET2"
"$GH" issue create --repo "$R" --label ready-for-agent \
  --title "检索优先 · 浏览器内 embedding 运行时与全库回填" \
  --body-file "$D/02-embedding-runtime-backfill.md"

echo "TICKET3"
"$GH" issue create --repo "$R" --label ready-for-agent \
  --title "检索优先 · 隐形混合搜索" \
  --body-file "$D/03-invisible-hybrid-search.md"

echo "TICKET4"
"$GH" issue create --repo "$R" --label ready-for-agent \
  --title "检索优先 · 石墨语义星图（列表的第二视图）" \
  --body-file "$D/04-graphite-semantic-star-map.md"

echo "TICKET5"
"$GH" issue create --repo "$R" --label ready-for-agent \
  --title "检索优先 · 涌现簇与 promotion（双平面唯一写入桥）" \
  --body-file "$D/05-emergent-clusters-promotion.md"

echo "DONE"
