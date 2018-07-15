
System.config({
    transpiler: null,
    paths: {
        'npm:': 'node_modules/'
    },
    map: {
        'lodash': 'npm:lodash/lodash.min.js',
    },
    packages: {
      "." : { 
        defaultExtension: 'js'
      }
    }
  })