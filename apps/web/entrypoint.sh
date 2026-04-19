#!/bin/sh
# entrypoint.sh
# Replace NEXT_PUBLIC_* placeholders baked into the Next.js bundle at build time
# with the actual runtime environment variable values injected by Railway.

set -e

echo "🔧 Replacing NEXT_PUBLIC_API_URL placeholder..."
echo "   Value: ${NEXT_PUBLIC_API_URL}"

# Find all .js files in the Next.js build output and replace the placeholder
find /app/apps/web/.next -type f -name "*.js" | xargs sed -i "s|RUNTIME_API_URL_PLACEHOLDER|${NEXT_PUBLIC_API_URL}|g"

echo "✅ Replacement done. Starting Next.js..."

exec node_modules/.bin/next start
