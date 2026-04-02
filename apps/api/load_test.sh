#!/usr/bin/env bash
set -euo pipefail

API_URL="http://localhost:8080/v1/payments/sale"
API_KEY="pkx_bf3f2424a07f2b4ab7b7c87c95891b2356b64ca74cddcfea"

TOTAL_REQUESTS=200
MAX_PARALLEL=25

first_names=(
  "Elon" "Sam" "Jensen" "Larry" "Sergey" "Satya" "Mark" "Tim" "Reed" "Susan"
  "Brian" "Patrick" "Jack" "Peter" "David" "Dara" "Whitney" "Marc" "Palmer" "Drew"
)

last_names=(
  "Musk" "Altman" "Huang" "Page" "Brin" "Nadella" "Zuckerberg" "Cook" "Hastings" "Wojcicki"
  "Chesky" "Collison" "Dorsey" "Thiel" "Sacks" "Khosrowshahi" "Wolfe" "Benioff" "Luckey" "Houston"
)

success_file="$(mktemp)"
fail_file="$(mktemp)"
time_file="$(mktemp)"

send_one() {
  local i="$1"

  local fn_index=$(( i % ${#first_names[@]} ))
  local ln_index=$(( (i * 3) % ${#last_names[@]} ))

  local first="${first_names[$fn_index]}"
  local last="${last_names[$ln_index]}"

  local cents=$(( 200 + (RANDOM % 201) ))   # 200-400 cents = $2.00-$4.00
  local email_first
  local email_last

  email_first="$(echo "$first" | tr '[:upper:]' '[:lower:]')"
  email_last="$(echo "$last" | tr '[:upper:]' '[:lower:]')"

  local merchant_ref="speed_${i}_$(date +%s%N)"
  local idem_key="idem_${i}_$(date +%s%N)"

  local payload
  payload=$(cat <<JSON
{
  "merchant_reference": "$merchant_ref",
  "amount": $cents,
  "currency": "USD",
  "payment_method": {
    "type": "card_token",
    "token_ref": "ignore_for_now"
  },
  "customer": {
    "customer_ref": "cust_$i",
    "email": "${email_first}.${email_last}.${i}@paychainx.ai"
  }
}
JSON
)

  local response
  response=$(curl -sS -w '\nHTTP_STATUS:%{http_code}\nTOTAL_TIME:%{time_total}\n' \
    -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: $idem_key" \
    -H "x-api-key: $API_KEY" \
    -d "$payload" || true)

  local http_status
  http_status=$(echo "$response" | awk -F: '/^HTTP_STATUS:/ {print $2}')
  local total_time
  total_time=$(echo "$response" | awk -F: '/^TOTAL_TIME:/ {print $2}')
  local body
  body=$(echo "$response" | sed '/^HTTP_STATUS:/d;/^TOTAL_TIME:/d')

  echo "$total_time" >> "$time_file"

  if [[ "$http_status" == "200" ]]; then
    echo "$merchant_ref | $cents | $first $last | $total_time" >> "$success_file"
  else
    echo "$merchant_ref | HTTP $http_status | $cents | $first $last | $body" >> "$fail_file"
  fi
}

export API_URL API_KEY success_file fail_file time_file
export -f send_one

echo "Running $TOTAL_REQUESTS requests with max parallel = $MAX_PARALLEL"
seq 1 "$TOTAL_REQUESTS" | xargs -I{} -P "$MAX_PARALLEL" bash -lc 'send_one "$@"' _ {}

success_count=$(wc -l < "$success_file" | tr -d ' ')
fail_count=$(wc -l < "$fail_file" | tr -d ' ')

avg_time=$(awk '{sum+=$1; n+=1} END {if (n>0) printf "%.4f", sum/n; else print "0"}' "$time_file")
max_time=$(awk 'BEGIN{max=0} {if ($1>max) max=$1} END {printf "%.4f", max}' "$time_file")
min_time=$(awk 'BEGIN{min=999999} {if ($1<min) min=$1} END {if (min==999999) min=0; printf "%.4f", min}' "$time_file")

echo
echo "========== LOAD TEST SUMMARY =========="
echo "Total requests : $TOTAL_REQUESTS"
echo "Success        : $success_count"
echo "Fail           : $fail_count"
echo "Min time (s)   : $min_time"
echo "Avg time (s)   : $avg_time"
echo "Max time (s)   : $max_time"
echo

echo "Top 10 successes:"
head -10 "$success_file" || true
echo

echo "Top 10 failures:"
head -10 "$fail_file" || true
echo

echo "Files:"
echo "  Success log: $success_file"
echo "  Failure log: $fail_file"
