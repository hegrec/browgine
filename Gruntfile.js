module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        browserify: {
            dist: {
                files: {
                    'public/js/foresteers.min.js': ['client/**/*.js']
                },
                options: {
                    transform: ['require-globify']
                }
            }
        },

        watch: {
            scripts: {
                files: ['client/**/*.js', 'common/**/*.js', 'entities/**/client.js', 'entities/**/shared.js'],
                tasks: ['browserify']
            }
        }
    });

    // Default task(s).
    grunt.registerTask('default', ['browserify']);

    //Browserify
    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-contrib-watch');

};
