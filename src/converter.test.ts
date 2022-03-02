import convert from './converter';

test('it should convert additions', () => {
  const input = '1 + 2 + 3 + 4 + 5';
  const output = 'Big(1).plus(2).plus(3).plus(4).plus(5)';
  expect(convert(input)).toBe(output);
});

test('it should convert substractions', () => {
  const input = '5 - 4 - 3 - 2 - 1';
  const output = 'Big(5).minus(4).minus(3).minus(2).minus(1)';
  expect(convert(input)).toBe(output);
});

test('it should convert multiplications', () => {
  const input = '1 * 2 * 3 * 4 * 5';
  const output = 'Big(1).times(2).times(3).times(4).times(5)';
  expect(convert(input)).toBe(output);
});

test('it should convert divisions', () => {
  const input = '5 / 4 / 3 / 2 / 1';
  const output = 'Big(5).div(4).div(3).div(2).div(1)';
  expect(convert(input)).toBe(output);
});
