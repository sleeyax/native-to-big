import { Node, Project, SyntaxKind } from "ts-morph";
import { mappings } from './mappings';

const getLiteralValueOrThrow = (node: Node) => node.asKindOrThrow(SyntaxKind.NumericLiteral).getLiteralValue();

function traverseBinaryExpression(node: Node): string {
  const firstChild = node.getFirstChildOrThrow();

  // TODO: maybe construct new AST nodes instead of working with text
  let result = firstChild.getKind() === SyntaxKind.BinaryExpression ? traverseBinaryExpression(firstChild) : ('Big(' + getLiteralValueOrThrow(firstChild) + ')');

  const children = node.getChildren();
  for (let i = 1; i < children.length; i++) {
    const child = children[i];

    const expr = mappings[child.getKind()];
    if (!expr) throw new Error(`Expression of kind '${child.getKindName()}' is not supported!`);

    const nextChild = children[++i];

    result += `.${expr}(${nextChild.getKind() === SyntaxKind.BinaryExpression ? traverseBinaryExpression(nextChild) : getLiteralValueOrThrow(nextChild)})`;
  }

  return result;
}

function traverse(node: Node) {
  let result = '';

  // TODO: merge modified code in place with original AST

  node.forEachChild((child) => {
    switch (child.getKind()) {
      case SyntaxKind.BinaryExpression:
        result += traverseBinaryExpression(child);
        break;
      default:
        result += traverse(child);
        break;
    }
  });

  return result;
}

export default function convert(source: string) {
  const isSourceFile = source.endsWith('.ts') || source.endsWith('.js');

  const project = new Project();
  const sourceFile = project.createSourceFile(!isSourceFile ? 'source.ts' : source, !isSourceFile ? source : undefined);

  return traverse(sourceFile);
}