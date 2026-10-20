## MODIFIED Requirements

### Requirement: Daemon running on Windows logon
On WSL the setup SHALL offer systemd in WSL and an optional logon task so the daemon runs without opening a terminal. The task SHALL be named "Remote Harness"; a task named "Claude Remote" (created before the rename) SHALL count as the logon task, be deleted when the task is created again and be removed by `service uninstall` too.

#### Scenario: Logon task
- **WHEN** the user accepts the logon task
- **THEN** a "Remote Harness" scheduled task starts the WSL distribution at logon and `service uninstall` removes it

#### Scenario: Task from before the rename
- **WHEN** a machine has the "Claude Remote" task and the setup creates the logon task again
- **THEN** the "Remote Harness" task is created and the "Claude Remote" one is deleted
