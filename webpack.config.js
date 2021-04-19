var path = require('path');
module.exports = {
  mode: 'production',
  entry: {
    'm1/index.js': './src/m1/index.ts',
  },
  output: {
    path: path.resolve(__dirname, 'docs'),
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
