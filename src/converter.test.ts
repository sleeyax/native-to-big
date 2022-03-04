import { convert, Options } from './converter';

const testData = './tests/data/';

const convertCode = (code: string, options?: Omit<Options, 'onConverted'>) => {
  let result = '';
  convert({...options, sourceCode: code, onConverted: (file) => result += file.getFullText()});
  return result;
}

const convertFiles = (files: string | readonly string[]) => {
  let output = '';
  convert({source: files, onConverted: (file) => output += file.getFullText()})
  return output;
};

describe('Convert simple mathematical expressions', () => {
  test('it should convert additions', () => {
    const input = '1 + 2 + 3 + 4 + 5';
    const output = 'Big(1).plus(2).plus(3).plus(4).plus(5)';
    expect(convertCode(input)).toBe(output);
  });

  test('it should convert substractions', () => {
    const input = '5 - 4 - 3 - 2 - 1';
    const output = 'Big(5).minus(4).minus(3).minus(2).minus(1)';
    expect(convertCode(input)).toBe(output);
  });

  test('it should convert multiplications', () => {
    const input = '1 * 2 * 3 * 4 * 5';
    const output = 'Big(1).times(2).times(3).times(4).times(5)';
    expect(convertCode(input)).toBe(output);
  });

  test('it should convert divisions', () => {
    const input = '5 / 4 / 3 / 2 / 1';
    const output = 'Big(5).div(4).div(3).div(2).div(1)';
    expect(convertCode(input)).toBe(output);
  });

  test('it should convert all simple expressions combined', () => {
    const input = '1 + 2 - 3 * 4 / 5';
    const output = 'Big(1).plus(2).minus(Big(3).times(4).div(5))';
    expect(convertCode(input)).toBe(output);
  });

  test('it should convert modulus', () => {
    const input = '10 % 5';
    const output = 'Big(10).mod(5)';
    expect(convertCode(input)).toBe(output);
  });

  test('it should convert to the power', () => {
    const input = '2 ^ 5';
    const output = 'Big(2).pow(5)';
    expect(convertCode(input)).toBe(output);
  });
});

describe('Convert comparisons', () => {
  test('it should convert equals', () => {
    const inputs = ['1 + 1 == 2', '1 + 1 === 2'];
    const output = 'Big(1).plus(1).eq(2)';
    for (const input of inputs) {
      expect(convertCode(input)).toBe(output);
    }
  });

  test('it should convert greather than', () => {
    const input = '1 + 1 > 2';
    const output = 'Big(1).plus(1).gt(2)';
    expect(convertCode(input)).toBe(output);
  });

  test('it should convert greather than or equals', () => {
    const input = '1 + 1 >= 2';
    const output = 'Big(1).plus(1).gte(2)';
    expect(convertCode(input)).toBe(output);
  });

  test('it should convert less than', () => {
    const input = '1 + 1 < 2';
    const output = 'Big(1).plus(1).lt(2)';
    expect(convertCode(input)).toBe(output);
  });

  test('it should convert less than or equals', () => {
    const input = '1 + 1 <= 2';
    const output = 'Big(1).plus(1).lte(2)';
    expect(convertCode(input)).toBe(output);
  });
});

describe('Convert Math library', () => {
  test('it should convert Math.abs', () => {
    const input = 'Math.abs(0 - 1)';
    const output = 'Big(0).minus(1).abs()';
    expect(convertCode(input)).toBe(output);
  });

  test('it should convert Math.sqrt', () => {
    const input = 'Math.sqrt(2 * 2)';
    const output = 'Big(2).times(2).sqrt()';
    expect(convertCode(input)).toBe(output);
  });

  test('it should convert multiple Math operations', () => {
    const input = `
      const x = Math.sqrt(2 * 2);
      const y = Math.abs(0 - 1 - 2 + 1);
    `;
    expect(convertCode(input)).toContain('Big(2).times(2).sqrt()');
    expect(convertCode(input)).toContain('Big(0).minus(1).minus(2).plus(1).abs()');
  });
});

describe('Convert files', () => {
  test('it should convert a javascript file', () => {
    const input = testData + 'sum.js';
    const output = 'const sum = Big(0.1).plus(0.2).plus(0.3);';
    expect(convertFiles(input)).toBe(output);
  });

  test('it should convert a typescript file', () => {
    const input = testData + 'sum.ts';
    const output = 'const sum = Big(0.1).plus(0.2).plus(0.3);';
    expect(convertFiles(input)).toBe(output);
  });

  test('it should convert multiple files', () => {
    const input = testData + 'dir/**/*{.js,.ts}'
    expect(convertFiles(input)).toContain('const div = Big(10).div(2).div(1);')
    expect(convertFiles(input)).toContain('const minus = Big(3).minus(2).minus(1);')
  });
});

describe('Convert non-literals', () => {
  test('it should convert values returned from a function', () => {
    const input = `
      const x  = () => 1;
      const y = () => 2;
      x() + y() + 3;
    `;
    const output = 'Big(x()).plus(y()).plus(3)'
    expect(convertCode(input)).toContain(output);
  });

  test('it should convert values returned from an object', () => {
    const input = `
      const obj  = {one: 1, two: 2};
      obj.one + obj.two;
    `;
    const output = 'Big(obj.one).plus(obj.two)'
    expect(convertCode(input)).toContain(output);
  });
});

describe('Convert assignments', () => {
  test('it should wrap one-value assignments into Bigs when configured', () => {
    const input = 'let total = 0';
    const output = 'let total = Big(0)';
    expect(convertCode(input, {variables: ['total']})).toBe(output);
  });

  test('it should convert addition assingment', () => {
    const input = 'let total = 0; total += 1 + 2;';
    const output = 'let total = Big(0); total = total.plus(Big(1).plus(2));';
    expect(convertCode(input, {variables: ['total']})).toBe(output);
  });

  test('it should convert substraction assingment', () => {
    const input = 'let total = 0; total -= 1 + 2;';
    const output = 'let total = Big(0); total = total.minus(Big(1).plus(2));';
    expect(convertCode(input, {variables: ['total']})).toBe(output);
  });

  test('it should convert multiplication assingment', () => {
    const input = 'let total = 0; total *= 1 + 2;';
    const output = 'let total = Big(0); total = total.times(Big(1).plus(2));';
    expect(convertCode(input, {variables: ['total']})).toBe(output);
  });

  test('it should convert division assingment', () => {
    const input = 'let total = 0; total /= 1 + 2;';
    const output = 'let total = Big(0); total = total.div(Big(1).plus(2));';
    expect(convertCode(input, {variables: ['total']})).toBe(output);
  });

  test('it should convert remainder assingment', () => {
    const input = 'let total = 0; total %= 1 + 2;';
    const output = 'let total = Big(0); total = total.mod(Big(1).plus(2));';
    expect(convertCode(input, {variables: ['total']})).toBe(output);
  });
});

test('it should include original source code', () => {
  const input = `
    const foo = 'bar';
    const baz = 1;
    const expr = 1 + 1;
  `;
  expect(convertCode(input)).toContain(`const foo = 'bar';`);
  expect(convertCode(input)).toContain(`const baz = 1;`);
});

test('it should prepend new', () => {
  const input = '1 - 1';
  expect(convertCode(input, {prependNew: true})).toMatch(/^new/);
});

test('it should append toNumber()', () => {
  const input = '1 + 2 - 3';
  expect(convertCode(input, {appendToNumber: true})).toMatch(/toNumber\(\)$/);
});
