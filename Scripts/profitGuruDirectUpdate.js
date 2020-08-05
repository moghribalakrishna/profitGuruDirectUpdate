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
var walk = require('walk');
var appList = ['Retail', 'Restaurant', 'Crm', 'Saloon', 'Tito_retail', 'Tito_retailTerminal'];
let installationAppRoot = 'C:/ProfitGuru';

var appType = argv.a;
if (appList.indexOf(appType >= 0)) {
	
			shell.cd('../ProfitGuru');
			let filesProfitGuruFolder = shell.pwd().stdout;
			var walker = walk.walk(filesProfitGuruFolder, {
				followLinks: false
			});
			
			switch (appType) {
				case 'Retail':
					console.log('Updating'+appType + ' Application from folder', filesProfitGuruFolder);
					// Create template folder for copying html files
					walker.on('file', function (root, stat, next) {
						// Add this file to the list of filesProfitGuruFolder
						var relativeDestFoldr;
						let sourceFile = root + '/' + stat.name;
						if (root.split('ProfitGuru').length > 2) {
							relativeDestFoldr = root.split('ProfitGuru')[2];
						} else {
							relativeDestFoldr = root.split('ProfitGuru')[1];
						}
						let DstFolder = installationAppRoot + relativeDestFoldr;
						let orginalSourceFile = DstFolder + '/' + stat.name;
						console.log('Copying files from Src=',filesProfitGuruFolder, 'to Dst=',DstFolder);

						var dateString = new Date().toLocaleDateString();
						let OrgRenameFileName = orginalSourceFile + '_' + dateString + '_' + Date.now();

						//console.log('relativeDestFoldr= ',relativeDestFoldr, 'sourceFile= ',sourceFile, ' DstFolder=',DstFolder,' orginalSourceFile=',orginalSourceFile, ' OrgRenameFileName=',OrgRenameFileName);

						if (shell.test('-f', orginalSourceFile)) {
							console.log('Moving ', orginalSourceFile, ' to ' + OrgRenameFileName);
							shell.mv('-f', orginalSourceFile, OrgRenameFileName);
						}

						if (shell.test('-f', sourceFile)) {
							console.log('Copying file ', sourceFile, ' to ', DstFolder);

							if (!shell.test('-d', DstFolder)) {
								console.log('Creating Folder=', DstFolder);
								shell.mkdir('-p', DstFolder);
							}
							shell.cp('-Rf', sourceFile, DstFolder);
						} else {
							console.log("ERROR", sourceFile, "Doesn't Exist")
						}

						next();
					});

					walker.on('end', function () {
						console.log('Done Copying all files');
						console.log('NOTICE!IMPORTANT:!');
						console.log('1): Delete the http://localhost:5984/_utils/document.html?pg_collection_retail_maindb/_design/all_sales_info design document from couchdb');
						console.log('2): Retsart the CouchDb, ProfitGuru Servers from Services');
						console.log('3): Login & Test the Application');

					});
					break;
				case 'Tito_retailTerminal':
				case 'Tito_retail':
					console.log('Updating' + appType + '  Application from folder', filesProfitGuruFolder);
					// Create template folder for copying html files
					walker.on('file', function (root, stat, next) {
						// Add this file to the list of filesProfitGuruFolder
						var relativeDestFoldr;
						let sourceFile = root + '/' + stat.name;
						if (root.split('ProfitGuru').length > 2) {
							relativeDestFoldr = root.split('ProfitGuru')[2];
						} else {
							relativeDestFoldr = root.split('ProfitGuru')[1];
						}

						let DstFolder = installationAppRoot + relativeDestFoldr;
						let orginalSourceFile = DstFolder + '/' + stat.name;
	console.log('Copying files from Src=',filesProfitGuruFolder, 'to Dst=',DstFolder);
						var dateString = new Date().toLocaleDateString();
						let OrgRenameFileName = orginalSourceFile + '_' + dateString + '_' + Date.now();

						//console.log('relativeDestFoldr= ',relativeDestFoldr, 'sourceFile= ',sourceFile, ' DstFolder=',DstFolder,' orginalSourceFile=',orginalSourceFile, ' OrgRenameFileName=',OrgRenameFileName);

						if (shell.test('-f', orginalSourceFile)) {
							console.log('Moving ', orginalSourceFile, ' to ' + OrgRenameFileName);
							shell.mv('-f', orginalSourceFile, OrgRenameFileName);
						}

						if (shell.test('-f', sourceFile)) {
							console.log('Copying file ', sourceFile, ' to ', DstFolder);

							if (!shell.test('-d', DstFolder)) {
								console.log('Creating Folder=', DstFolder);
								shell.mkdir('-p', DstFolder);
							}
							shell.cp('-Rf', sourceFile, DstFolder);
						} else {
							console.log("ERROR", sourceFile, "Doesn't Exist")
						}

						next();
					});

					walker.on('end', function () {
						console.log('Done Copying all files');
						console.log('NOTICE!IMPORTANT:!');
						console.log('1): Delete the http://localhost:5984/_utils/document.html?pg_collection_retail_maindb/_design/all_sales_info design document from couchdb');
						console.log('2): Retsart the CouchDb, ProfitGuru Servers from Services');
						console.log('3): Login & Test the Application');

					});
					break;
			}


} else {
	console.log('Enter on of the app type of ' + appList);
}
