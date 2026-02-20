import { spawn } from 'node:child_process';
import { parseArgs } from 'node:util';

const cliArgs = process.argv.slice(2);

const { values } = parseArgs({
  args: cliArgs,
  options: {
    inspect: {
      type: 'boolean',
      default: false,
    },
  },
  allowPositionals: true,
  strict: false,
});

const forwardedArgs = cliArgs.filter((arg) => arg !== '--inspect');

const child = spawn('storybook', forwardedArgs, {
  stdio: 'inherit',
  env: {
    ...process.env,
    MX_VITE_INSPECT: values.inspect === true ? 'true' : '',
  },
});

child.on('error', (error) => {
  console.error(error);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal !== null) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
