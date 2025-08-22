#!/bin/bash

# API Test Script
# Tests the basic functionality of the Smart Device Backend

BASE_URL="http://localhost:3000/api"
EMAIL="admin@curvetech.com"
PASSWORD="AdminPass123!"

echo "🧪 Smart Device Backend API Test"
echo "================================"

# Test 1: Health Check
echo "1️⃣ Testing Health Check..."
HEALTH_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/health_response.json "$BASE_URL/health")
HTTP_CODE="${HEALTH_RESPONSE: -3}"

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Health Check passed"
    cat /tmp/health_response.json | jq . 2>/dev/null || cat /tmp/health_response.json
else
    echo "❌ Health Check failed (HTTP $HTTP_CODE)"
fi

echo ""

# Test 2: User Login
echo "2️⃣ Testing User Login..."
LOGIN_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  -w "%{http_code}" \
  -o /tmp/login_response.json \
  "$BASE_URL/auth/login")

HTTP_CODE="${LOGIN_RESPONSE: -3}"

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Login successful"
    TOKEN=$(cat /tmp/login_response.json | jq -r '.data.tokens.accessToken' 2>/dev/null)
    if [ "$TOKEN" != "null" ] && [ "$TOKEN" != "" ]; then
        echo "🔑 Access Token received"
    else
        echo "⚠️  No access token in response"
        cat /tmp/login_response.json
    fi
else
    echo "❌ Login failed (HTTP $HTTP_CODE)"
    cat /tmp/login_response.json
    exit 1
fi

echo ""

# Test 3: Get Devices
echo "3️⃣ Testing Get Devices..."
DEVICES_RESPONSE=$(curl -s -X GET \
  -H "Authorization: Bearer $TOKEN" \
  -w "%{http_code}" \
  -o /tmp/devices_response.json \
  "$BASE_URL/devices")

HTTP_CODE="${DEVICES_RESPONSE: -3}"

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Get Devices successful"
    DEVICE_COUNT=$(cat /tmp/devices_response.json | jq -r '.data.devices | length' 2>/dev/null)
    echo "📱 Found $DEVICE_COUNT devices"
else
    echo "❌ Get Devices failed (HTTP $HTTP_CODE)"
    cat /tmp/devices_response.json
fi

echo ""

# Test 4: Get Device Stats
echo "4️⃣ Testing Device Statistics..."
STATS_RESPONSE=$(curl -s -X GET \
  -H "Authorization: Bearer $TOKEN" \
  -w "%{http_code}" \
  -o /tmp/stats_response.json \
  "$BASE_URL/analytics/device-stats")

HTTP_CODE="${STATS_RESPONSE: -3}"

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Device Statistics successful"
    cat /tmp/stats_response.json | jq . 2>/dev/null || cat /tmp/stats_response.json
else
    echo "❌ Device Statistics failed (HTTP $HTTP_CODE)"
    cat /tmp/stats_response.json
fi

echo ""

# Test 5: Create a Test Device
echo "5️⃣ Testing Create Device..."
DEVICE_DATA='{
  "deviceId": "TEST_DEVICE_001",
  "name": "Test Device",
  "type": "sensor",
  "location": "Test Location",
  "metadata": {
    "model": "Test Model",
    "manufacturer": "Test Manufacturer"
  }
}'

CREATE_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$DEVICE_DATA" \
  -w "%{http_code}" \
  -o /tmp/create_response.json \
  "$BASE_URL/devices")

HTTP_CODE="${CREATE_RESPONSE: -3}"

if [ "$HTTP_CODE" = "201" ]; then
    echo "✅ Create Device successful"
    echo "📱 Test device created: TEST_DEVICE_001"
else
    echo "❌ Create Device failed (HTTP $HTTP_CODE)"
    cat /tmp/create_response.json
fi

echo ""
echo "🎉 API Tests Completed!"
echo ""
echo "💡 Next Steps:"
echo "   - Open http://localhost:3000/api/health in your browser"
echo "   - Use Postman/Thunder Client to test the API"
echo "   - Check the WebSocket connection on ws://localhost:3000"
echo ""
echo "📚 Available Endpoints:"
echo "   POST /api/auth/login"
echo "   POST /api/auth/register" 
echo "   GET  /api/devices"
echo "   POST /api/devices"
echo "   PUT  /api/devices/{deviceId}/status"
echo "   POST /api/devices/{deviceId}/heartbeat"
echo "   GET  /api/analytics/device-stats"
echo "   POST /api/exports"

# Clean up temp files
rm -f /tmp/health_response.json /tmp/login_response.json /tmp/devices_response.json /tmp/stats_response.json /tmp/create_response.json
