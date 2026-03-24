// Pre-define all globals that expo/src/winter/runtime.native.ts installs lazily.
// This prevents "require() outside Jest module scope" errors from lazy getters.
const globals = [
  'TextDecoder', 'TextDecoderStream', 'TextEncoderStream',
  'URL', 'URLSearchParams', '__ExpoImportMetaRegistry', 'structuredClone'
];

globals.forEach((name) => {
  if (typeof globalThis[name] === 'undefined') {
    Object.defineProperty(globalThis, name, {
      value: name === '__ExpoImportMetaRegistry' ? { url: null }
           : name === 'structuredClone' ? (v) => JSON.parse(JSON.stringify(v))
           : {},
      enumerable: false,
      writable: true,
      configurable: true,
    });
  }
});
