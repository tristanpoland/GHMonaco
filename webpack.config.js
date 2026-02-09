const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');

module.exports = (env, argv) => ({
  entry: {
    content: './src/content/index.ts',
    'service-worker': './src/background/service-worker.ts',
    'editor.worker': './src/workers/editor.worker.ts',
    'json.worker': './src/workers/json.worker.ts',
    'css.worker': './src/workers/css.worker.ts',
    'html.worker': './src/workers/html.worker.ts',
    'ts.worker': './src/workers/ts.worker.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    chunkFilename: 'chunks/[name].js',
    clean: true,
    globalObject: 'self',
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: 'src/manifest.json', to: 'manifest.json' },
        { from: 'src/icons', to: 'icons', noErrorOnMissing: true },
      ],
    }),
    // Set the public path at runtime so async chunks load from the extension URL
    new webpack.DefinePlugin({
      __CHROME_EXTENSION__: 'true',
    }),
  ],
  optimization: {
    splitChunks: false,
  },
  devtool: false,
});
