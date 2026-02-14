// eslint-disable-next-line import-x/unambiguous
declare module '*.module.css' {
  const styles: Readonly<Record<string, string>>;

  export default styles;
}
