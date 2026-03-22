#!/bin/bash

BASE_URL="https://carreras-strydpanama.pages.dev"

echo "=========================================="
echo "TESTING API - Stryd Panama"
echo "=========================================="
echo ""

# Test 1: GET /api/races
echo "📡 Test 1: GET /api/races"
echo "-----------------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/races")
BODY=$(echo "$RESPONSE" | head -n -1)
CODE=$(echo "$RESPONSE" | tail -n 1)
echo "Status: $CODE"
echo "Response: $BODY"
echo ""

# Extraer ID de la primera carrera si existe
RACE_ID=$(echo "$BODY" | grep -oP '"id":"[^"]+' | head -1 | cut -d'"' -f4)
echo "Primera carrera ID: $RACE_ID"
echo ""

# Test 2: GET /api/race/:id (si tenemos ID)
if [ -n "$RACE_ID" ]; then
  echo "📡 Test 2: GET /api/race/$RACE_ID"
  echo "-----------------------------------"
  RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/race/$RACE_ID")
  BODY=$(echo "$RESPONSE" | head -n -1)
  CODE=$(echo "$RESPONSE" | tail -n 1)
  echo "Status: $CODE"
  echo "Response: $BODY"
  echo ""
else
  echo "⚠️ Test 2: Saltado (no hay carreras)"
  echo ""
fi

# Test 3: POST /api/validate-code
echo "📡 Test 3: POST /api/validate-code (código inválido)"
echo "-----------------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/validate-code" \
  -H "Content-Type: application/json" \
  -d '{"code":"INVALID123","raceId":"test-id"}')
BODY=$(echo "$RESPONSE" | head -n -1)
CODE=$(echo "$RESPONSE" | tail -n 1)
echo "Status: $CODE"
echo "Response: $BODY"
echo ""

# Test 4: POST /api/register (sin carrera válida)
echo "📡 Test 4: POST /api/register (sin carrera)"
echo "-----------------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/register" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User","email":"test@test.com","raceId":"invalid-id"}')
BODY=$(echo "$RESPONSE" | head -n -1)
CODE=$(echo "$RESPONSE" | tail -n 1)
echo "Status: $CODE"
echo "Response: $BODY"
echo ""

# Test 5: GET /api/admin/race/:id
if [ -n "$RACE_ID" ]; then
  echo "📡 Test 5: GET /api/admin/race/$RACE_ID"
  echo "-----------------------------------"
  RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/admin/race/$RACE_ID")
  BODY=$(echo "$RESPONSE" | head -n -1)
  CODE=$(echo "$RESPONSE" | tail -n 1)
  echo "Status: $CODE"
  echo "Response: $BODY"
  echo ""
else
  echo "⚠️ Test 5: Saltado (no hay carreras)"
  echo ""
fi

# Test 6: POST /api/admin/start-race
if [ -n "$RACE_ID" ]; then
  echo "📡 Test 6: POST /api/admin/start-race"
  echo "-----------------------------------"
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/admin/start-race" \
    -H "Content-Type: application/json" \
    -d "{\"raceId\":\"$RACE_ID\"}")
  BODY=$(echo "$RESPONSE" | head -n -1)
  CODE=$(echo "$RESPONSE" | tail -n 1)
  echo "Status: $CODE"
  echo "Response: $BODY"
  echo ""
else
  echo "⚠️ Test 6: Saltado (no hay carreras)"
  echo ""
fi

# Test 7: POST /api/admin/race (crear carrera)
echo "📡 Test 7: POST /api/admin/race (crear carrera)"
echo "-----------------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/admin/race" \
  -H "Content-Type: application/json" \
  -d '{"name":"Carrera Test API","date":"2026-04-01","location":"Panama","price":25}')
BODY=$(echo "$RESPONSE" | head -n -1)
CODE=$(echo "$RESPONSE" | tail -n 1)
echo "Status: $CODE"
echo "Response: $BODY"

# Extraer ID de la nueva carrera
NEW_RACE_ID=$(echo "$BODY" | grep -oP '"id":"[^"]+' | head -1 | cut -d'"' -f4)
echo "Nueva carrera ID: $NEW_RACE_ID"
echo ""

