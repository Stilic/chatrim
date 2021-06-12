const path = require('path')
const webpack = require('webpack')
module.exports = {
  entry: '/public/chat.js',
  output: {
    path: path.join(__dirname, 'dist'),
    publicPath: '/',
    filename: '[name].min.js'
  },
  module: {
    rules: [
      {
        test: /public\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader"
        }
      },
    ]
  }
}