// Writes each test's name, state and error messages. Vitest's JSON reporter writes the stack alone, which has no message in
// Firefox and WebKit. A run without a result has no tests.
import { writeFileSync } from 'node:fs';

export default class MessagesReporter {
  onTestRunEnd(modules, unhandled) {
    const tests = modules.flatMap((m) =>
      [...m.children.allTests()].map((t) => ({
        name: t.fullName,
        state: t.result().state,
        messages: (t.result().errors ?? []).map((e) => e.message),
      })),
    );
    writeFileSync(
      process.env.MESSAGES_FILE,
      JSON.stringify({ tests, unhandled: unhandled.map((e) => e.message) }),
    );
  }
}
