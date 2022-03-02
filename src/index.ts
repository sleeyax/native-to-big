import { Node, Project, SyntaxKind } from "ts-morph";
import { mappings } from './mappings';

const project = new Project();

const fileText = 
`
const total = 1 + 2 + 3 - 1 / 2;
`;

const sourceFile = project.createSourceFile("source.ts", fileText);

const getLiteralValueOrThrow = (node: Node) => node.asKindOrThrow(SyntaxKind.NumericLiteral).getLiteralValue();

function traverseBinaryExpression(node: Node): string {
  const firstChild = node.getFirstChild();
  if (!firstChild) return '';

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
  switch (node.getKindName()) {
    case 'BinaryExpression':
      const result = traverseBinaryExpression(node);
      console.log(result);
      break;
    default:
      node.forEachChild(traverse);
      break;
  }
}

traverse(sourceFile);
