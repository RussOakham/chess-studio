#!/usr/bin/env bash
# Sync .env.local to Doppler configs dev and dev_personal.
# Skips comments, empty lines, and DOPPLER_TOKEN.
# Requires: doppler CLI installed and authenticated (doppler login).
# Usage: from repo root, ./scripts/sync-env-to-doppler.sh

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${REPO_ROOT}/.env.local"
PROJECT="chess-studio"
CONFIGS=("dev" "dev_personal")

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing .env.local at $ENV_FILE"
  exit 1
fi

if ! command -v doppler >/dev/null 2>&1; then
  echo "Doppler CLI not found. Install: https://docs.doppler.com/docs/install-cli"
  exit 1
fi

# Build a clean env file (no comments, no empty, no DOPPLER_TOKEN)
CLEAN_ENV=$(mktemp)
trap 'rm -f "$CLEAN_ENV"' EXIT

grep -v '^#' "$ENV_FILE" | grep -v '^[[:space:]]*$' | grep -v '^DOPPLER_TOKEN=' > "$CLEAN_ENV" || true

if [[ ! -s "$CLEAN_ENV" ]]; then
  echo "No secrets to sync (after filtering comments and DOPPLER_TOKEN)."
  exit 0
fi

# Set secrets one by one so values with = or special chars are handled correctly
while IFS= read -r line; do
  key="${line%%=*}"
  val="${line#*=}"
  # Trim leading/trailing space from key (value we leave as-is)
  key="${key#"${key%%[![:space:]]*}"}"
  key="${key%"${key##*[![:space:]]}"}"
  [[ -z "$key" ]] && continue
  # Quote value so = and spaces work; escape any " in value
  escaped_val="${val//\\/\\\\}"
  escaped_val="${escaped_val//\"/\\\"}"
  for config in "${CONFIGS[@]}"; do
    echo "Setting $key in $config..."
    doppler secrets set "$key=\"$escaped_val\"" --project "$PROJECT" --config "$config"
  done
done < "$CLEAN_ENV"

echo "Done. Synced to configs: ${CONFIGS[*]}"
echo "If you use SITE_URL or NEXT_PUBLIC_CONVEX_SITE_URL, add them to .env.local and re-run, or set them in the Doppler dashboard."
