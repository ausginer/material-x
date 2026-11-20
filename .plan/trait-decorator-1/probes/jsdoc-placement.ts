import { isolatedDeclarationSync } from 'oxc-transform';
const forms: Record<string, string> = {
  docAboveDecorator: `declare const trait: any; declare const B: any;\n/** Doc A. */\n@trait\nexport class A extends B {}\n`,
  decoratorAboveDoc: `declare const trait: any; declare const B: any;\n@trait\n/** Doc A. */\nexport class A extends B {}\n`,
  afterExport: `declare const trait: any; declare const B: any;\n/** Doc A. */\nexport @trait class A extends B {}\n`,
  inline: `declare const trait: any; declare const B: any;\n/** Doc A. */\n@trait export class A extends B {}\n`,
};
for (const [k, v] of Object.entries(forms)) {
  console.log(
    `== ${k}\n${isolatedDeclarationSync('a.ts', v, { stripInternal: false }).code}`,
  );
}
