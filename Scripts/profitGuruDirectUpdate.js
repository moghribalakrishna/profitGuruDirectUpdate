const fs = require('fs');
var argv = require('yargs')
    .usage('Usage: $0 <command> [options]')
    .alias('a', 'appType')
    .describe('nodeApp', 'One of the available nodeApp appTypes [Retail,Restaurant,Crm,Saloon,Tito_retail]')
    .help('h')
    .alias('h', 'help')
    .argv;

    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
      }

var shell = require('shelljs');
var walk    = require('walk');
var appList=['Retail','Restaurant','Crm','Saloon','Tito_retail'];
let installationAppRoot = 'C:';

var appType=argv.a.toLowerCase();
if (appList.indexOf(capitalizeFirstLetter(appType)) >=0 ){
if (shell.exec('curl -LkSs https://api.github.com/repos/moghribalakrishna/profitGuruDirectUpdate/tarball -o master.tar.gz').code !== 0) {
    shell.echo('Error: Git Files Download failed');
    shell.exit(1);
  } else {
    shell.echo('Respective Scripts are downloaded & ready for installation');
    if (shell.exec('tar -xvf master.tar.gz').code !== 0) {
        shell.echo('Error: tar of Files Download failed');
        shell.exit(1);
      }else {
        shell.cd('moghribalakrishna-profitGuruDirectUpdate*');
        let filesProfitGuruFolder = shell.pwd().stdout;
        var walker  = walk.walk(filesProfitGuruFolder, { followLinks: false });
        switch(appType){
            case 'retail':
                console.log('Updating Retail Application from folder',filesProfitGuruFolder);
                walker.on('file', function(root, stat, next) {
                    // Add this file to the list of files
                    let sourceFile = root + '/' + stat.name;
                    var relativeDestFoldr = root.split('ProfitGuru')[1];

                    let DstFolder = installationAppRoot+relativeDestFoldr;
                    console.log('Copying file ', sourceFile, ' to ', DstFolder);
                    next();
                });
                
                walker.on('end', function() {
                    console.log('Done seein all files');
                });
                break;
        }



      }
  } 
}
else {
    console.log('Enter on of the app type of '+appList);
  }