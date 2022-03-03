import { Node, Project, SyntaxKind } from "ts-morph";
import { mapSyntaxKind } from './mappings';

export type Options = {
  /**
   * Source file(s) or code to convert.
   */
  source: string;

  /**
   * Whether to suffix `Big` with the `new` keyword.
   * 
   * Disabled by default.
   */
  prependNew?: boolean;

  /**
   * Whether to append `toNumber()` at the end of the converted `Big`, which will convert the result of the expression back to a number.
   * 
   * Disabled by default.
   */
  appendToNumber?: boolean;
};

export class Converter {
  private readonly options: Options;

  constructor(options: Options) {
    this.options = options;
  }

  private getLiteralValueOrThrow(node: Node){
    return node.asKindOrThrow(SyntaxKind.NumericLiteral).getLiteralValue();
  }

  private traverseBinaryExpression(node: Node): string {
    const firstChild = node.getFirstChildOrThrow();
  
    // TODO: maybe construct new AST nodes instead of working with text
    let result = firstChild.getKind() === SyntaxKind.BinaryExpression ? this.traverseBinaryExpression(firstChild) : ((this.options.prependNew ? 'new ' : '') + 'Big(' + this.getLiteralValueOrThrow(firstChild) + ')');
  
    const children = node.getChildren();
    for (let i = 1; i < children.length; i++) {
      const child = children[i];
  
      const expr = mapSyntaxKind[child.getKind()];
      if (!expr) throw new Error(`Expression of kind '${child.getKindName()}' is not supported!`);
  
      const nextChild = children[++i];
  
      result += `.${expr}(${nextChild.getKind() === SyntaxKind.BinaryExpression ? this.traverseBinaryExpression(nextChild) : this.getLiteralValueOrThrow(nextChild)})`;
    }

    if (this.options.appendToNumber)
      result += '.toNumber()';
  
    return result;
  }
  
  private traverse(node: Node) {
    node.forEachChild((child) => {
      switch (child.getKind()) {
        case SyntaxKind.BinaryExpression:
          const result = this.traverseBinaryExpression(child);
          child.replaceWithText(result);
          break;
        default:
          this.traverse(child);
          break;
      }
    });
  }

  convert() {
    const source = this.options.source;
    const isSourceFile = source.endsWith('.ts') || source.endsWith('.js');

    const project = new Project();
    const sourceFile = project.createSourceFile(!isSourceFile ? 'source.ts' : source, !isSourceFile ? source : undefined);
    
    this.traverse(sourceFile);
    
    return sourceFile.getFullText();
  }
}

export default function convert(source: string, options?: Omit<Options, 'source'>) {
  return new Converter({source, ...options}).convert();
}
