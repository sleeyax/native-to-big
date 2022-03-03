import { Node, Project, SourceFile, SyntaxKind } from "ts-morph";
import { mapSyntaxKind } from './mappings';

export type Options = {
  /**
   * Source file paths or glob patterns to convert.
   */
  source?: string | readonly string[];

  /**
   * Raw source code to convert.
   * 
   * This code will be stored in a dummy file whose name is stored in the importable `sourceCodeFileName` const.
   */
  sourceCode?: string;

  /**
   * Import source files from given tsconfig.json.
   */
  sourceTsConfig?: string;

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

  /**
   * Called when an input file has been transformed to Bigs.
   */
  onConverted: (file: SourceFile) => void;
};

/**
 * The name of the filename when raw source code was given via the `sourceCode` option.
 */
export const sourceCodeFileName = 'n2b-source.ts';

export class Converter {
  private readonly options: Options;

  constructor(options: Options) {
    this.options = options;
  }

  private createBig(content: string | number) {
    let result = this.options.prependNew ? 'new ' : '';
    result += `Big(${content})`;
    return result;
  }

  private traverseBinaryExpression(node: Node): string {
    const firstChild = node.getFirstChildOrThrow();
  
    // TODO: maybe construct new AST nodes instead of working with text
    let result = firstChild.getKind() === SyntaxKind.BinaryExpression ? this.traverseBinaryExpression(firstChild) : this.createBig(firstChild.getText());
  
    const children = node.getChildren();
    for (let i = 1; i < children.length; i++) {
      const child = children[i];
  
      const expr = mapSyntaxKind[child.getKind()];
      if (!expr) throw new Error(`Expression of kind '${child.getKindName()}' is not supported!`);
  
      const nextChild = children[++i];
  
      result += `.${expr}(${nextChild.getKind() === SyntaxKind.BinaryExpression ? this.traverseBinaryExpression(nextChild) : nextChild.getText()})`;
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
            
            if (method == 'abs' || method == 'sqrt')
              result += `.${method}()`;
          }

          if (this.options.appendToNumber)
            result += '.toNumber()';
          
          // modify the node in place
          (previousSibling ? parent! : child).replaceWithText(result);

          break;
        default:
          this.traverse(child);
          break;
      }
    });
  }

  convert() {
    const project = new Project();
    
    if (this.options.sourceCode)
      project.createSourceFile(sourceCodeFileName, this.options.sourceCode);

    if (this.options.source)
      project.addSourceFilesAtPaths(this.options.source);
    
    if (this.options.sourceTsConfig)
      project.addSourceFilesFromTsConfig(this.options.sourceTsConfig);

    const files = project.getSourceFiles();

    for (const file of files) {
      this.traverse(file);
      this.options.onConverted(file);
    }
  }
}

export function convert(options: Options) {
  return new Converter(options).convert();
}
