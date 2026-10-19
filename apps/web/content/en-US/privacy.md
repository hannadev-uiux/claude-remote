---
title: Privacy policy
description: What Remote Harness collects (only the error reports you agree to send), what stays on your devices, what leaves your machine and when, and how to reach us.
applies: 0.7+
---

Remote Harness is self-hosted software: the daemon runs on your computer, the app on your phone, and they talk over your own Tailscale network. This page is the privacy policy of the app distributed through the stores, of the daemon, and of this website. Last updated on 2026-10-19.

## What we collect

Only the error reports you agree to send. There is no account, no analytics and no telemetry in the app, in the daemon or on this website. The maintainers never receive your conversations, your files, your prompts, your tokens or your keys.

**Error reports (opt-in).** The app keeps a small log of its own errors on the phone. It sends them to Firebase Crashlytics (Google) only as you choose in Settings → Error reports: after asking you, which is the default, automatically, or never. A report holds the time and kind of error, the error name, a scrubbed message and stack, the failed request type and error code, the screen's route pattern, and the app, update, OS and daemon versions; Crashlytics adds the device model and an installation id. Reports never include prompts, conversation, terminal output, commands, file paths, project or session names, tokens or pairing data. Settings → Report a problem also lets you share a report yourself or post it as a GitHub issue. Google's handling of Crashlytics data is covered by Google's privacy policy.

## What stays on your devices

- On the phone: the pairing token (in the system's secure storage), the app's preferences (theme, language, machine name, notification and error report choices), the log of the app's own errors, and nothing from the conversations beyond what is on screen.
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
