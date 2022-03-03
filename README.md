# n2b
Do you know that `0.1 + 0.2 == 0.3` equals `false` in JavaScript ([see this useful article](https://www.codemag.com/article/1811041/JavaScript-Corner-Math-and-the-Pitfalls-of-Floating-Point-Numbers))?

Do you also know that packages like [Big.js](https://www.npmjs.com/package/big.js) exists to deal with exact number issues like this?

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
import {convert} from 'native-to-big';

const options = {prependNew: true, appendToNumber: true};
const source = 'const nr = 1 + 2 - 3;';
const sourceWithBig = convert(source, options);
console.log(sourceWithBig); 
// Output: const nr = new Big(1).plus(2).minus(3).toNumber();
```

### CLI
Usage:

`$ n2b --help`

Examples:

```
$ n2b -s 0.1 + 0.2
$ n2b -s ./src/**/*.ts
$ n2b --prependNew --appendToNumber --source '1 + 2 - 1 / 3 * 4'
```

### References
* [TypeScript AST viewer](https://ts-ast-viewer.com)

## TODO
This project is still **WIP**. Basic conversions should work, but I'd like to (at least) add the following features and tests before considering it production ready:
- Test complex math
- Test conversion of both TS and JS
- Test conversion of big projects (e.g. NestJS)
