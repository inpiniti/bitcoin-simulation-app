module.exports = function (api) {
  const isTest = process.env.NODE_ENV === 'test' || process.env.BABEL_ENV === 'test';
  api.cache(!isTest);

  if (isTest) {
    // Jest 환경에서는 nativewind 플러그인 제외
    return {
      presets: ['babel-preset-expo'],
    };
  }

  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
    ],
    plugins: ['nativewind/babel'],
  };
};
