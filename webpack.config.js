// eslint-disable-next-line @typescript-eslint/no-var-requires
var path = require('path');
module.exports = {
  mode: 'development',
  entry: {
    'm1/index.js': './src/m1/index.ts',
    'm2/index.js': './src/m2/index.ts',
    'a1/index.js': './src/a1/index.ts',
    'a2/index.js': './src/a2/index.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name]',
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: 'ts-loader',
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
};
