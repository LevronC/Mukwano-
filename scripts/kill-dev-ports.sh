#!/usr/bin/env bash
# Free Mukwano dev ports (stale API / Vite from prior terminals).
# Web UI is always Vite on 5173 (strictPort); API on 4000.
set -euo pipefail
for port in 4000 5173; do
  if lsof -ti ":${port}" >/dev/null 2>&1; then
    echo "Freeing port ${port}…"
    lsof -ti ":${port}" | xargs kill -9 2>/dev/null || true
  fi
done
echo "Done. Run: npm run dev"
