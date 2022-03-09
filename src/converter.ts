import { Node, Project, SourceFile, SyntaxKind } from "ts-morph";
import { isPromise } from 'util/types';
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
};

/**
 * Function to call when an input file has been converted to Bigs.
 */
type OnConverted = (file: SourceFile) => void | Promise<void>;

/**
 * The name of the filename when raw source code was given via the `sourceCode` option.
 */
export const sourceCodeFileName = 'n2b-source.ts';

export class Converter {
  private readonly options: Options;
  private readonly project: Project;

  constructor(options: Options) {
    this.project = new Project();
    this.options = options;
    
    if (options.sourceCode)
      this.project.createSourceFile(sourceCodeFileName, options.sourceCode);

    if (options.source)
      this.project.addSourceFilesAtPaths(options.source);
    
    if (options.sourceTsConfig)
      this.project.addSourceFilesFromTsConfig(options.sourceTsConfig);
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
  
    const children = node.getChildren();
    for (let i = 0; i < children.length; i++) {
      let child = children[i];
      let content = '';

      switch (child.getKind()) {
        case SyntaxKind.BinaryExpression:
          content = this.traverseBinaryExpression(child);
          break;
        case SyntaxKind.Identifier:
          const secondChild = node.getChildAtIndex(1);
  
          switch (secondChild.getKind()) {
            case SyntaxKind.MinusEqualsToken:
            case SyntaxKind.PlusEqualsToken:
            case SyntaxKind.SlashEqualsToken:
            case SyntaxKind.AsteriskEqualsToken:
            case SyntaxKind.PercentEqualsToken:
              const identifierText = child.asKindOrThrow(SyntaxKind.Identifier).getText();
              content = `${identifierText} = ${identifierText}`; // e.g. 'total +=' -> 'total = total' (and then '.plus(...)' gets added later on)
              break;
            default:
              content = i == 0 ? this.createBig(child.getText()) : child.getText();
              break;
          }
  
          break;
        case SyntaxKind.ParenthesizedExpression:
          content = i == 0 ? this.createBig(this.traverseParenthesizedExpression(child)) : this.traverseParenthesizedExpression(child);
          break;
        default:
          content = i == 0 ? this.createBig(child.getText()) : child.getText();
          break;
      }
      
      if (i == 0) {
        result += content;
      }
      else if (i == 1) {
        const kind = child.getKind();

        if (kind == SyntaxKind.BarBarToken) { // e.g. 0 || 1
          return this.createBig(node.getText());
        } else {
          const expr = mapSyntaxKind[kind];
          if (!expr) throw new Error(`Expression of kind '${child.getKindName()}' (${child.getText()}) is not supported!`);
          result += '.' + expr;
        }
      } else if (i == 2) {
        result +=  `(${content})`;
      } else {
        // NOTE: this line shouldn't be reachable but let's append content instead of throwing an error
        result += content;
      }
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

  convert(onConverted: OnConverted = (file) => file.saveSync()) {
    const files = this.project.getSourceFiles();

    for (const file of files) {
      this.traverse(file);
      onConverted(file);
    }
  }

  async convertAsync(onConverted: OnConverted = (file) => file.save()) {
    const files = this.project.getSourceFiles();

    for (const file of files) {
      this.traverse(file);
      await onConverted(file);
    }
  }
}

export function convert({onConverted, ...options}: Options & {onConverted?: OnConverted}) {
  const converter = new Converter(options);
  const async = isPromise(onConverted);
  return async ? converter.convertAsync(onConverted) : converter.convert(onConverted);
}
