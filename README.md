# n2b
Did you know that `0.1 + 0.2 == 0.3` equals `false` in JavaScript ([see this useful article](https://www.codemag.com/article/1811041/JavaScript-Corner-Math-and-the-Pitfalls-of-Floating-Point-Numbers))?

Did you also know that packages like [Big.js](https://www.npmjs.com/package/big.js) exists to deal with exact number issues like this?

Do you feel like an idiot for not noticing this issue sooner and now realize that your whole codebase is fucked (totally didn't happen to me btw)?

Then maybe this simple CLI tool (and library) may come to the rescue to convert your existing code to Bigs!

This utility uses the [TypeScript compiler API](https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API) under the hood, so it should be fast enough for tooling.

## Installation
Install the CLI application globally:

`$ npm install --global native-to-big`

Install the package locally, for programmatic purposes:

`$ npm install --save-dev native-to-big`

## Usage
### Library
```js
import { convert } from 'native-to-big';

// convert raw code & log the result to console
convert({
  sourceCode: 'const nr = 1 + 2 - 3;', 
  prependNew: true, 
  appendToNumber: true,
  onConverted: (file) => {
    console.log(file.getFullText(); // output: const nr = new Big(1).plus(2).minus(3).toNumber();
  },
});

// convert multiple files & write them to disk
convert({
  source: ['./src/**/*{.js,.ts}', './bin/main.ts'], 
  onConverted: (file) => file.saveSync(),
});

// convert multiple files from another TypeScript project & write them to disk
convert({
  sourceTsConfig: '/path/to/project/tsconfig.json',
  onConverted: (file) => file.saveSync(),
});
```

### CLI
Usage:

`$ n2b --help`

Examples:

```
$ n2b -sc 0.1 + 0.2
$ n2b -s ./src/**/*.ts --dryRun
$ n2b --prependNew --appendToNumber --sourceTsConfig ./tsconfig.json
```

### References
* [TypeScript AST viewer](https://ts-ast-viewer.com)

## TODO
This project is still **WIP**. I'd like to add the following tests before considering it production ready:
- Test complex math
- Test conversion of both TS and JS
- Test conversion of big projects (e.g. NestJS)
