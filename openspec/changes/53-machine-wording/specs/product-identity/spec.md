## ADDED Requirements

### Requirement: Machine wording
User-facing texts of the app SHALL call the paired computer "machine" and MUST NOT say "daemon". Wherever a sentence refers to it, the app SHALL use the machine name: the alias chosen in the app when one exists, else the host name the daemon reports in `auth.ok`, else the generic "your machine" (translated; capitalized at the start of a sentence). The catalogs SHALL express this with `{{machine}}` / `{{Machine}}` placeholders that resolve automatically, so every call site keeps calling `t(key)`. Settings SHALL title the connection section "Machine", show the host name, and offer "Forget this machine". Texts that ask the user to run a command SHALL keep the command verbatim and say where to run it. Code identifiers, protocol fields and the CLI's own texts are not covered.

#### Scenario: Connecting with a known host
- **WHEN** the app reconnects to a computer whose host name is "MacBook Pro"
- **THEN** the banner reads "connecting to MacBook Pro…" and a timeout reads "MacBook Pro did not respond."

#### Scenario: Pairing before any handshake
- **WHEN** the pairing screen cannot reach the computer
- **THEN** the error reads "Couldn't connect to your machine." (pt-BR "sua máquina", es-ES "tu máquina")

#### Scenario: Explicit variable
- **WHEN** a call site passes `{ machine: 'Studio' }`
- **THEN** that value is used instead of the registered name

#### Scenario: Settings
- **WHEN** Settings opens while connected to "MacBook Pro"
- **THEN** the first section is "Machine" with the row "name · MacBook Pro" and the destructive button "Forget this machine"
