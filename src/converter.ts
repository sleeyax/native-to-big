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
   * List of one-value variables to wrap in a Big.
   * 
   * By default, all variables containg a constant number won't be wrapped in a Big.
   * 
   * For example, the following code:
   * ```js
   * let total = 0;
   * total += 1 + 2;
   * ```
   * 
   * Will, by default, result in the following faulty code after conversion:
   * ```js
   * let total = 0;
   * total = total.add(Big(1).plus(2));
   * ```
   * 
   * This is done by design so that we don't convert important values like constants or incrementers (let i = 0).
   * Thus, in order to fix the example above you should specify `{..., variables: ['total']}` in your `Options` object..
   */
  variables?: string[];

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

  private traverseParenthesizedExpression(node: Node) {
    const binaryExpression = node.getChildAtIndexIfKindOrThrow(1, SyntaxKind.BinaryExpression); // index: 0 == OpenParenToken, 2 == CloseParenToken
    return this.traverseBinaryExpression(binaryExpression);
  }

  private traverseBinaryExpression(node: Node): string {
    let result = '';
    
    const firstChild = node.getFirstChildOrThrow();

    switch (firstChild.getKind()) {
      case SyntaxKind.BinaryExpression:
        result = this.traverseBinaryExpression(firstChild);
        break;
      case SyntaxKind.Identifier:
        const secondChild = node.getChildAtIndex(1);

        switch (secondChild.getKind()) {
          case SyntaxKind.MinusEqualsToken:
          case SyntaxKind.PlusEqualsToken:
          case SyntaxKind.SlashEqualsToken:
          case SyntaxKind.AsteriskEqualsToken:
          case SyntaxKind.PercentEqualsToken:
            const identifierText = firstChild.asKindOrThrow(SyntaxKind.Identifier).getText();
            result = `${identifierText} = ${identifierText}`; // e.g. 'total +=' -> 'total = total' (and then '.plus(...)' gets added later on)
            break;
          default:
            result = this.createBig(firstChild.getText());
            break;
        }

        break;
      case SyntaxKind.ParenthesizedExpression:
        result = this.createBig(this.traverseParenthesizedExpression(firstChild));
        break;
      default:
        result = this.createBig(firstChild.getText());
        break;
    }
  
    const children = node.getChildren();
    for (let i = 1; i < children.length; i++) {
      const child = children[i];
  
      const expr = mapSyntaxKind[child.getKind()];
      if (!expr) throw new Error(`Expression of kind '${child.getKindName()}' is not supported!`);
  
      const nextChild = children[++i];
  
      let content = '';
      switch (nextChild.getKind()) {
        case SyntaxKind.BinaryExpression:
          content = this.traverseBinaryExpression(nextChild);
          break;
        case SyntaxKind.ParenthesizedExpression:
          content = this.traverseParenthesizedExpression(nextChild);
          break;
        default:
          content = nextChild.getText();
          break;
      }
      result += `.${expr}(${content})`;
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
          let foundMath = false;
          if (previousSibling) { 
            const method = previousSibling.getSymbol()?.getEscapedName();
            
            if (method == 'abs' || method == 'sqrt') {
              result += `.${method}()`;
              foundMath = true;
            }
            else if (method === 'pow')
              // TODO: support Math.pow(value, power)
              console.warn(`Found Math.pow in ${child.getSourceFile().getFilePath()}:${child.getStartLineNumber()} but it isn\'t supported! Skipping...`);
          }

          if (this.options.appendToNumber)
            result += '.toNumber()';
          
          // modify the node in place
          (foundMath ? parent! : child).replaceWithText(result);

          break;
        case SyntaxKind.VariableDeclaration:
          // find single-value variable declarations like 'let total = 0'
          const variables = this.options.variables;
          if (variables?.length && child.getChildCount() == 3) {
            const identifier = child.getChildAtIndexIfKind(0, SyntaxKind.Identifier);
            const numericLiteral = child.getChildAtIndexIfKind(2, SyntaxKind.NumericLiteral);
            if (identifier && numericLiteral && variables.includes(identifier.getText())) {
              numericLiteral.replaceWithText(this.createBig(numericLiteral.getLiteralValue()));
              break;
            }
          }
        case SyntaxKind.ParenthesizedExpression:
          const firstChild = child.getFirstChildIfKind(SyntaxKind.BinaryExpression);
          if (firstChild) {
            const result = this.traverseBinaryExpression(firstChild);
            child.replaceWithText(result);
            break;
          }
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
