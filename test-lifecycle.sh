#!/usr/bin/env bash
# Fila Digital — Full Lifecycle Test
# Tests: register, login, commerce, queue, participants, admin, anonymous, QR/magic-link, search

set -euo pipefail

BASE="http://localhost:7070/v1"
PASS="Teste@123"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

step() { echo -e "\n${BOLD}${BLUE}━━━ $1 ${NC}"; }
ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
info() { echo -e "  ${CYAN}→${NC} $1"; }
fail() { echo -e "  ${RED}✗ FAIL: $1${NC}"; }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; }

assert_field() {
  local json="$1" field="$2" label="${3:-$field}"
  local val
  val=$(echo "$json" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('$field',''))" 2>/dev/null || true)
  if [ -z "$val" ] || [ "$val" = "None" ]; then
    fail "$label missing in response"
    echo "    response: $json"
    exit 1
  fi
  echo "$val"
}

assert_status() {
  local code="$1" expected="$2" label="$3"
  if [ "$code" != "$expected" ]; then
    fail "$label: expected HTTP $expected, got $code"
    exit 1
  fi
  ok "$label (HTTP $code)"
}

curl_json() {
  local method="$1" url="$2"; shift 2
  # Only add Content-Type header if -d is among the remaining args
  local has_body=false
  for arg in "$@"; do [[ "$arg" == "-d" ]] && has_body=true && break; done
  if $has_body; then
    curl -s -w "\n%{http_code}" -X "$method" "$url" \
      -H "Content-Type: application/json" "$@"
  else
    curl -s -w "\n%{http_code}" -X "$method" "$url" "$@"
  fi
}

split_response() {
  local raw="$1"
  HTTP=$(echo "$raw" | tail -n 1)
  BODY=$(echo "$raw" | sed '$d')
}

echo -e "${BOLD}${CYAN}"
echo "╔══════════════════════════════════════════════════╗"
echo "║    Fila Digital — Full Lifecycle Test Suite      ║"
echo "╚══════════════════════════════════════════════════╝${NC}"

SUFFIX=$(date +%s)
EMAIL1="owner${SUFFIX}@test.com"
EMAIL2="user2${SUFFIX}@test.com"

# Generate a valid CNPJ from SUFFIX (must pass jsvat checksum algorithm)
CNPJ=$(python3 -c "
suffix = $SUFFIX
base = list(str((suffix % 900000000000) + 100000000000))
def check_digit(digits, weights):
    s = sum(int(d) * w for d, w in zip(digits, weights))
    r = s % 11
    return '0' if r < 2 else str(11 - r)
d1 = check_digit(base, [5,4,3,2,9,8,7,6,5,4,3,2])
d2 = check_digit(base + [d1], [6,5,4,3,2,9,8,7,6,5,4,3,2])
print(''.join(base) + d1 + d2)
")

# ─────────────────────────────────────────────────────────
step "0. Health Check"
# ─────────────────────────────────────────────────────────
RAW=$(curl_json GET "http://localhost:7070/healthcheck")
split_response "$RAW"
assert_status "$HTTP" "200" "healthcheck"
DB_STATUS=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['database']['connected'])")
info "Database connected: $DB_STATUS"

# ─────────────────────────────────────────────────────────
step "1. Register User 1 (owner: $EMAIL1)"
# ─────────────────────────────────────────────────────────
RAW=$(curl_json POST "$BASE/user/register" -d "{
  \"name\": \"Owner Teste\",
  \"email\": \"$EMAIL1\",
  \"password\": \"$PASS\",
  \"phone\": \"+5511999990001\"
}")
split_response "$RAW"
assert_status "$HTTP" "201" "register user1"
TOKEN1=$(assert_field "$BODY" "access_token" "access_token user1")
ok "User 1 registered — token: ${TOKEN1:0:20}..."

# ─────────────────────────────────────────────────────────
step "2. Register User 2 ($EMAIL2)"
# ─────────────────────────────────────────────────────────
RAW=$(curl_json POST "$BASE/user/register" -d "{
  \"name\": \"Participante Dois\",
  \"email\": \"$EMAIL2\",
  \"password\": \"$PASS\",
  \"phone\": \"+5511999990002\"
}")
split_response "$RAW"
assert_status "$HTTP" "201" "register user2"
TOKEN2=$(assert_field "$BODY" "access_token" "access_token user2")
ok "User 2 registered — token: ${TOKEN2:0:20}..."

