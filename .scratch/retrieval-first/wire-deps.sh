#!/usr/bin/env bash
set -euo pipefail
GH=/opt/homebrew/bin/gh
OWNER=Mournerliao
NAME=asterism

id() { "$GH" api graphql -f query="{ repository(owner:\"$OWNER\", name:\"$NAME\"){ issue(number:$1){ id } } }" --jq '.data.repository.issue.id'; }

I18=$(id 18); I19=$(id 19); I20=$(id 20); I21=$(id 21); I22=$(id 22)

echo "== creating native blocked-by edges =="
"$GH" api graphql \
  -f i18="$I18" -f i19="$I19" -f i20="$I20" -f i21="$I21" -f i22="$I22" \
  -f query='mutation($i18:ID!,$i19:ID!,$i20:ID!,$i21:ID!,$i22:ID!){
    e1: addBlockedBy(input:{issueId:$i19, blockingIssueId:$i18}){ issue{number} blockingIssue{number} }
    e2: addBlockedBy(input:{issueId:$i20, blockingIssueId:$i19}){ issue{number} blockingIssue{number} }
    e3: addBlockedBy(input:{issueId:$i21, blockingIssueId:$i19}){ issue{number} blockingIssue{number} }
    e4: addBlockedBy(input:{issueId:$i22, blockingIssueId:$i19}){ issue{number} blockingIssue{number} }
    e5: addBlockedBy(input:{issueId:$i22, blockingIssueId:$i21}){ issue{number} blockingIssue{number} }
  }' --jq '.data | to_entries[] | "\(.key): #\(.value.issue.number) blocked-by #\(.value.blockingIssue.number)"'

echo "== verify blockedBy per issue =="
"$GH" api graphql -f query="{ repository(owner:\"$OWNER\", name:\"$NAME\"){
  a18: issue(number:18){ number blockedBy(first:10){ nodes{ number } } }
  a19: issue(number:19){ number blockedBy(first:10){ nodes{ number } } }
  a20: issue(number:20){ number blockedBy(first:10){ nodes{ number } } }
  a21: issue(number:21){ number blockedBy(first:10){ nodes{ number } } }
  a22: issue(number:22){ number blockedBy(first:10){ nodes{ number } } }
} }" --jq '.data.repository | to_entries[] | "#\(.value.number) blockedBy: \(.value.blockedBy.nodes | map("#\(.number)") | join(", ") | if . == "" then "(none)" else . end)"'

echo "DONE"
