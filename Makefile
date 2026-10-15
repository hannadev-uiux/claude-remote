# Shortcuts for the common commands. `make` (or `make help`) lists them.
#
# Variables:
#   DEVICE=<name|udid>   phone or simulator for the app targets (default: Expo asks)
#   PLATFORM=ios|android publish-ota for a single platform (default: both)
#   CHANNEL=<name>       publish-ota channel (default: production; CI publishes development)
#   OTA_KEY=<path>       private key that signs OTA updates
#   CLAUDE_REMOTE_UPDATES_TOKEN must be in the environment for publish-ota (never stored here).

SHELL := /bin/bash
.DEFAULT_GOAL := help

MOBILE := apps/mobile
DAEMON := @claude-remote/daemon
APP := @claude-remote/mobile
OTA_KEY ?= $(HOME)/.claude-remote-keys/private-key.pem

device_flag = $(if $(DEVICE),--device "$(DEVICE)",--device)
platform_flag = $(if $(PLATFORM),--platform $(PLATFORM))
CHANNEL ?= production

.PHONY: help install check lint-fix openspec \
	daemon-dev daemon-build \
	start ios-dev android-dev prebuild ios-devices install-ios install-android \
	publish-ota publish-ota-dry

help: ## List the targets
	@if [ -t 1 ]; then c=$$'\033[38;2;217;119;87m'; r=$$'\033[0m'; b=$$'\033[1m'; fi; \
	awk -v c="$$c" -v r="$$r" -v b="$$b" 'BEGIN {FS = ":.*## "} \
		/^## / {printf "\n%s%s%s\n", b, substr($$0, 4), r} \
		/^[a-z][a-z-]*:.*## / {printf "  %s%-16s%s %s\n", c, $$1, r, $$2}' $(MAKEFILE_LIST)

## Workspace

install: ## Install the workspace dependencies (pnpm)
	pnpm install

check: ## Typecheck, tests and Biome (what CI runs)
	pnpm check

lint-fix: ## Biome with fixes
	pnpm lint:fix

openspec: ## Validate every OpenSpec spec and change
	npx -y openspec validate --all --strict

## Daemon

daemon-dev: ## Run the daemon from source on 127.0.0.1 (--dev)
	pnpm --filter $(DAEMON) dev start --dev

daemon-build: ## Build dist/cli.js (used by the service and the claude-remote shortcut)
	pnpm --filter $(DAEMON) build

## App

start: ## Metro for the development builds
	pnpm --filter $(APP) start

ios-dev: ## Development build on the iOS simulator or a connected iPhone (DEVICE=...)
	cd $(MOBILE) && npx expo run:ios $(if $(DEVICE),--device "$(DEVICE)")

android-dev: ## Development build on the emulator or a connected Android phone (DEVICE=...)
	cd $(MOBILE) && npx expo run:android $(if $(DEVICE),--device "$(DEVICE)")

prebuild: ## Regenerate ios/ and android/ from app.config.ts (after native changes)
	cd $(MOBILE) && npx expo prebuild --clean

ios-devices: ## iPhones Xcode knows and whether they can be built to
	@cd $(MOBILE) && npx tsx scripts/ios-devices.mts

install-ios: ## Release build on a connected iPhone, no Metro needed (fresh ios/, DEVICE=...)
	@# Picks a reachable iPhone first (or explains why DEVICE is not), instead of failing after the
	@# prebuild with xcodebuild error 70; Expo then gets its UDID and does not ask.
	@cd $(MOBILE) && udid=$$(npx tsx scripts/ios-devices.mts --udid $(if $(DEVICE),"$(DEVICE)")) && \
		npx expo prebuild --platform ios --clean && \
		npx expo run:ios --device "$$udid" --configuration Release

install-android: ## Release build on a connected Android phone (fresh android/)
	cd $(MOBILE) && npx expo prebuild --platform android --clean && \
		npx expo run:android $(device_flag) --variant release

## OTA updates

publish-ota: ## Publish the app JavaScript over the air (CHANNEL=production, PLATFORM=ios|android)
	@test -n "$$CLAUDE_REMOTE_UPDATES_TOKEN" || { echo "✗ set CLAUDE_REMOTE_UPDATES_TOKEN (the server's publish token)"; exit 1; }
	@test -f "$(OTA_KEY)" || { echo "✗ signing key not found: $(OTA_KEY) (OTA_KEY=...)"; exit 1; }
	CLAUDE_REMOTE_UPDATES_KEY="$(OTA_KEY)" pnpm --filter $(APP) ota:publish --channel $(CHANNEL) $(platform_flag)

publish-ota-dry: ## Export and sign without uploading (checks the key and the config)
	@test -f "$(OTA_KEY)" || { echo "✗ signing key not found: $(OTA_KEY) (OTA_KEY=...)"; exit 1; }
	CLAUDE_REMOTE_UPDATES_KEY="$(OTA_KEY)" pnpm --filter $(APP) ota:publish --channel $(CHANNEL) $(platform_flag) --dry-run
