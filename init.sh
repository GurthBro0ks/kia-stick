#!/usr/bin/env bash
set -euo pipefail

export KIA_STICK_PHASE="${KIA_STICK_PHASE:-KIA-Stick-v0.1-mobile-ui-manual-qa-fix}"
export KIA_STICK_TARGET_MACHINE="${KIA_STICK_TARGET_MACHINE:-USER_LAPTOP_ONLY}"
export KIA_STICK_PROVIDER="${KIA_STICK_PROVIDER:-local-fake-deterministic}"

echo "KIA Stick harness loaded: ${KIA_STICK_PHASE} / ${KIA_STICK_TARGET_MACHINE}"
