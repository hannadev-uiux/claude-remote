---
title: Privacy policy
description: What Remote Harness collects (nothing), what stays on your devices, what leaves your machine and when, and how to reach us.
applies: 0.7+
---

Remote Harness is self-hosted software: the daemon runs on your computer, the app on your phone, and they talk over your own Tailscale network. This page is the privacy policy of the app distributed through the stores, of the daemon, and of this website. Last updated on 2026-10-18.

## What we collect

Nothing. There is no account, no analytics, no crash reporting and no telemetry in the app, in the daemon or on this website. The maintainers never receive your conversations, your files, your prompts, your tokens or your keys.

## What stays on your devices

- On the phone: the pairing token (in the system's secure storage), the app's preferences (theme, language, machine name, notification choices) and nothing from the conversations beyond what is on screen.
- On the computer: the daemon's configuration, the list of known sessions, its logs, and the provider keys in the OS secret store.

Deleting the app and running `remote-harness uninstall` remove them.

## What leaves your machine, and when

- **Between your phone and your computer**: the conversation, the permissions you answer and the prompts you send travel only over your Tailscale network, authenticated with the pairing token. Nothing of it reaches us.
- **Push notifications (optional)**: a title, the profile name, the session id and the event type go through Firebase Cloud Messaging (Google) to your phone; the live status adds the session title, the folder, the state and the step category. The push relay is a small service we run that forwards those same messages and stores nothing; with your own Firebase project, nothing passes through us. Google's handling of Firebase Cloud Messaging is covered by Google's privacy policy.
- **Updates**: the daemon checks the git remote of the installed source for new versions; the app checks the update server configured in its build for new JavaScript (the request carries the app version and platform, no personal data).
- **OpenRouter profiles (optional)**: the model catalog and credits requests go from your computer to OpenRouter with your key; no model traffic passes through us.
- **This website**: served by Cloudflare, which logs requests like any host; the fonts come from Google Fonts. No cookies, no analytics.

## Permissions the app asks for

- **Camera**: to scan the pairing code and attach photos to a prompt.
- **Microphone and speech recognition**: to dictate prompts; the transcription runs on the device.
- **Notifications**: for push and the live status, which you can turn off at any time.

## Children

Remote Harness is not directed at children under 13 and collects no data from anyone.

## Changes and contact

This policy changes only through the [repository](https://github.com/maarkN/remote-harness), where its history is public. Questions go to a GitHub issue; security reports go through [GitHub Security Advisories](https://github.com/maarkN/remote-harness/security/advisories/new), as described in [Security & privacy](/en/docs/security/).
