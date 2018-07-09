// Karma configuration
// Generated on Sun Jul 15 2018 12:21:37 GMT+0100 (BST)

module.exports = function(config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',


    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: [
      'mocha',
      'expect',
      'sinon'
    ],

    plugins: [
      'karma-chrome-launcher',
      'karma-mocha',
      'karma-expect',
      'karma-sinon'
    ],

    // list of files / patterns to load in the browser
    files: [
      // ======= SYSTEMJS ========//
      { pattern: 'node_modules/systemjs/dist/system.src.js', watched: false, included: true}, // SystemJS module loader
      { pattern: 'systemjs.config.js', watched: true, included: false}, // SystemJS configuration script
      // ======= TEST RUNNER ========//
      { pattern: 'karma-test-shim.js', watched: true, included: true},
      // ======= Source Files ========//
      { pattern: 'dist/components/**/*.js', watched: true, included: false},
      { pattern: 'dist/libs/**/*.js', watched: true, included: false},
      // ======= Spec Files ========//
      { pattern: 'dist/spec/**/*.js', watched: true, included: false},
    ],


    // list of files / patterns to exclude
    exclude: [
    ],

    proxies: {
      '/base/': './'
    },

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
    },


    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['progress'],


    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,


    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['ChromeHeadless'],


    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false,

    // Concurrency level
    // how many browser should be started simultaneous
    concurrency: Infinity
  })
}
