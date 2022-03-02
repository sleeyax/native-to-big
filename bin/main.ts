#!/usr/bin/env node

import { program } from 'commander';
import { name, version, description } from '../package.json';
import convert from '../src/converter';

program
  .name(name)
  .version(version)
  .description(description)
  .option('-s, --sources <glob pattern or source code>', 'source file(s) or code to convert')
  .parse();

const options: {sources: string} = program.opts();

console.log(convert(options.sources));
