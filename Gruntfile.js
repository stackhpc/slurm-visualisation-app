module.exports = function (grunt) {
    grunt.loadNpmTasks('grunt-contrib-clean')
    grunt.loadNpmTasks('grunt-contrib-copy')
    grunt.loadNpmTasks("grunt-sass")
    grunt.loadNpmTasks("grunt-ts")
  
    grunt.initConfig({
  
      clean: ['dist'],
  
      copy: {
        src_to_dist: {
          cwd: 'src',
          expand: true,
          src: ['**/*', '!**/*.ts', '!**/*.scss'],
          dest: 'dist'
        },
        pluginDef: {
          expand: true,
          src: ['README.md'],
          dest: 'dist'
        }
      },

      sass: {
        options: {
          sourceMap: true
        },
        dist: {
          files: {
            'dist/css/monasca.dark.css': 'src/sass/monasca.dark.scss',
            'dist/css/monasca.light.css': 'src/sass/monasca.light.scss'
          }
        }
      },
  
      ts: {
        default : {
          tsconfig: './tsconfig.json',
          options: {
            skipLibCheck: true
          }
        }
      }
    })
  
    grunt.registerTask('default', ['clean', 'copy', 'sass', 'ts'])
  }
  