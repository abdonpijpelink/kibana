/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const ChildProcess = require('child_process');
const Readline = require('readline');

/**
 * Print each line of output to the console
 * @param {import('stream').Readable} stream
 * @param {string | undefined} prefix
 */
async function printLines(stream, prefix) {
  const int = Readline.createInterface({
    input: stream,
    crlfDelay: Infinity,
  });

  for await (const line of int) {
    console.log(prefix ? `${prefix} ${line}` : line);
  }
}

/**
 * Buffer each line of output to an array so that it can be printed if necessary
 * @param {import('stream').Readable} stream
 * @param {string[]} buffer
 */
async function bufferLines(stream, buffer) {
  const int = Readline.createInterface({
    input: stream,
    crlfDelay: Infinity,
  });

  for await (const line of int) {
    buffer.push(line);
  }
}

/**
 * @param {import('events').EventEmitter} emitter
 * @param {string} event
 * @returns {Promise<any>}
 */
function once(emitter, event) {
  return new Promise((resolve) => {
    emitter.once(event, resolve);
  });
}

/**
 * @param {'bazel' | 'ibazel'} runner
 * @param {string[]} args
 * @param {import('./types').BazelRunOptions | undefined} options
 */
async function runBazelRunner(runner, args, options = undefined) {
  const proc = ChildProcess.spawn(runner, args, {
    env: {
      ...process.env,
      ...options?.env,
    },
    cwd: options?.cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  /** @type {string[]} */
  const buffer = [];

  await Promise.all([
    options?.quiet
      ? Promise.all([bufferLines(proc.stdout, buffer), bufferLines(proc.stderr, buffer)])
      : Promise.all([
          printLines(proc.stdout, options?.logPrefix),
          printLines(proc.stderr, options?.logPrefix),
        ]),

    // Wait for process to exit, or error
    Promise.race([
      once(proc, 'exit').then((code) => {
        if (typeof code !== 'number' || code === 0) {
          return;
        }

        if (options?.onErrorExit) {
          options.onErrorExit(code, buffer.join('\n'));
        } else {
          throw new Error(
            `The bazel command that was running exitted with code [${code}]${
              buffer.length ? `\n  output:\n${buffer.map((l) => `    ${l}`).join('\n')}` : ''
            }`
          );
        }
      }),

      once(proc, 'error').then((error) => {
        throw error;
      }),
    ]),
  ]);
}

/**
 * @param {string[]} args
 * @param {import('./types').BazelRunOptions | undefined} options
 */
async function runBazel(args, options = undefined) {
  return await runBazelRunner('bazel', args, options);
}

/**
 * @param {string[]} args
 * @param {import('./types').BazelRunOptions | undefined} options
 */
async function runIBazel(args, options = undefined) {
  return await runBazelRunner('ibazel', args, {
    ...options,
    env: {
      IBAZEL_USE_LEGACY_WATCHER: '0',
      ...options?.env,
    },
  });
}

module.exports = { runBazel, runIBazel };