# Test 8: POST /api/admin/generate-codes
if [ -n "$NEW_RACE_ID" ]; then
  echo "📡 Test 8: POST /api/admin/generate-codes"
  echo "-----------------------------------"
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/admin/generate-codes" \
    -H "Content-Type: application/json" \
    -d "{\"raceId\":\"$NEW_RACE_ID\",\"count\":3}")
  BODY=$(echo "$RESPONSE" | head -n -1)
  CODE=$(echo "$RESPONSE" | tail -n 1)
  echo "Status: $CODE"
  echo "Response: $BODY"

  # Extraer primer código
  FIRST_CODE=$(echo "$BODY" | grep -oP '"code":"[^"]+' | head -1 | cut -d'"' -f4)
  echo "Primer código generado: $FIRST_CODE"
  echo ""

  # Test 9: POST /api/validate-code (con código válido)
  if [ -n "$FIRST_CODE" ]; then
    echo "📡 Test 9: POST /api/validate-code (con código válido)"
    echo "-----------------------------------"
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/validate-code" \
      -H "Content-Type: application/json" \
      -d "{\"code\":\"$FIRST_CODE\",\"raceId\":\"$NEW_RACE_ID\"}")
    BODY=$(echo "$RESPONSE" | head -n -1)
    CODE=$(echo "$RESPONSE" | tail -n 1)
    echo "Status: $CODE"
    echo "Response: $BODY"
    echo ""

    # Test 10: POST /api/register (con código válido)
    echo "📡 Test 10: POST /api/register (con código gratuito)"
    echo "-----------------------------------"
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/register" \
      -H "Content-Type: application/json" \
      -d "{\"firstName\":\"Juan\",\"lastName\":\"Pérez\",\"email\":\"juan@test.com\",\"raceId\":\"$NEW_RACE_ID\",\"code\":\"$FIRST_CODE\"}")
    BODY=$(echo "$RESPONSE" | head -n -1)
    CODE=$(echo "$RESPONSE" | tail -n 1)
    echo "Status: $CODE"
    echo "Response: $BODY"
    echo ""
  fi

  # Test 11: PUT /api/admin/race/:id
  echo "📡 Test 11: PUT /api/admin/race/$NEW_RACE_ID"
  echo "-----------------------------------"
  RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/api/admin/race/$NEW_RACE_ID" \
    -H "Content-Type: application/json" \
    -d '{"name":"Carrera Test API - Actualizada","price":30}')
  BODY=$(echo "$RESPONSE" | head -n -1)
  CODE=$(echo "$RESPONSE" | tail -n 1)
  echo "Status: $CODE"
  echo "Response: $BODY"
  echo ""

  # Test 12: DELETE /api/admin/race/:id
  echo "📡 Test 12: DELETE /api/admin/race/$NEW_RACE_ID"
  echo "-----------------------------------"
  RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL/api/admin/race/$NEW_RACE_ID")
  BODY=$(echo "$RESPONSE" | head -n -1)
  CODE=$(echo "$RESPONSE" | tail -n 1)
  echo "Status: $CODE"
  echo "Response: $BODY"
  echo ""
fi

# Test 13: GET /api/race/invalid-id (404)
echo "📡 Test 13: GET /api/race/invalid-id (debe dar 404)"
echo "-----------------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/race/invalid-id-12345")
BODY=$(echo "$RESPONSE" | head -n -1)
CODE=$(echo "$RESPONSE" | tail -n 1)
echo "Status: $CODE"
echo "Response: $BODY"
echo ""

# Test 14: POST /api/invalid-route (404)
echo "📡 Test 14: POST /api/invalid-route (debe dar 404)"
echo "-----------------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/invalid-route" \
  -H "Content-Type: application/json" \
  -d '{}')
BODY=$(echo "$RESPONSE" | head -n -1)
CODE=$(echo "$RESPONSE" | tail -n 1)
echo "Status: $CODE"
echo "Response: $BODY"
echo ""

echo "=========================================="
echo "TESTING COMPLETADO"
echo "=========================================="
