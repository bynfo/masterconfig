# masterconfig
MasterConfig is an extension to easily import Qlik Sense master items from external sources into your applications.

[[https://github.com/bynfo/masterconfig/blob/master/img/mc.png|alt=masterconfig]]

## Introduction 
MasterConfig is a Qlik Sense visualization extension to create new master items in as many apps as you want. It can be used from within an app or from an outside app.

## Getting Started
1. If you are using the extension on a server, you need to edit the connection configuration starting on line 38 in `masterconfig.js`:
```javascript
$scope.config = {
	host: window.location.hostname,
	prefix: "/",
	port: window.location.port,
	isSecure: true,
	identity: "<username>"
}
```
2. Import the extension archive (.zip) into Qlik using the Qlik Management Console or unpack the archive into your `...Qlik\Sense\Extensions` folder.
3. Import your master items data from an excel table or any external source. The following columns with matching names must be available.
Items marked with an asterisk are mandatory and the value of the title and the label can be the same.

|id|qtype*|title*|definition*|label*|description|grouping*|labelexpression|tags|color|modified|published|publishtime|
|--|------|------|-----------|------|-----------|---------|---------------|----|-----|--------|---------|-----------|

4. Drag and drop the MasterConfig extension into your sheet and follow the directions on the screen.

## Files
### Styles
- styles.css : styles for the main table.

### Javascript
- config.js : Qlik sense intial properties.
- masterconfig.js : main entry point.
- tools.js : various utilities.

### AngularJS templates
- dialog-template.ng-html : the template for rendering the master item selection interface.
- template.ng.html : the base template for rendering the extension default view and table.

### Qlik
- wbfolder.wbl
- masterconfig.qext
