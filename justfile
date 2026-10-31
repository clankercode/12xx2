# 12 Axes² — common tasks. Node's IPv4/IPv6 auto-select times out against the npm
# registry on this network; the longer attempt timeout fixes installs.
export NODE_OPTIONS := "--network-family-autoselection-attempt-timeout=2000"

default:
    @just --list

install:
    pnpm install

dev:
    pnpm vite

test:
    pnpm vitest run

typecheck:
    pnpm tsc --noEmit -p tsconfig.json

calibrate:
    pnpm tsx scripts/calibrate.ts

archetypes:
    pnpm tsx scripts/build-archetypes.ts

overlap:
    pnpm tsx scripts/overlap.ts

# Refetch World Bank WGI country context (network; review the diff before committing).
wgi:
    pnpm tsx scripts/wgi.ts

build: typecheck test overlap
    pnpm vite build
    pnpm tsx scripts/og.ts

preview:
    pnpm vite preview

# Build for the live site and publish it to Netlify (needs `netlify login`).
deploy:
    SITE_ORIGIN=https://12axes-squared.netlify.app BASE_PATH=/ just build
    netlify deploy --prod --no-build --dir dist --site 1c4ba7d9-e076-4624-a3f7-6d7da6803f43  # 12axes-squared

e2e:
    pnpm playwright test

# Needs `just dev` running. Writes to shots/ (gitignored) unless an out dir is given.
screenshots out="shots":
    pnpm tsx scripts/shots.ts http://localhost:21313/ {{out}}

# Needs `just dev` running. Compare page and cards for three simulated pairs, into shots/.
compare-shots out="shots":
    pnpm tsx scripts/compare-shots.ts http://localhost:21313/ {{out}}

# Needs `just dev` running. Seeds two runs and captures the runs pages into shots/.
history-shots out="shots":
    pnpm tsx scripts/history-shots.ts http://localhost:21313/ {{out}}
