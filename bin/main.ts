#!/usr/bin/env node

import { program } from 'commander';
import { version, description } from '../package.json';
import { convert, Options } from '../src/converter';

program
  .name('n2b')
  .version(version)
  .description(description)
  .usage('-s ./src/**/*.ts')
  .option('-s, --source <glob pattern or source code>', 'source file(s) or code to convert')
  .option('--prependNew', `explicitly append the 'new' keyword to the resulting Big`)
  .option('--appendToNumber', 'convert the resulting Big to a number')
  .parse();

const {source, ...options}: Options = program.opts();

console.log(convert(source, options));
