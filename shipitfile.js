module.exports = function (shipit) {
    require('shipit-deploy')(shipit);

    shipit.initConfig({
        default: {
            workspace: '/tmp/browgine',
            deployTo: '/opt/browgine',
            repositoryUrl: 'https://github.com/hegrec/browgine.git',
            ignores: ['.git', 'node_modules'],
            keepReleases: 3
        },
        staging: {
            servers: 'mealtrap.com'
        },
        production: {
            servers: 'nodeapps@immown.com'
        }
    });

    shipit.on('published', function() {
        shipit.remote('cd /opt/browgine/current && npm install && grunt').then(function(res) {
            shipit.log(res);
                shipit.remote('pm2 restart browgine').then(function(res) {
                    shipit.log(res);
                });
        });
    })
};
