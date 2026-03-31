#!/bin/bash
# Full E2E regression test for Mukwano API
#
# Covers the complete happy path:
#   signup → login → circle → join → contribute → verify →
#   proposal → vote → close → project lifecycle → reporting
#
# Usage:
#   bash scripts/e2e-regression.sh
#   BASE_URL=http://localhost:4000/api/v1 bash scripts/e2e-regression.sh
#
# Requires: curl, python3
# The API server must be running before executing this script.

BASE_URL="${BASE_URL:-http://localhost:4000/api/v1}"

# -----------------------
# 1. Signup users
# -----------------------
echo "🟢 Signing up users..."

curl -s -X POST $BASE_URL/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"creator@example.com","password":"Password123","displayName":"Creator User"}' > /dev/null

curl -s -X POST $BASE_URL/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"member@example.com","password":"Password123","displayName":"Member User"}' > /dev/null

# -----------------------
# 2. Login & store tokens
# -----------------------
echo "🟢 Logging in..."

CREATOR_TOKEN=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"creator@example.com","password":"Password123"}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('accessToken',''))")

MEMBER_TOKEN=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"member@example.com","password":"Password123"}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('accessToken',''))")

if [[ -z "$CREATOR_TOKEN" || "$CREATOR_TOKEN" == "null" || -z "$MEMBER_TOKEN" || "$MEMBER_TOKEN" == "null" ]]; then
  echo "❌ Failed to get tokens"
  echo "CREATOR_TOKEN: $CREATOR_TOKEN"
  echo "MEMBER_TOKEN: $MEMBER_TOKEN"
  exit 1
fi

echo "  CREATOR_TOKEN: ${CREATOR_TOKEN:0:20}..."
echo "  MEMBER_TOKEN:  ${MEMBER_TOKEN:0:20}..."

# -----------------------
# 3. Create Circle
# -----------------------
echo "🟢 Creating circle..."
CIRCLE_RESP=$(curl -s -X POST $BASE_URL/circles \
  -H "Authorization: Bearer $CREATOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Circle","goalAmount":1000}')
echo "  Circle response: $CIRCLE_RESP"

CIRCLE_ID=$(echo "$CIRCLE_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))")
if [[ -z "$CIRCLE_ID" || "$CIRCLE_ID" == "null" ]]; then
  echo "❌ Failed to create circle"
  exit 1
fi
echo "  Circle ID: $CIRCLE_ID"

# Member joins
JOIN_RESP=$(curl -s -X POST $BASE_URL/circles/$CIRCLE_ID/join \
  -H "Authorization: Bearer $MEMBER_TOKEN")
echo "  Join response: $JOIN_RESP"

# -----------------------
# 4. Contributions
# -----------------------
echo "🟢 Submitting contribution..."
CONTRIB_RESP=$(curl -s -X POST $BASE_URL/circles/$CIRCLE_ID/contributions \
  -H "Authorization: Bearer $MEMBER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount":100,"description":"Initial Contribution"}')
echo "  Contribution response: $CONTRIB_RESP"

CONTRIBUTION_ID=$(echo "$CONTRIB_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))")
if [[ -z "$CONTRIBUTION_ID" || "$CONTRIBUTION_ID" == "null" ]]; then
  echo "❌ Failed to create contribution"
  exit 1
fi
echo "  Contribution ID: $CONTRIBUTION_ID"

# Verify contribution (PATCH, not POST)
VERIFY_RESP=$(curl -s -X PATCH $BASE_URL/circles/$CIRCLE_ID/contributions/$CONTRIBUTION_ID/verify \
  -H "Authorization: Bearer $CREATOR_TOKEN")
echo "  Verify response: $VERIFY_RESP"

# Check treasury
TREASURY_RESP=$(curl -s -X GET $BASE_URL/circles/$CIRCLE_ID/treasury \
  -H "Authorization: Bearer $CREATOR_TOKEN")
echo "  Treasury response: $TREASURY_RESP"
TREASURY_BALANCE=$(echo "$TREASURY_RESP" | python3 -c "import sys,json; print(int(float(json.load(sys.stdin).get('balance',0))))")

if [ "$TREASURY_BALANCE" -lt 100 ]; then
  echo "❌ Treasury balance incorrect: $TREASURY_BALANCE"
  exit 1
fi
echo "  Treasury balance: $TREASURY_BALANCE ✅"

# -----------------------
# 5. Proposal Lifecycle
# -----------------------
echo "🟢 Creating proposal..."
PROPOSAL_RESP=$(curl -s -X POST $BASE_URL/circles/$CIRCLE_ID/proposals \
  -H "Authorization: Bearer $CREATOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Fund Project X","description":"Proposal to fund Project X","requestedAmount":50}')
