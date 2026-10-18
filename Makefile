# Shortcuts for the common commands. `make` (or `make help`) lists them.
#
# Variables:
#   DEVICE=<name|udid>   phone or simulator for the app targets (default: Expo asks)
#   PLATFORM=ios|android publish-ota for a single platform (default: both)
#   CHANNEL=<name>       publish-ota channel (default: production; CI publishes development)
#   OTA_KEY=<path>       private key that signs OTA updates
#   IOS_LINK=web         install-ios-link publishes on https://remoteharness.app/ios/<token>/ (R2) instead of the tailnet
#   IOS_LINK_DIR=<path>  folder install-ios-link builds into and serves on the tailnet (default ~/.remote-harness-builds/ios)
#   PROJECT=<id>         Firebase project for deploy-push-relay
#   REMOTE_HARNESS_UPDATES_TOKEN (or the older CLAUDE_REMOTE_UPDATES_TOKEN) must be in the environment for publish-ota (never stored here).

SHELL := /bin/bash
.DEFAULT_GOAL := help

MOBILE := apps/mobile
# Xcode workspace, scheme and product; `expo prebuild` derives it from the app name in app.config.ts.
IOS_APP := RemoteHarness
DAEMON := @remote-harness/daemon
APP := @remote-harness/mobile
# ~/.remote-harness-keys, or the folder used before the rename when only that one exists.
OTA_KEY ?= $(if $(wildcard $(HOME)/.remote-harness-keys/private-key.pem),$(HOME)/.remote-harness-keys,$(if $(wildcard $(HOME)/.claude-remote-keys/private-key.pem),$(HOME)/.claude-remote-keys,$(HOME)/.remote-harness-keys))/private-key.pem
IOS_LINK_DIR ?= $(HOME)/.remote-harness-builds/ios

device_flag = $(if $(DEVICE),--device "$(DEVICE)",--device)
platform_flag = $(if $(PLATFORM),--platform $(PLATFORM))
ios_link_flag = $(if $(filter web,$(IOS_LINK)),--web)
CHANNEL ?= production

.PHONY: help install check lint-fix openspec \
	daemon-dev daemon-build \
	start ios-dev android-dev prebuild ios-devices install-ios install-ios-link install-android \
	publish-ota publish-ota-dry \
	deploy-push-relay

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

daemon-build: ## Build dist/cli.js (used by the service and the remote-harness shortcut)
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

install-ios: ## Release build on a connected iPhone/iPad, no Metro needed (fresh ios/, DEVICE=...)
	@# Picks a reachable device first (or explains why DEVICE is not), instead of failing after the
	@# prebuild. Builds with xcodebuild itself: once APPLE_TEAM_ID pins the team, `expo run:ios` no
	@# longer passes the provisioning flags, so newly registered devices would never be added.
	@cd $(MOBILE) && udid=$$(npx tsx scripts/ios-devices.mts --udid $(if $(DEVICE),"$(DEVICE)")) && \
		npx expo prebuild --platform ios --clean && \
		echo "▸ xcodebuild (Release) for $$udid" && \
		xcodebuild -quiet -workspace ios/$(IOS_APP).xcworkspace -scheme $(IOS_APP) \
			-configuration Release -destination "id=$$udid" -derivedDataPath ios/build \
			-allowProvisioningUpdates -allowProvisioningDeviceRegistration build && \
		xcrun devicectl device install app --device "$$udid" \
			ios/build/Build/Products/Release-iphoneos/$(IOS_APP).app && \
		xcrun devicectl device process launch --device "$$udid" tech.doctorx.clauderemote

install-ios-link: ## Release build the iPhone installs from a Safari link (Tailscale, or IOS_LINK=web on remoteharness.app)
	@# Development-signed like install-ios: the iPhone must already be registered in the team (one
	@# `make install-ios` with the cable does it). Tailscale needs HTTPS certificates on.
	@cd $(MOBILE) && npx tsx scripts/ios-link.mts $(ios_link_flag) --check && \
		npx expo prebuild --platform ios --clean && \
		echo "▸ xcodebuild archive (Release)" && \
		xcodebuild -quiet -workspace ios/$(IOS_APP).xcworkspace -scheme $(IOS_APP) \
			-configuration Release -destination generic/platform=iOS -derivedDataPath ios/build \
			-archivePath ios/build/$(IOS_APP).xcarchive -allowProvisioningUpdates archive && \
		npx tsx scripts/ios-link.mts $(ios_link_flag) ios/build/$(IOS_APP).xcarchive "$(IOS_LINK_DIR)"

install-android: ## Release build on a connected Android phone (fresh android/)
	cd $(MOBILE) && npx expo prebuild --platform android --clean && \
		npx expo run:android $(device_flag) --variant release

## OTA updates

publish-ota: ## Publish the app JavaScript over the air (CHANNEL=production, PLATFORM=ios|android)
	@test -n "$$REMOTE_HARNESS_UPDATES_TOKEN$$CLAUDE_REMOTE_UPDATES_TOKEN" || { echo "✗ set REMOTE_HARNESS_UPDATES_TOKEN (the server's publish token)"; exit 1; }
	@test -f "$(OTA_KEY)" || { echo "✗ signing key not found: $(OTA_KEY) (OTA_KEY=...)"; exit 1; }
	REMOTE_HARNESS_UPDATES_KEY="$(OTA_KEY)" pnpm --filter $(APP) ota:publish --channel $(CHANNEL) $(platform_flag)

publish-ota-dry: ## Export and sign without uploading (checks the key and the config)
	@test -f "$(OTA_KEY)" || { echo "✗ signing key not found: $(OTA_KEY) (OTA_KEY=...)"; exit 1; }
	REMOTE_HARNESS_UPDATES_KEY="$(OTA_KEY)" pnpm --filter $(APP) ota:publish --channel $(CHANNEL) $(platform_flag) --dry-run

## Push relay

deploy-push-relay: ## Deploy the push relay Cloud Function (PROJECT=<firebase project id>; needs `firebase login`)
	@test -n "$(PROJECT)" || { echo "✗ set PROJECT=<firebase project id>"; exit 1; }
	npx -y firebase-tools@15 deploy --only functions:push-relay --project "$(PROJECT)"
