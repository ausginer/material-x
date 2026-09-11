import type { Plugin } from 'vite';
import type {
  Reporter,
  TestModule,
  TestProject,
  TestSpecification,
} from 'vitest/node';

// Set to `1` to print one line per released browser provider. The mechanism is
// otherwise silent, and Chrome returning to its baseline process count is the
// primary evidence that it ran.
const logging = process.env['MX_TEST_TEARDOWN_LOG'] === '1';

function isBrowserProject(project: TestProject): boolean {
  return project.config.browser.enabled;
}

/**
 * One test run per Vitest process, and one browser provider released per group
 * boundary.
 *
 * Both live in one reporter because both need `onTestRunStart` — the earliest
 * per-run hook, reached from `Vitest.runFiles` before the pool is created — and
 * the runtime project objects that only a reporter is handed.
 */
class OneShotTestExecution implements Reporter {
  /**
   * A run whose specification list is empty executes nothing, so it does not
   * spend the process's single execution.
   */
  #consumed = false;

  /** The highest `groupOrder` whose first module has started. */
  #group = 0;

  /** Browser projects still holding a provider, by their group. */
  readonly #holding = new Map<number, TestProject[]>();

  /** Projects whose provider has been released. Keyed by object identity: one
   * configured browser project expands to one runtime project per instance,
   * and only the runtime object identifies which. */
  readonly #released = new Set<TestProject>();

  onTestRunStart(specifications: readonly TestSpecification[]): void {
    if (specifications.length === 0) {
      return;
    }

    if (this.#consumed) {
      throw new Error(
        'this Vitest process has already executed a test run. Test watch and ' +
          'VS Code Continuous Run are retired: every Vitest process this ' +
          'repository starts runs once, releases its browser providers and ' +
          'ends. Start a new process for the next run.',
      );
    }

    const projects = new Set(specifications.map(({ project }) => project));
    const reused = [...projects].filter((project) =>
      this.#released.has(project),
    );

    if (reused.length) {
      throw new Error(
        `${reused
          .map((project) => `project "${project.name}"`)
          .join(', ')} was torn down and cannot run again`,
      );
    }

    const browsers = [...projects].filter(isBrowserProject);
    const byOrder = Map.groupBy(
      browsers,
      (project) => project.config.sequence.groupOrder,
    );
    // Zero is Vitest's default sentinel rather than a number: a project
    // carrying it is diverted into a trailing catch-all group, which both
    // destroys the serialization and hides that it is gone.
    const erased = browsers.filter((project) => {
      const { groupOrder } = project.config.sequence;

      return groupOrder === 0 || byOrder.get(groupOrder)!.length > 1;
    });

    if (erased.length) {
      throw new Error(
        `browser projects must each have a distinct non-zero ` +
          `sequence.groupOrder, so that they are serialized and each ` +
          `provider is released at a group boundary. These do not: ` +
          `${erased
            .map(
              (project) =>
                `"${project.name}" (${project.config.sequence.groupOrder})`,
            )
            .join(', ')}. A --sequence.* flag on the command line replaces ` +
          `the configured sequence object wholesale and erases it.`,
      );
    }

    this.#consumed = true;

    for (const project of browsers) {
      const { groupOrder } = project.config.sequence;
      const group = this.#holding.get(groupOrder);

      if (group) {
        group.push(project);
      } else {
        this.#holding.set(groupOrder, [project]);
      }
    }
  }

  /**
   * The first module of a later group provably follows the completion of every
   * earlier one: `groupSpecs` awaits the whole group before the next begins, so
   * by here every page, orchestrator RPC and pool promise of the earlier group
   * has settled. Closing a provider from `onTestModuleEnd` instead destroys the
   * page that is still awaiting the reply to its own RPC.
   */
  async onTestModuleStart(testModule: TestModule): Promise<void> {
    const order = testModule.project.config.sequence.groupOrder;

    if (order <= this.#group) {
      return;
    }

    const boundary = `${this.#group}->${order}`;
    const releasing: Array<Promise<void>> = [];

    this.#group = order;

    for (const [group, projects] of this.#holding) {
      if (group >= order) {
        continue;
      }

      this.#holding.delete(group);

      for (const project of projects) {
        releasing.push(this.#release(project, group, boundary));
      }
    }

    // Together rather than in sequence: every group being released has already
    // completed, so no two of these releases can observe each other.
    await Promise.all(releasing);
  }

  async #release(
    project: TestProject,
    group: number,
    boundary: string,
  ): Promise<void> {
    const { browser } = project;

    if (browser) {
      // The provider is what owns Chromium. `ProjectBrowser.close()` closes the
      // parent Vite dev server instead, which releases no browser and wedges
      // the run from the second call onward. The orchestrators go with it, as
      // they do when the pool releases the same provider at the end of a run.
      await browser.provider.close();

      for (const orchestrator of browser.state.orchestrators.values()) {
        orchestrator.$close();
      }
    }

    this.#released.add(project);

    if (logging) {
      // oxlint-disable-next-line no-console
      console.error(
        `closed ${project.name} (group ${group}) at boundary ${boundary}`,
      );
    }
  }
}

/**
 * Installs the one-shot contract as a reporter instance.
 *
 * A configured `test.reporters` entry is one `--reporter` flag away from being
 * replaced wholesale, taking the contract with it. `configureVitest` runs after
 * that replacement and before the reporter list is read, so a reporter pushed
 * here cannot be removed from the command line. What is pushed must be an
 * instance: string normalization happens in `resolveConfig`, which has already
 * run, and a string arriving at `Vitest.report` resolves to `undefined` and
 * silently does nothing — the one outcome this contract may not have.
 *
 * Belongs in the base configuration every project derives from. Hooks are
 * gathered per project, so a project carrying no plugins — every node and
 * declaration project — would otherwise run with no contract at all.
 */
export function oneShotTestExecution(): Plugin {
  return {
    name: 'ydin-one-shot-test-execution',
    // Invoked once per project, so the push is guarded: an unguarded one
    // installs a reporter per project.
    configureVitest({ vitest }) {
      const { reporters } = vitest.config;

      if (!reporters.some((r) => r instanceof OneShotTestExecution)) {
        reporters.push(new OneShotTestExecution());
      }
    },
  };
}