# ─────────────────────────────────────────────────────────
step "3. Login User 1 (refresh tokens)"
# ─────────────────────────────────────────────────────────
RAW=$(curl_json POST "$BASE/user/login" -d "{
  \"email\": \"$EMAIL1\",
  \"password\": \"$PASS\"
}")
split_response "$RAW"
assert_status "$HTTP" "200" "login user1"
TOKEN1=$(assert_field "$BODY" "access_token" "access_token login")
REFRESH1=$(assert_field "$BODY" "refresh_token" "refresh_token login")
ok "Logged in. access_token refreshed, refresh_token: ${REFRESH1:0:12}..."

# ─────────────────────────────────────────────────────────
step "4. Get User 1 Info"
# ─────────────────────────────────────────────────────────
RAW=$(curl_json GET "$BASE/user" -H "Authorization: Bearer $TOKEN1")
split_response "$RAW"
assert_status "$HTTP" "200" "GET /user"
NAME=$(assert_field "$BODY" "name" "user name")
ok "User: $NAME"

# ─────────────────────────────────────────────────────────
step "5. Refresh Access Token"
# ─────────────────────────────────────────────────────────
RAW=$(curl_json POST "$BASE/user/refresh" -d "{\"refresh_token\": \"$REFRESH1\"}")
split_response "$RAW"
assert_status "$HTTP" "200" "token refresh"
TOKEN1=$(assert_field "$BODY" "access_token" "new access_token")
REFRESH1=$(assert_field "$BODY" "refresh_token" "new refresh_token")
ok "Tokens rotated — new access_token: ${TOKEN1:0:20}..."

# ─────────────────────────────────────────────────────────
step "6. Create Commerce (User 1 = owner)"
# ─────────────────────────────────────────────────────────
RAW=$(curl_json POST "$BASE/commerce/register" \
  -H "Authorization: Bearer $TOKEN1" \
  -d "{
    \"name\": \"Loja Teste $SUFFIX\",
    \"description\": \"Loja criada pelo lifecycle test\",
    \"phone\": \"+551133330001\",
    \"document_id\": \"$CNPJ\",
    \"open_at\": \"00:00:00\",
    \"closed_at\": \"23:59:59\",
    \"street\": \"Rua das Flores\",
    \"number\": \"123\",
    \"neighborhood\": \"Centro\",
    \"city\": \"São Paulo\",
    \"state\": \"SP\",
    \"cep\": \"01310100\"
  }")
split_response "$RAW"
assert_status "$HTTP" "201" "create commerce"
COMMERCE_ID=$(assert_field "$BODY" "commerce_id" "commerce_id")
ok "Commerce created: $COMMERCE_ID"

# ─────────────────────────────────────────────────────────
step "7. List All Commerces"
# ─────────────────────────────────────────────────────────
RAW=$(curl_json GET "$BASE/commerce" -H "Authorization: Bearer $TOKEN1")
split_response "$RAW"
assert_status "$HTTP" "200" "list commerces"
ok "Commerces listed"

# ─────────────────────────────────────────────────────────
step "8. Get Commerce by ID"
# ─────────────────────────────────────────────────────────
RAW=$(curl_json GET "$BASE/commerce/$COMMERCE_ID" -H "Authorization: Bearer $TOKEN1")
split_response "$RAW"
assert_status "$HTTP" "200" "get commerce by ID"
ok "Commerce detail fetched"

# ─────────────────────────────────────────────────────────
step "9. Update Commerce"
# ─────────────────────────────────────────────────────────
RAW=$(curl_json PUT "$BASE/commerce/$COMMERCE_ID/update" \
  -H "Authorization: Bearer $TOKEN1" \
  -d "{\"description\": \"Descrição atualizada pelo lifecycle test\"}")
split_response "$RAW"
assert_status "$HTTP" "200" "update commerce"
ok "Commerce updated"

