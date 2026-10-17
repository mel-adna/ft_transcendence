#!/usr/bin/env bash

# =========================================================================
#                   Team-Pulse SSL Certificate Generator
# =========================================================================

set -euo pipefail


CERT_DIR="nginx/certs"
KEY_FILE="${CERT_DIR}/selfsigned.key"
CRT_FILE="${CERT_DIR}/selfsigned.crt"


GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'


FORCE_OVERWRITE=false

if [[ "${1:-}" == "-f" ]] || [[ "${1:-}" == "--force" ]]; then
    FORCE_OVERWRITE=true
fi

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}🛡️  Team-Pulse SSL Cryptographic Key Setup Utility ${NC}"
echo -e "${BLUE}====================================================${NC}"


if ! command -v openssl &> /dev/null; then
    echo -e "${RED}❌ Error: openssl command not found. Please install OpenSSL first.${NC}"
    exit 1
fi


if [ ! -d "$CERT_DIR" ]; then
    echo -e "${YELLOW}📁 Creating certificate directory: ${CERT_DIR}...${NC}"
    mkdir -p "$CERT_DIR"
fi


if [ -f "$KEY_FILE" ] && [ -f "$CRT_FILE" ]; then
    if [ "$FORCE_OVERWRITE" = true ]; then
        echo -e "${YELLOW}⚠️ Overwriting existing certificates (--force flag provided)...${NC}"
    else
        echo -e "${YELLOW}⚠️ Existing SSL key certificates found in ${CERT_DIR}.${NC}"
        read -p "Do you want to overwrite them and generate fresh keys? (y/N) " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${GREEN}✅ Keeping existing SSL certificates. Process complete!${NC}"
            exit 0
        fi
    fi
fi

echo -e "${BLUE}🔑 Generating 2048-bit secure RSA private key and self-signed certificate...${NC}"


openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$KEY_FILE" \
  -out "$CRT_FILE" \
  -subj "/C=MA/L=Tetouan/O=42Network/OU=1337CodingSchool/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1" 2>/dev/null


chmod 600 "$KEY_FILE"
chmod 644 "$CRT_FILE"

echo -e "${BLUE}====================================================${NC}"
echo -e "${GREEN}✅ Success: Cryptographic keys generated successfully!${NC}"
echo -e "📁 Private Key:   ${GREEN}${KEY_FILE}${NC}"
echo -e "📁 Public Cert:   ${GREEN}${CRT_FILE}${NC}"
echo -e "${BLUE}====================================================${NC}"
echo -e "${YELLOW}👉 Run 'make' to run the project.${NC}"
echo -e "${BLUE}====================================================${NC}"