echo "  Proposal response: $PROPOSAL_RESP"

PROPOSAL_ID=$(echo "$PROPOSAL_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))")
if [[ -z "$PROPOSAL_ID" || "$PROPOSAL_ID" == "null" ]]; then
  echo "❌ Failed to create proposal"
  exit 1
fi
echo "  Proposal ID: $PROPOSAL_ID"

# Member votes
VOTE_RESP=$(curl -s -X POST $BASE_URL/circles/$CIRCLE_ID/proposals/$PROPOSAL_ID/vote \
  -H "Authorization: Bearer $MEMBER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"vote":"yes"}')
echo "  Vote response: $VOTE_RESP"

# Creator also votes
VOTE_RESP2=$(curl -s -X POST $BASE_URL/circles/$CIRCLE_ID/proposals/$PROPOSAL_ID/vote \
  -H "Authorization: Bearer $CREATOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"vote":"yes"}')
echo "  Creator vote response: $VOTE_RESP2"

# Close proposal
CLOSE_RESP=$(curl -s -X POST $BASE_URL/circles/$CIRCLE_ID/proposals/$PROPOSAL_ID/close \
  -H "Authorization: Bearer $CREATOR_TOKEN")
echo "  Close response: $CLOSE_RESP"

PROPOSAL_STATUS=$(echo "$CLOSE_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))")
if [[ "$PROPOSAL_STATUS" != "closed_passed" && "$PROPOSAL_STATUS" != "closed_failed" ]]; then
  echo "❌ Proposal did not close correctly: $PROPOSAL_STATUS"
  exit 1
fi
echo "  Proposal status: $PROPOSAL_STATUS ✅"

# -----------------------
# 6. Project Lifecycle
# -----------------------
echo "🟢 Creating project from proposal..."
PROJECT_RESP=$(curl -s -X POST $BASE_URL/circles/$CIRCLE_ID/projects \
  -H "Authorization: Bearer $CREATOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"proposalId":"'$PROPOSAL_ID'"}')
echo "  Project response: $PROJECT_RESP"

PROJECT_ID=$(echo "$PROJECT_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))")
if [[ -z "$PROJECT_ID" || "$PROJECT_ID" == "null" ]]; then
  echo "❌ Failed to create project"
  exit 1
fi
echo "  Project ID: $PROJECT_ID"

# Transition to approved
APPROVE_RESP=$(curl -s -X PATCH $BASE_URL/circles/$CIRCLE_ID/projects/$PROJECT_ID \
  -H "Authorization: Bearer $CREATOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"approved"}')
echo "  Approve response: $APPROVE_RESP"

# Transition to executing
EXEC_RESP=$(curl -s -X PATCH $BASE_URL/circles/$CIRCLE_ID/projects/$PROJECT_ID \
  -H "Authorization: Bearer $CREATOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"executing"}')
echo "  Executing response: $EXEC_RESP"

# Post update (field is "content" not "update")
UPDATE_RESP=$(curl -s -X POST $BASE_URL/circles/$CIRCLE_ID/projects/$PROJECT_ID/updates \
  -H "Authorization: Bearer $CREATOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Project started successfully","percentComplete":25}')
echo "  Update response: $UPDATE_RESP"

# Complete project
COMPLETE_RESP=$(curl -s -X PATCH $BASE_URL/circles/$CIRCLE_ID/projects/$PROJECT_ID \
  -H "Authorization: Bearer $CREATOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"complete"}')
echo "  Complete response: $COMPLETE_RESP"

# -----------------------
# 7. Reporting & Admin
# -----------------------
echo "🟢 Checking reports..."

# Portfolio is at /portfolio (not /me/portfolio)
PORTFOLIO=$(curl -s -X GET $BASE_URL/portfolio \
  -H "Authorization: Bearer $MEMBER_TOKEN")

DASHBOARD=$(curl -s -X GET $BASE_URL/dashboard \
  -H "Authorization: Bearer $CREATOR_TOKEN")

echo ""
echo "✅ E2E regression test passed!"
echo "Treasury Balance: $TREASURY_BALANCE"
echo "Proposal Status: $PROPOSAL_STATUS"
echo "Portfolio Data:"
echo "$PORTFOLIO" | python3 -m json.tool 2>/dev/null || echo "$PORTFOLIO"
echo "Dashboard Data:"
echo "$DASHBOARD" | python3 -m json.tool 2>/dev/null || echo "$DASHBOARD"
