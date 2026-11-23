#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export NEXT_TELEMETRY_DISABLED=1
npm ci
npm run build --workspace @ai-support/server
npm run test --workspace @ai-support/server -- --maxWorkers=2 --minWorkers=1
npm run test --workspace @ai-support/web -- --maxWorkers=2 --minWorkers=1
npm run test --workspace @ai-support/widget -- --maxWorkers=2 --minWorkers=1
node --test integration/v3/examples.test.mjs
node scripts/verify-locales.mjs
npm run build --workspace @ai-support/widget
python3 scripts/verify-assets.py
npm run build --workspace @ai-support/web -- --webpack
