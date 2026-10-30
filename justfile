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

build: typecheck test overlap
    pnpm vite build
    pnpm tsx scripts/og.ts

preview:
    pnpm vite preview

e2e:
    pnpm playwright test

screenshots:
    pnpm playwright test e2e/screenshots.spec.ts
