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

# Committed calibration uses 8000 draws: `CAL_DATE=<date> just calibrate --draws 8000`.
calibrate *args:
    pnpm tsx scripts/calibrate.ts {{args}}

# Core commitments vs simulated sincere adherents; add --write to move any over 2% into `dropped`.
commitments-audit *args:
    pnpm tsx scripts/commitments-audit.ts {{args}}

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

# Needs a dev server with the test fixture: `COMMITMENTS_FIXTURE=tests/fixtures/commitments.json just dev`.
# Seeds a run whose nearest match the fixture rules out; captures results, shared view, ideologies, method.
commitments-shots out="shots":
    pnpm tsx scripts/commitments-shots.ts http://localhost:21313/ {{out}}

# Needs a dev server with the test fixture (it lists red-line commitments): `COMMITMENTS_FIXTURE=tests/fixtures/commitments.json just dev`.
# Red-line intro card and statement, matrix Red lines column, Your red lines, share opt-in, shared panel.
redlines-shots out="shots":
    pnpm tsx scripts/redlines-shots.ts http://localhost:21313/ {{out}}

# Needs `just dev` running. Seeds two runs and captures the runs pages into shots/.
history-shots out="shots":
    pnpm tsx scripts/history-shots.ts http://localhost:21313/ {{out}}

# Needs `just dev` running. Every how-to step at desktop and phone width, dark and light, into shots/intro/.
intro-shots out="shots/intro":
    pnpm tsx scripts/intro-shots.ts http://localhost:21313/ {{out}}

# Needs `just dev` running. Post, story and wide share cards plus the comparison card, into shots/cards/.
card-shots out="shots/cards":
    pnpm tsx scripts/card-shots.ts http://localhost:21313/ {{out}}
