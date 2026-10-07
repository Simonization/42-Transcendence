#!/usr/bin/env bash
# scripts/check.sh — the one-command gate (also: `make check`).
#
#   scripts/check.sh               run everything, stop at the first failure
#   scripts/check.sh backend       only the backend steps
#   scripts/check.sh frontend      only the frontend steps
#   scripts/check.sh extras        only the i18n and built-SPA checks (needs a frontend build)
#
# Order: backend jest -> nest build -> test:db -> migration:verify
#        frontend vitest -> vue-tsc + vite build
#        i18n checker (+ its unit tests) -> built-SPA key smoke
#
# Needs: bash, Node 22 + npm. No Docker: test:db and migration:verify use an embedded Postgres
# on ports 55441 / 55440 (override with TEST_DB_PORT / MIGRATION_VERIFY_PORT). Missing
# node_modules are installed with `npm ci` first. E2E=1 additionally renders /login in headless
# Chromium when Playwright is installed (see scripts/check-spa-keys.mjs).
set -u -o pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" || exit 1

if [ -t 1 ]; then
    RED=$'\033[31m'; GREEN=$'\033[32m'; BOLD=$'\033[1m'; RESET=$'\033[0m'
else
    RED=''; GREEN=''; BOLD=''; RESET=''
fi

GROUPS_WANTED=("$@")
[ ${#GROUPS_WANTED[@]} -eq 0 ] && GROUPS_WANTED=(backend frontend extras)
wanted() {
    local g
    for g in "${GROUPS_WANTED[@]}"; do [ "$g" = "$1" ] && return 0; done
    return 1
}
for g in "${GROUPS_WANTED[@]}"; do
    case "$g" in
        backend|frontend|extras) ;;
        *) echo "usage: $0 [backend] [frontend] [extras]" >&2; exit 2 ;;
    esac
done

command -v node >/dev/null 2>&1 || { echo "check: node is required (Node 22)" >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "check: npm is required" >&2; exit 1; }

NAMES=()
SECS=()
T_ALL=$(date +%s)

summary() {
    echo
    echo "${BOLD}== Summary ==${RESET}"
    local i
    for i in "${!NAMES[@]}"; do
        printf '  %-34s %s\n' "${NAMES[$i]}" "${SECS[$i]}s"
    done
    printf '  %-34s %s\n' "total" "$(( $(date +%s) - T_ALL ))s"
}

# step <label> <dir> <command...>
step() {
    local label="$1" dir="$2"
    shift 2
    echo
    echo "${BOLD}==> [$label]${RESET} (in ${dir}) $*"
    local t0 rc
    t0=$(date +%s)
    ( cd "$ROOT/$dir" && "$@" )
    rc=$?
    NAMES+=("$label")
    SECS+=("$(( $(date +%s) - t0 ))")
    if [ "$rc" -ne 0 ]; then
        echo
        echo "${RED}${BOLD}################################################################${RESET}"
        echo "${RED}${BOLD}  CHECK FAILED at step: ${label} (exit ${rc})${RESET}"
        echo "${RED}${BOLD}  command: (cd ${dir} && $*)${RESET}"
        echo "${RED}${BOLD}################################################################${RESET}"
        summary
        exit "$rc"
    fi
}

ensure_deps() { # <dir> <npm ci args...>
    local dir="$1"
    shift
    if [ ! -d "$ROOT/$dir/node_modules" ] || [ "${CHECK_INSTALL:-0}" = "1" ]; then
        step "install $dir" "$dir" npm ci "$@"
    fi
}

if wanted backend; then
    ensure_deps backend --legacy-peer-deps
    step "backend: jest"             backend npx jest
    step "backend: nest build"       backend npx nest build
    step "backend: test:db"          backend npm run test:db
    step "backend: migration:verify" backend npm run migration:verify
fi

if wanted frontend; then
    ensure_deps frontend
    step "frontend: vitest"          frontend npx vitest run
    step "frontend: build (vue-tsc)" frontend npm run build
fi

if wanted extras; then
    step "scripts: unit tests"       . node --test scripts/check-i18n.test.mjs scripts/check-spa-keys.test.mjs
    step "i18n: locale parity"       . node scripts/check-i18n.mjs
    step "spa: built-bundle keys"    . node scripts/check-spa-keys.mjs
fi

summary
echo
echo "${GREEN}${BOLD}CHECK PASSED${RESET}"
