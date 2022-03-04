import { SyntaxKind } from 'ts-morph';

export const mapSyntaxKind: {[kind: number]: string} = {
  [SyntaxKind.MinusToken]: 'minus',
  [SyntaxKind.MinusEqualsToken]: 'minus',
  [SyntaxKind.PlusToken]: 'plus',
  [SyntaxKind.PlusEqualsToken]: 'plus',
  [SyntaxKind.SlashToken]: 'div',
  [SyntaxKind.SlashEqualsToken]: 'div',
  [SyntaxKind.AsteriskToken]: 'times',
  [SyntaxKind.AsteriskEqualsToken]: 'times',
  [SyntaxKind.PercentToken]: 'mod',
  [SyntaxKind.PercentEqualsToken]: 'mod',
  [SyntaxKind.CaretToken]: 'pow',
  [SyntaxKind.EqualsEqualsEqualsToken]: 'eq',
  [SyntaxKind.EqualsEqualsToken]: 'eq',
  [SyntaxKind.LessThanToken]: 'lt',
  [SyntaxKind.LessThanEqualsToken]: 'lte',
  [SyntaxKind.GreaterThanToken]: 'gt',
  [SyntaxKind.GreaterThanEqualsToken]: 'gte',
};
