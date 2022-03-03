import { SyntaxKind } from 'ts-morph';

export const mapSyntaxKind: {[kind: number]: string} = {
  [SyntaxKind.MinusToken]: 'minus',
  [SyntaxKind.PlusToken]: 'plus',
  [SyntaxKind.SlashToken]: 'div',
  [SyntaxKind.AsteriskToken]: 'times',
  [SyntaxKind.PercentToken]: 'mod',
  [SyntaxKind.CaretToken]: 'pow',
  [SyntaxKind.EqualsEqualsEqualsToken]: 'eq',
  [SyntaxKind.EqualsEqualsToken]: 'eq',
  [SyntaxKind.LessThanToken]: 'lt',
  [SyntaxKind.LessThanEqualsToken]: 'lte',
  [SyntaxKind.GreaterThanToken]: 'gt',
  [SyntaxKind.GreaterThanEqualsToken]: 'gte',
};