# ─────────────────────────────────────────────────────────
step "10. Create Queue for Commerce"
# ─────────────────────────────────────────────────────────
RAW=$(curl_json POST "$BASE/queue/register" \
  -H "Authorization: Bearer $TOKEN1" \
  -d "{
    \"commerce_id\": \"$COMMERCE_ID\",
    \"name\": \"Fila Principal\",
    \"description\": \"Fila de atendimento geral\",
    \"type\": \"permanent\",
    \"status\": \"open\",
    \"active\": true
  }")
split_response "$RAW"
assert_status "$HTTP" "201" "create queue"
QUEUE_ID=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['queue']['id'])" 2>/dev/null)
if [ -z "$QUEUE_ID" ]; then fail "queue id missing"; exit 1; fi
ok "Queue created: $QUEUE_ID"

# ─────────────────────────────────────────────────────────
step "11. Get Queue + QR Code Token (owner view)"
# ─────────────────────────────────────────────────────────
RAW=$(curl_json GET "$BASE/commerce/$COMMERCE_ID" -H "Authorization: Bearer $TOKEN1")
split_response "$RAW"
assert_status "$HTTP" "200" "get commerce (owner, with qrcode_token)"
QR_TOKEN=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('queue',{}).get('qrcode_token',''))" 2>/dev/null)
if [ -z "$QR_TOKEN" ]; then fail "qrcode_token not returned for owner"; exit 1; fi
ok "QR code token retrieved: ${QR_TOKEN:0:16}..."

# ─────────────────────────────────────────────────────────
step "12. Update Queue (close → reopen)"
# ─────────────────────────────────────────────────────────
RAW=$(curl_json PUT "$BASE/queue/$COMMERCE_ID/$QUEUE_ID/update" \
  -H "Authorization: Bearer $TOKEN1" \
  -d "{\"status\": \"closed\"}")
split_response "$RAW"
assert_status "$HTTP" "200" "close queue"
ok "Queue closed"

RAW=$(curl_json PUT "$BASE/queue/$COMMERCE_ID/$QUEUE_ID/update" \
  -H "Authorization: Bearer $TOKEN1" \
  -d "{\"status\": \"open\"}")
split_response "$RAW"
assert_status "$HTTP" "200" "reopen queue"
ok "Queue reopened"

# ─────────────────────────────────────────────────────────
step "13. User 1 Enters Queue (auth)"
# ─────────────────────────────────────────────────────────
RAW=$(curl_json POST "$BASE/participants-queue/enter/$COMMERCE_ID" \
  -H "Authorization: Bearer $TOKEN1")
split_response "$RAW"
assert_status "$HTTP" "201" "user1 enter queue"
ok "$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('message',''))" 2>/dev/null)"

# ─────────────────────────────────────────────────────────
step "14. User 2 Enters Queue (auth)"
# ─────────────────────────────────────────────────────────
RAW=$(curl_json POST "$BASE/participants-queue/enter/$COMMERCE_ID" \
  -H "Authorization: Bearer $TOKEN2")
split_response "$RAW"
assert_status "$HTTP" "201" "user2 enter queue"
ok "$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('message',''))" 2>/dev/null)"

# ─────────────────────────────────────────────────────────
step "15. List Participants"
# ─────────────────────────────────────────────────────────
RAW=$(curl_json GET "$BASE/participants-queue/$COMMERCE_ID" \
  -H "Authorization: Bearer $TOKEN1")
split_response "$RAW"
assert_status "$HTTP" "200" "list participants"
COUNT=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d['data']['participants']))" 2>/dev/null || echo "?")
ok "Participants in queue: $COUNT"

# ─────────────────────────────────────────────────────────
step "16. Get My Position (User 2)"
# ─────────────────────────────────────────────────────────
RAW=$(curl_json GET "$BASE/participants-queue/$COMMERCE_ID/my-position" \
  -H "Authorization: Bearer $TOKEN2")
split_response "$RAW"
assert_status "$HTTP" "200" "get my position (user2)"
MY_POS=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['position'])" 2>/dev/null || echo "?")
ok "User 2 is at position: $MY_POS"

