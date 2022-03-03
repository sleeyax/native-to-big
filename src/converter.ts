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

  private createBig(content: string | number) {
    let result = this.options.prependNew ? 'new ' : '';
    result += `Big(${content})`;
    return result;
  }

  private traverseBinaryExpression(node: Node): string {
    const firstChild = node.getFirstChildOrThrow();
  
    // TODO: maybe construct new AST nodes instead of working with text
    let result = firstChild.getKind() === SyntaxKind.BinaryExpression ? this.traverseBinaryExpression(firstChild) : this.createBig(this.getLiteralValueOrThrow(firstChild));
  
    const children = node.getChildren();
    for (let i = 1; i < children.length; i++) {
      const child = children[i];
  
      const expr = mapSyntaxKind[child.getKind()];
      if (!expr) throw new Error(`Expression of kind '${child.getKindName()}' is not supported!`);
  
      const nextChild = children[++i];
  
      result += `.${expr}(${nextChild.getKind() === SyntaxKind.BinaryExpression ? this.traverseBinaryExpression(nextChild) : this.getLiteralValueOrThrow(nextChild)})`;
    }
  
    return result;
  }
  
  private traverse(node: Node) {
    node.forEachChild((child) => {
      switch (child.getKind()) {
        case SyntaxKind.BinaryExpression:
          let result = this.traverseBinaryExpression(child);
          
          // check if the expression is wrapped in a method from the native 'Math' library
          const parent = child.getParentIfKind(SyntaxKind.CallExpression);
          const previousSibling = parent?.getChildAtIndexIfKind(0, SyntaxKind.PropertyAccessExpression);
          if (previousSibling) { 
            const method = previousSibling.getSymbol()?.getEscapedName();
            
            if (method == 'abs' || method == 'sqrt') {
              // previousSibling?.replaceWithText((this.options.prependNew ? 'new ' : '') + 'Big');
              result += `.${method}()`;
            }
          }

          if (this.options.appendToNumber)
            result += '.toNumber()';
          
          // modify the node in place
          (parent ?? child).replaceWithText(result);

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

export function convert(source: string, options?: Omit<Options, 'source'>) {
  return new Converter({source, ...options}).convert();
}
