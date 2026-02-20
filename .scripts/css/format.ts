import { format as fmt, type FormatOptions } from 'oxfmt';
import oxfmtConfig from '../../.oxfmtrc.json' with { type: 'json' };

export default async function format(
  input: string,
  fileName: string = 'unknown.css',
): Promise<string> {
  const { code, errors } = await fmt(
    fileName,
    input,

    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    oxfmtConfig as FormatOptions,
  );

  if (errors.length > 0) {
    for (const error of errors) {
      console.log(
        '======  Oxfmt  =======\n',
        error.message,
        '\n',
        error.codeframe,
        '\n======================',
      );
    }
    throw new Error('CSS prettification failed');
  }

  return code;
}