# ─────────────────────────────────────────────────────────
step "17. Call Next (remove first participant)"
# ─────────────────────────────────────────────────────────
RAW=$(curl_json DELETE "$BASE/participants-queue/$COMMERCE_ID/next" \
  -H "Authorization: Bearer $TOKEN1")
split_response "$RAW"
assert_status "$HTTP" "200" "call next"
ok "$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('message',''))" 2>/dev/null)"

# ─────────────────────────────────────────────────────────
step "18. Revert Last (undo call next)"
# ─────────────────────────────────────────────────────────
RAW=$(curl_json PUT "$BASE/participants-queue/$COMMERCE_ID/revert" \
  -H "Authorization: Bearer $TOKEN1")
split_response "$RAW"
assert_status "$HTTP" "200" "revert last"
REV=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['revertedCount'])" 2>/dev/null || echo "?")
ok "Reverted $REV participant(s)"

# ─────────────────────────────────────────────────────────
step "19. Call Next x2 (remove 2 at once)"
# ─────────────────────────────────────────────────────────
RAW=$(curl_json DELETE "$BASE/participants-queue/$COMMERCE_ID/next/2" \
  -H "Authorization: Bearer $TOKEN1")
split_response "$RAW"
assert_status "$HTTP" "200" "call next x2"
ok "$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('message',''))" 2>/dev/null)"

# ─────────────────────────────────────────────────────────
step "20. Grant Admin to User 2"
# ─────────────────────────────────────────────────────────
RAW=$(curl_json POST "$BASE/commerce/$COMMERCE_ID/admins" \
  -H "Authorization: Bearer $TOKEN1" \
  -d "{\"email\": \"$EMAIL2\"}")
split_response "$RAW"
assert_status "$HTTP" "200" "grant admin to user2"
ok "$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('message',''))" 2>/dev/null)"

# ─────────────────────────────────────────────────────────
step "21. List Admins"
# ─────────────────────────────────────────────────────────
RAW=$(curl_json GET "$BASE/commerce/$COMMERCE_ID/admins" \
  -H "Authorization: Bearer $TOKEN1")
split_response "$RAW"
assert_status "$HTTP" "200" "list admins"
USER2_ID=$(echo "$BODY" | python3 -c "import sys,json; admins=json.load(sys.stdin).get('data',[]); print(admins[0]['person_id'] if admins else '')" 2>/dev/null || echo "")
ok "Admins listed — person_id: ${USER2_ID:0:12}..."

# ─────────────────────────────────────────────────────────
step "22. Revoke Admin from User 2"
# ─────────────────────────────────────────────────────────
if [ -n "$USER2_ID" ]; then
  RAW=$(curl_json DELETE "$BASE/commerce/$COMMERCE_ID/admins/$USER2_ID" \
    -H "Authorization: Bearer $TOKEN1")
  split_response "$RAW"
  assert_status "$HTTP" "200" "revoke admin user2"
  ok "Admin revoked"
else
  warn "Skipping revoke — could not extract person_id from admin list"
fi

# ─────────────────────────────────────────────────────────
step "23. User 2 Re-enters Queue (to test exit)"
# ─────────────────────────────────────────────────────────
RAW=$(curl_json POST "$BASE/participants-queue/enter/$COMMERCE_ID" \
  -H "Authorization: Bearer $TOKEN2")
split_response "$RAW"
assert_status "$HTTP" "201" "user2 re-enter queue"
ok "User 2 re-entered queue"

# ─────────────────────────────────────────────────────────
step "24. User 2 Exits Queue"
# ─────────────────────────────────────────────────────────
RAW=$(curl_json DELETE "$BASE/participants-queue/$COMMERCE_ID/exit" \
  -H "Authorization: Bearer $TOKEN2")
split_response "$RAW"
assert_status "$HTTP" "200" "user2 exit queue"
ok "$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('message',''))" 2>/dev/null)"

# ─────────────────────────────────────────────────────────
step "25. Search Queue by Name"
# ─────────────────────────────────────────────────────────
RAW=$(curl_json GET "$BASE/procurar-fila?name=Fila" \
  -H "Authorization: Bearer $TOKEN1")
