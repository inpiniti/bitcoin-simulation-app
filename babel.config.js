module.exports = function (api) {
  const isTest = process.env.NODE_ENV === 'test' || process.env.BABEL_ENV === 'test';
  api.cache(!isTest);

  // import.meta → {env:{MODE:"production"}} 으로 치환
  // zustand 5 등 ESM 패키지가 import.meta.env 를 사용하지만
  // Metro(Hermes) web 번들러는 import.meta 문법을 지원하지 않아 런타임 오류 발생
  function importMetaPlugin({ types: t }) {
    return {
      visitor: {
        MetaProperty(path) {
          if (
            path.node.meta.name === 'import' &&
            path.node.property.name === 'meta'
          ) {
            path.replaceWith(
              t.objectExpression([
                t.objectProperty(
                  t.identifier('env'),
                  t.objectExpression([
                    t.objectProperty(
                      t.identifier('MODE'),
                      t.stringLiteral('production')
                    ),
                  ])
                ),
              ])
            );
          }
        },
      },
    };
  }

  if (isTest) {
    return {
      presets: ['babel-preset-expo'],
    };
  }

  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
    ],
    plugins: [importMetaPlugin],
  };
};
