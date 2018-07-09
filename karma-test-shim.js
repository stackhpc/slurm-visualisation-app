Error.stackTraceLimit = 0

__karma__.loaded = function () { }

function isSpecFile (path) {
  return /^(.*)_specs.js$/.test(path)
}

var allSpecFiles = Object.keys(window.__karma__.files)
  .filter(isSpecFile)

SystemJS.config({
  baseURL: 'base'
})

System.import('systemjs.config.js')
  .then(initTesting)

function initTesting () {
  return Promise.all(
    allSpecFiles.map(function (moduleName) {
      return System.import(moduleName)
    })
  )
    .then(__karma__.start, __karma__.error)
}