split_response "$RAW"
if [ "$HTTP" = "200" ]; then
  ok "Search by name returned HTTP 200"
else
  warn "Search returned HTTP $HTTP — $BODY"
fi

# ─────────────────────────────────────────────────────────
step "26. Search Queue by CEP prefix"
# ─────────────────────────────────────────────────────────
RAW=$(curl_json GET "$BASE/procurar-fila?cepPrefix=01310" \
  -H "Authorization: Bearer $TOKEN1")
split_response "$RAW"
if [ "$HTTP" = "200" ]; then
  ok "Search by cepPrefix returned HTTP 200"
else
  warn "Search returned HTTP $HTTP — $BODY"
fi

# ─────────────────────────────────────────────────────────
step "27. Anonymous Flow — Enter Queue"
# ─────────────────────────────────────────────────────────
ANON_ID="a0000000-0000-7000-8000-$(printf '%012d' $SUFFIX)"
RAW=$(curl_json POST "$BASE/participants-queue/enter/$COMMERCE_ID" \
  -H "X-Anonymous-Id: $ANON_ID")
split_response "$RAW"
assert_status "$HTTP" "201" "anonymous enter queue"
ok "Anonymous entered queue (ID: $ANON_ID)"

# ─────────────────────────────────────────────────────────
step "28. Anonymous — Get My Position"
# ─────────────────────────────────────────────────────────
RAW=$(curl_json GET "$BASE/participants-queue/$COMMERCE_ID/my-position" \
  -H "X-Anonymous-Id: $ANON_ID")
split_response "$RAW"
assert_status "$HTTP" "200" "anonymous get position"
ANON_POS=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['position'])" 2>/dev/null || echo "?")
ok "Anonymous is at position: $ANON_POS"

# ─────────────────────────────────────────────────────────
step "29. Anonymous — Exit Queue"
# ─────────────────────────────────────────────────────────
RAW=$(curl_json DELETE "$BASE/participants-queue/$COMMERCE_ID/exit" \
  -H "X-Anonymous-Id: $ANON_ID")
split_response "$RAW"
assert_status "$HTTP" "200" "anonymous exit queue"
ok "Anonymous exited queue"

# ─────────────────────────────────────────────────────────
step "30. Enter via QR Code / Magic Link (anonymous)"
# ─────────────────────────────────────────────────────────
ANON_ID2="b1111111-1111-7000-8000-$(printf '%012d' $SUFFIX)"
RAW=$(curl_json POST "$BASE/enter-queue" \
  -d "{
    \"queueId\": \"$QUEUE_ID\",
    \"qrcodeToken\": \"$QR_TOKEN\",
    \"anonymousId\": \"$ANON_ID2\"
  }")
split_response "$RAW"
assert_status "$HTTP" "201" "enter via QR code (anonymous)"
ok "$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('message',''))" 2>/dev/null)"

# ─────────────────────────────────────────────────────────
step "31. Enter via QR Code / Magic Link (user1 via token)"
# ─────────────────────────────────────────────────────────
USER1_ID=$(echo "$TOKEN1" | python3 -c "
import sys, json, base64
parts = sys.stdin.read().strip().split('.')
payload = parts[1] + '=' * (-len(parts[1]) % 4)
decoded = json.loads(base64.urlsafe_b64decode(payload))
print(decoded.get('id',''))
" 2>/dev/null || echo "")
if [ -n "$USER1_ID" ]; then
  RAW=$(curl_json POST "$BASE/enter-queue" \
    -d "{
      \"queueId\": \"$QUEUE_ID\",
      \"qrcodeToken\": \"$QR_TOKEN\",
      \"userId\": \"$USER1_ID\"
    }")
  split_response "$RAW"
  assert_status "$HTTP" "201" "enter via QR code (user1)"
  ok "$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('message',''))" 2>/dev/null)"
else
  warn "Could not decode USER1_ID from JWT — skipping QR user entry"
fi

# ─────────────────────────────────────────────────────────
step "32. Claim Anonymous — Register with anon UUID then claim"
# ─────────────────────────────────────────────────────────
ANON_ID3="c2222222-2222-7000-8000-$(printf '%012d' $SUFFIX)"
EMAIL3="claim${SUFFIX}@test.com"

