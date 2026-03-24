module.exports = {
  preset: 'jest-expo',
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.claude/',
  ],
  watchPathIgnorePatterns: ['/.claude/'],
  modulePathIgnorePatterns: ['/.claude/'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|lucide-react-native|nativewind|zustand)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^lucide-react-native$': '<rootDir>/__mocks__/lucide-react-native.js',
    '^expo/src/winter/runtime\\.native$': '<rootDir>/node_modules/expo/src/winter/runtime.ts',
  },
  setupFiles: ['<rootDir>/jest.setup.js'],
};
