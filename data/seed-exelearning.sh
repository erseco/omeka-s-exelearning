#!/bin/sh
# Seed script: Create test items with eXeLearning (.elpx) media files
# Usage: ./data/seed-exelearning.sh [API_KEY_IDENTITY] [API_KEY_CREDENTIAL]
#
# If no API key is provided, it creates one automatically via omeka-s-cli.

set -e

OMEKA_URL="${OMEKA_URL:-http://localhost:8080}"
FIXTURE_DIR="$(dirname "$0")/fixtures"

# API key handling
KEY_IDENTITY="${1:-}"
KEY_CREDENTIAL="${2:-}"

if [ -z "$KEY_IDENTITY" ] || [ -z "$KEY_CREDENTIAL" ]; then
    echo "No API key provided, creating one..."
    if command -v docker >/dev/null 2>&1 && docker compose ps --services 2>/dev/null | grep -q omekas; then
        API_OUTPUT=$(docker compose exec -T omekas omeka-s-cli user:create-api-key admin@example.com "seed-$(date +%s)" 2>&1)
        KEY_IDENTITY=$(echo "$API_OUTPUT" | grep -E '^\|' | tail -1 | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $2); print $2}')
        KEY_CREDENTIAL=$(echo "$API_OUTPUT" | grep -E '^\|' | tail -1 | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $3); print $3}')
    fi

    if [ -z "$KEY_IDENTITY" ] || [ -z "$KEY_CREDENTIAL" ]; then
        echo "Error: Could not create API key. Provide key_identity and key_credential as arguments."
        echo "Usage: $0 <key_identity> <key_credential>"
        exit 1
    fi
    echo "Created API key: $KEY_IDENTITY"
fi

API_AUTH="key_identity=${KEY_IDENTITY}&key_credential=${KEY_CREDENTIAL}"

# Check API connectivity
echo "Checking API connectivity at ${OMEKA_URL}..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${OMEKA_URL}/api/items?${API_AUTH}")
if [ "$STATUS" != "200" ]; then
    echo "Error: API returned HTTP $STATUS. Check OMEKA_URL and credentials."
    exit 1
fi
echo "API OK"

# Check if eXeLearning items already exist
EXISTING=$(curl -s "${OMEKA_URL}/api/items?${API_AUTH}&search=eXeLearning+Test+Project" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
if [ "$EXISTING" -gt 0 ]; then
    echo "eXeLearning test items already exist ($EXISTING found). Skipping seed."
    exit 0
fi

# Function to create an item with an elpx file
create_elpx_item() {
    local title="$1"
    local description="$2"
    local filepath="$3"

    if [ ! -f "$filepath" ]; then
        echo "Error: File not found: $filepath"
        return 1
    fi

    echo "Creating item: $title"
    echo "  Uploading: $(basename "$filepath") ($(du -h "$filepath" | cut -f1))"

    # Step 1: Create item
    ITEM_RESPONSE=$(curl -s -X POST "${OMEKA_URL}/api/items?${API_AUTH}" \
        -H "Content-Type: application/json" \
        -d "{
            \"dcterms:title\": [{
                \"type\": \"literal\",
                \"property_id\": 1,
                \"@value\": \"${title}\"
            }],
            \"dcterms:description\": [{
                \"type\": \"literal\",
                \"property_id\": 4,
                \"@value\": \"${description}\"
            }],
            \"o:is_public\": true
        }")

    ITEM_ID=$(echo "$ITEM_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('o:id',''))" 2>/dev/null || echo "")

    if [ -z "$ITEM_ID" ]; then
        echo "  Error creating item."
        return 1
    fi

    echo "  Created item #${ITEM_ID}"

    # Step 2: Upload media to the item
    MEDIA_RESPONSE=$(curl -s -X POST "${OMEKA_URL}/api/media?${API_AUTH}" \
        -F "data={\"o:ingester\":\"upload\",\"file_index\":0,\"o:item\":{\"o:id\":${ITEM_ID}},\"dcterms:title\":[{\"type\":\"literal\",\"property_id\":1,\"@value\":\"${title}\"}]}" \
        -F "file[0]=@${filepath};type=application/zip")

    MEDIA_ID=$(echo "$MEDIA_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('o:id',''))" 2>/dev/null || echo "")

    if [ -z "$MEDIA_ID" ]; then
        echo "  Error uploading media."
        return 1
    fi

    echo "  Uploaded media #${MEDIA_ID}"
    echo "  View: ${OMEKA_URL}/admin/item/${ITEM_ID}"
    echo "  Media: ${OMEKA_URL}/admin/media/${MEDIA_ID}"
    return 0
}

echo ""
echo "=== Seeding eXeLearning test data ==="
echo ""

create_elpx_item \
    "eXeLearning Test Project" \
    "A simple test project created with eXeLearning. Contains basic text content for testing the plugin integration." \
    "${FIXTURE_DIR}/really-simple-test-project.elpx"

echo ""
echo "=== Seed complete ==="
echo ""
echo "Login: ${OMEKA_URL}/login"
echo "  Admin: admin@example.com / PLEASE_CHANGEME"
echo "  Editor: editor@example.com / 1234"