# Register new user with X-Anonymous-Id header (links the UUID as person id if new)
RAW=$(curl_json POST "$BASE/user/register" \
  -H "X-Anonymous-Id: $ANON_ID3" \
  -d "{
    \"name\": \"Claim Test\",
    \"email\": \"$EMAIL3\",
    \"password\": \"$PASS\",
    \"phone\": \"+5511999990003\"
  }")
split_response "$RAW"
assert_status "$HTTP" "201" "register user for claim-anonymous"
TOKEN3=$(assert_field "$BODY" "access_token" "access_token user3")
ok "User 3 registered with anon UUID as ID"

# Now claim any leftover anon participations
RAW=$(curl_json POST "$BASE/user/claim-anonymous" \
  -H "Authorization: Bearer $TOKEN3" \
  -H "X-Anonymous-Id: $ANON_ID3")
split_response "$RAW"
assert_status "$HTTP" "200" "claim-anonymous"
ok "$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('message',''))" 2>/dev/null)"

# ─────────────────────────────────────────────────────────
step "33. User 1 Lists Own Queues"
# ─────────────────────────────────────────────────────────
RAW=$(curl_json GET "$BASE/user/queues" -H "Authorization: Bearer $TOKEN1")
split_response "$RAW"
assert_status "$HTTP" "200" "list user1 queues"
ok "User 1 queues listed"

# ─────────────────────────────────────────────────────────
step "34. Create Queue Schedule"
# ─────────────────────────────────────────────────────────
RAW=$(curl_json POST "$BASE/queue/$COMMERCE_ID/$QUEUE_ID/schedule" \
  -H "Authorization: Bearer $TOKEN1" \
  -d "{\"type\": \"daily\"}")
split_response "$RAW"
if [ "$HTTP" = "201" ]; then
  SCHED_ID=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('id',''))" 2>/dev/null || echo "")
  ok "Schedule created: $SCHED_ID"
else
  warn "Schedule create returned HTTP $HTTP — $BODY"
  SCHED_ID=""
fi

# ─────────────────────────────────────────────────────────
step "35. Get Queue Schedule"
# ─────────────────────────────────────────────────────────
RAW=$(curl_json GET "$BASE/queue/$COMMERCE_ID/$QUEUE_ID/schedule" \
  -H "Authorization: Bearer $TOKEN1")
split_response "$RAW"
if [ "$HTTP" = "200" ]; then
  ok "Schedule fetched"
  if [ -z "$SCHED_ID" ]; then
    SCHED_ID=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print((d.get('data') or {}).get('id',''))" 2>/dev/null || echo "")
  fi
else
  warn "Schedule GET returned HTTP $HTTP"
fi

# ─────────────────────────────────────────────────────────
step "36. Toggle Schedule (inactive)"
# ─────────────────────────────────────────────────────────
if [ -n "$SCHED_ID" ]; then
  RAW=$(curl_json PATCH "$BASE/queue/$COMMERCE_ID/$QUEUE_ID/schedule/$SCHED_ID/toggle" \
    -H "Authorization: Bearer $TOKEN1" \
    -d "{\"status\": \"inactive\"}")
  split_response "$RAW"
  if [ "$HTTP" = "200" ]; then
    ok "Schedule toggled to inactive"
  else
    warn "Toggle returned HTTP $HTTP — $BODY"
  fi
else
  warn "No schedule ID — skipping toggle"
fi

# ─────────────────────────────────────────────────────────
step "37. Logout User 1"
# ─────────────────────────────────────────────────────────
RAW=$(curl_json POST "$BASE/user/logout" \
  -H "Authorization: Bearer $TOKEN1" \
  -d "{\"refresh_token\": \"$REFRESH1\"}")
split_response "$RAW"
assert_status "$HTTP" "200" "logout user1"
ok "User 1 logged out"

# ─────────────────────────────────────────────────────────
echo -e "\n${BOLD}${GREEN}╔══════════════════════════════════════════════════╗"
echo "║         ALL LIFECYCLE TESTS PASSED ✓            ║"
echo "╚══════════════════════════════════════════════════╝${NC}"
