#!/usr/bin/env node

import { program } from 'commander';
import { version, description } from '../package.json';
import { convert, Options, sourceCodeFileName } from '../src/converter';

program
  .name('n2b')
  .version(version)
  .description(description)
  .usage('-s ./src/**/*{.ts,.js}')
  .option('-s, --source <file paths or glob patterns...>', 'source file(s) to convert')
  .option('-sc, --sourceCode <raw code>', 'raw source code to convert')
  .option('-stc, --sourceTsConfig <tsconfig.json>', 'path to tsconfig.json to use for conversion')
  .option('--prependNew', `explicitly append the 'new' keyword to the resulting Big`)
  .option('--appendToNumber', 'convert the resulting Big to a number')
  .option('--dryRun', 'log to console instead of writing to disk')
  .parse();

const options: Options & {dryRun?: boolean} = program.opts();

convert({...options, onConverted: (file) => {
  if(file.getBaseName() === sourceCodeFileName) {
    console.log(file.getFullText());
    return;
  }

  if (options.dryRun) {
    console.log('// ' + file.getFilePath());
    console.log(file.getFullText());
  } else {
    file.saveSync();
  }
}});
