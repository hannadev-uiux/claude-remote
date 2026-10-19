// Executable of "Remote Harness.app": runs argv[1..] (node cli.js start …) as a child process.
//
// A script that execs node would make node the responsible process, so macOS privacy prompts
// would say "node". Staying alive as the parent keeps the signed bundle responsible: prompts and
// grants name "Remote Harness". Signals from launchd are forwarded and the child's status returned.
#include <errno.h>
#include <signal.h>
#include <spawn.h>
#include <stdio.h>
#include <string.h>
#include <sys/wait.h>
#include <unistd.h>

extern char **environ;

static volatile pid_t child = 0;

static void forward(int sig) {
  if (child > 0) kill(child, sig);
}

int main(int argc, char *argv[]) {
  if (argc < 2) {
    fprintf(stderr, "usage: %s <program> [args...]\n", argv[0]);
    return 64;
  }
  const int forwarded[] = {SIGTERM, SIGINT, SIGHUP, SIGQUIT, SIGUSR1, SIGUSR2};
  const size_t count = sizeof(forwarded) / sizeof(forwarded[0]);

  // Block the signals until the child exists, so none is lost between spawn and the handlers.
  sigset_t block, previous;
  sigemptyset(&block);
  for (size_t i = 0; i < count; i++) sigaddset(&block, forwarded[i]);
  sigprocmask(SIG_BLOCK, &block, &previous);

  struct sigaction action;
  memset(&action, 0, sizeof(action));
  action.sa_handler = forward;
  sigemptyset(&action.sa_mask);
  for (size_t i = 0; i < count; i++) sigaction(forwarded[i], &action, NULL);

  // The child starts with the default dispositions and the original mask.
  posix_spawnattr_t attr;
  posix_spawnattr_init(&attr);
  sigset_t defaults;
  sigemptyset(&defaults);
  for (size_t i = 0; i < count; i++) sigaddset(&defaults, forwarded[i]);
  posix_spawnattr_setsigdefault(&attr, &defaults);
  posix_spawnattr_setsigmask(&attr, &previous);
  posix_spawnattr_setflags(&attr, POSIX_SPAWN_SETSIGDEF | POSIX_SPAWN_SETSIGMASK);

  pid_t pid;
  int error = posix_spawn(&pid, argv[1], NULL, &attr, &argv[1], environ);
  posix_spawnattr_destroy(&attr);
  if (error != 0) {
    fprintf(stderr, "remote-harness: cannot start %s: %s\n", argv[1], strerror(error));
    return 127;
  }
  child = pid;
  sigprocmask(SIG_SETMASK, &previous, NULL);

  int status = 0;
  while (waitpid(pid, &status, 0) < 0) {
    if (errno != EINTR) return 1;
  }
  if (WIFEXITED(status)) return WEXITSTATUS(status);
  if (WIFSIGNALED(status)) {
    int sig = WTERMSIG(status);
    signal(sig, SIG_DFL);
    sigset_t unblock;
    sigemptyset(&unblock);
    sigaddset(&unblock, sig);
    sigprocmask(SIG_UNBLOCK, &unblock, NULL);
    raise(sig);
    return 128 + sig;
  }
  return 1;
}
