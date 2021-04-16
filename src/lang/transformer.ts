import { Lexer } from './lexer';
import { Parser } from './parser';
import { TokenType, BinOp, UnaryOp, Num, Var, Assign, Update, JS, NoOp, Str, Template, Program, Block, PropDecl, StyleDecl, Console } from './tokens';
import type { Operand } from './tokens';

export default class Transformer {
  parser: Parser;
  code: string[] = [];

  constructor(parser: Parser) {
    this.parser = parser;
  }

  error(msg = 'Transformer Error'): never {
    throw Error(msg);
  }

  visit(node: Operand): string | number | string[] | void {
    if (node instanceof Program) return this.visit_Program(node);
    if (node instanceof Block) return this.visit_Block(node);
    if (node instanceof PropDecl) return this.visit_PropDecl(node);
    if (node instanceof StyleDecl) return this.visit_StyleDecl(node);
    if (node instanceof Var) return this.visit_Var(node);
    if (node instanceof Assign) return this.visit_Assign(node);
    if (node instanceof Update) return this.visit_Update(node);
    if (node instanceof JS) return this.visit_JS(node);
    if (node instanceof Console) return this.visit_Console(node);
    if (node instanceof Str) return this.visit_Str(node);
    if (node instanceof Template) return this.visit_Template(node);
    if (node instanceof Num) return this.visit_Num(node);
    if (node instanceof UnaryOp) return this.visit_UnaryOp(node);
    if (node instanceof BinOp) return this.visit_BinOp(node);
    if (node instanceof NoOp) return this.visit_NoOp();
    this.error();
  }

  visit_Num(node: Num): number {
    return node.value;
  }

  visit_Template(node: Template): string {
    const value = node.value;
    const len = value.length;
    let index = 0;
    const output:string[] = [];
    while (index < len) {
      const char = value.charAt(index);
      if(char === '$') {
        if (value.charAt(index + 1) === '{') {
          index += 2;
          let exp = '';
          while (value.charAt(index) !== '}' || value.charAt(index - 1) === '\\') {
            exp += value.charAt(index);
            index ++;
          }
          output.push(`\${${this.visit(new Parser(new Lexer(exp)).expr())}}`);
          index ++;
        } else {
          output.push(char);
          index ++;
        }
      } else {
        output.push(char);
        index ++;
      }
    }
    return `\`${output.join('')}\``;
  }

  visit_Str(node: Str): string {
    return `"${node.value}"`;
  }

  visit_JS(node: JS): string {
    return `eval(\`${node.code}\`)`;
  }

  visit_BinOp(node: BinOp): string {
    const left_value = this.visit(node.left);
    const right_value = this.visit(node.right);

    switch (node.op.type) {
    case TokenType.PLUS:
      return `add(${left_value}, ${right_value})`;
    case TokenType.MINUS:
      return `minus(${left_value}, ${right_value})`;
    case TokenType.MUL:
      return `mul(${left_value}, ${right_value})`;
    case TokenType.DIV:
      return `div(${left_value}, ${right_value})`;
    }
    this.error();
  }

  visit_UnaryOp(node: UnaryOp): string {
    const value = this.visit(node.expr);
    switch (node.op.type) {
    case TokenType.PLUS:
      return `positive(${value})`;
    case TokenType.MINUS:
      return `negative(${value})`;
    }
    this.error();
  }

  visit_Program(node: Program): void {
    this.code = this.visit_Block(node.block);
  }

  visit_Console(node: Console): string {
    switch (node.type) {
    case TokenType.LOG:
      return `console.log(${this.visit(node.expr)})`;
    case TokenType.WARN:
      return `console.warn(${this.visit(node.expr)})`;
    case TokenType.ERROR:
      return `console.error(${this.visit(node.expr)})`;
    }
  }

  visit_Block(node: Block): string[] {
    const output:string[] = [];
    [...node.statement_list, ...node.style_list].forEach(i => {
      const result = this.visit(i);
      if (result !== undefined) output.push(`${result}`);
    });
    return output;
  }

  visit_PropDecl(node: PropDecl): string {
    return `new Property("${node.name}", ${this.visit(node.value) as string})`;
  }

  visit_StyleDecl(node: StyleDecl): string {
    const output:string[] = [];
    // const children = this.visit(node.children);
    const block = node.children;
    output.push(`(() => {\nconst style = new Style("${node.selector}")`);
    block.statement_list.forEach(i => {
      if (!(i instanceof NoOp)) {
        output.push(`${this.visit(i)}`);
      }
    });
    block.style_list.forEach(i => {
      const style = this.visit(i);
      if (style) output.push(`style.add(${style.toString()})`);
    });
    output.push('return style;\n})()');
    return output.join(';\n');
  }

  visit_Assign(node: Assign): string {
    return `let ${node.left.value} = ${this.visit(node.right)}`;
  }

  visit_Update(node: Update): string {
    return `${node.left.value} = ${this.visit(node.right)}`;
  }

  visit_Var(node: Var): string {
    return node.value;
  }

  visit_NoOp(): void {
    return;
  }

  transform(): string {
    this.visit(this.parser.parse());
    return this.code.join(';\n') + ';';
  }
}
