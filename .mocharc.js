'use strict';

module.exports = {
  extension: ['js'],
  package: './package.json',
  reporter: 'spec',
  timeout: 30000,
  require: [
    '@babel/register',
    '@babel/polyfill',
  ],
};
