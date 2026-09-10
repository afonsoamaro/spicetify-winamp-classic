// @ts-check
// Shared entry-point helpers for the scripts in this folder.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * True when the module at `moduleUrl` is the one Node was told to run, so a
 * script can export its functions and still do work when invoked directly.
 * @param {string} moduleUrl
 * @returns {boolean}
 */
export function isMain(moduleUrl) {
  const entry = process.argv[1];
  return entry !== undefined && moduleUrl === pathToFileURL(entry).href;
}

/**
 * Absolute path of the repo root, resolved from a module inside scripts/.
 * @param {string} moduleUrl
 * @returns {string}
 */
export function repoRoot(moduleUrl) {
  return path.resolve(path.dirname(fileURLToPath(moduleUrl)), '..');
}
