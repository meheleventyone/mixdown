const path = require('path');

module.exports = {
  entry: './src/mixdown.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [ '.tsx', '.ts', '.js' ],
  },
  output: {
    filename: 'mixdown.js',
    path: path.resolve(__dirname, 'dist'),
  },
};