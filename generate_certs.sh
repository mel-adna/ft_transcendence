#!/usr/bin/env bash

# =========================================================================
# 🔐 Team-Pulse SSL Certificate Generator
# =========================================================================
# Description: Automated script to generate self-signed SSL certificates
#              for local Nginx development on macOS and Linux systems.
# =========================================================================

set -euo pipefail

# Define variables
CERT_DIR="nginx/certs"
KEY_FILE="${CERT_DIR}/selfsigned.key"
CRT_FILE="${CERT_DIR}/selfsigned.crt"

# Color formatting for professional output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}🛡️  Team-Pulse SSL Cryptographic Key Setup Utility ${NC}"
echo -e "${BLUE}====================================================${NC}"

# Check if OpenSSL is installed
if ! command -v openssl &> /dev/null; then
    echo -e "${RED}❌ Error: openssl command not found. Please install OpenSSL first.${NC}"
    exit 1
fi

# Ensure certificate directory exists
if [ ! -d "$CERT_DIR" ]; then
    echo -e "${YELLOW}📁 Creating certificate directory: ${CERT_DIR}...${NC}"
    mkdir -p "$CERT_DIR"
fi

# Check if certificates already exist
if [ -f "$KEY_FILE" ] && [ -f "$CRT_FILE" ]; then
    echo -e "${YELLOW}⚠️  Existing SSL key certificates found in ${CERT_DIR}.${NC}"
    read -p "Do you want to overwrite them and generate fresh keys? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${GREEN}✅ Keeping existing SSL certificates. Process complete!${NC}"
        exit 0
    fi
fi

echo -e "${BLUE}🔑 Generating 2048-bit secure RSA private key and self-signed certificate...${NC}"

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$KEY_FILE" \
  -out "$CRT_FILE" \
  -subj "/C=MA/L=Khouribga/O=1337School/OU=DevOps/CN=localhost" 2>/dev/null

# Set strict file permissions (Read/Write only for the owner for high security)
chmod 600 "$KEY_FILE"
chmod 644 "$CRT_FILE"

echo -e "${BLUE}====================================================${NC}"
echo -e "${GREEN}✅ Success: Cryptographic keys generated successfully!${NC}"
echo -e "📁 Private Key:   ${GREEN}${KEY_FILE}${NC}"
echo -e "📁 Public Cert:   ${GREEN}${CRT_FILE}${NC}"
echo -e "${BLUE}====================================================${NC}"
echo -e "${YELLOW}👉 Run 'docker-compose up --build' to boot the secure proxy environment.${NC}"
echo -e "${BLUE}====================================================${NC}"
