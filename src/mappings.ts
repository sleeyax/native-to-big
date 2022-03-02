import { SyntaxKind } from 'ts-morph';

export const mappings: {[kind: number]: string} = {
  [SyntaxKind.MinusToken]: 'minus',
  [SyntaxKind.PlusToken]: 'plus',
  [SyntaxKind.SlashToken]: 'div',
  [SyntaxKind.AsteriskToken]: 'times',
  [SyntaxKind.GreaterThanToken]: 'gt',
  [SyntaxKind.LessThanToken]: 'lt',
  [SyntaxKind.PercentToken]: 'mod',
  [SyntaxKind.CaretToken]: 'pow',
  // TODO: support more expressions
};
