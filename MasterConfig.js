define([
     'qlik'
   , 'jquery'
   , 'angular'
   , 'text!./template.ng.html'
   , 'text!./dialog-template.ng.html'
   , './tools'
   , './config'
   , 'text!./styles.css'
  ],
    function (
        qlik
      , $
      , angular
      , mainTemplate
      , dialogTemplate
      , tools
      , config
      , styles ) {

        'use strict';
        $("<style>").html( function () {return styles;}).appendTo("head");
        var Promise = qlik.Promise;

        return {
            template: mainTemplate,
            initialProperties: config.initialProperties,
            snapshot: config.snapshot,
            definition: config.definition,
            controller: ["$scope", "$document", "$element", "luiDialog", function ($scope, $document, $element, luiDialog) {
              $scope.app = qlik.currApp(this);
              $scope.global = qlik.getGlobal();
              $scope.global.getAuthenticatedUser().then((data) => {
                var regex = data.qReturn.indexOf("UserId") > -1 ? /(?:^|\s)UserId=(.*?)(?:\s|$)/g : /\\(.*)/g;
                var match = regex.exec(data.qReturn);
                $scope.user = match[1];
              });
              $scope.config = {
                  host     : window.location.hostname
                , prefix   : window.location.pathname.substr( 0, window.location.pathname.toLowerCase().lastIndexOf( "/extensions" ) + 1 )
                , port     : window.location.port
                , isSecure : window.location.protocol === 'https:'
                , identity : $scope.user
                , openWithoutData : true
              };
              $scope.errors = [];
              $scope.infos = [];
              $scope.warnings = [];
              $scope.fieldlist = [];
              $scope.masteritems = [];
              $scope.applist = [];
              $scope.appobjects = [];
              $scope.tableloading = $scope.masteritems.length > 0 ? false : null;
              $scope.dialogloading = false;
              $scope.layout.tableloaded = false;

              // Catch qlik errors
              qlik.setOnError(function (error) {
                console.log("Qlik error: ", error);
                $scope.errors.push({message: "Qlik error, see the console for more information."});
              });


              // Remove the help div on button click
              $scope.removeHelp = function () {
                var help = document.querySelector("#help");
                help.parentNode.removeChild(help);
              };


              // Basic loading feedback
              $scope.isLoading = function (t) {
                return t === 'table' ? $scope.tableloading : $scope.dialogloading;
              };


              // Table status
              $scope.isTableLoaded = function () {
                return $scope.layout.tableloaded;
              };


              // Create a table to view the master items
              $scope.loadItemsIntoTable = function () {
                $scope.tableloading = true;
                $scope.app.createGenericObject({qFieldListDef:{qShowHidden:true}}, function (fields) {
                  $scope.fieldlist = fields.qFieldList.qItems.filter(f => f.qName.match("id|qtype|title|definition|label|description|grouping|labelexpression|tags|color")).map(f => f.qName);
                  $scope.table = $scope.app.createTable($scope.fieldlist, { rows : $scope.layout.tablerows });
                  var addItems = function () {
                    $scope.masteritems = $scope.table.rows.map((row) => {return tools.buildMasterItemPlaceHolder(row.cells)});
                    if ($scope.masteritems[0] && $scope.masteritems[0].message) {
                      $scope.errors.push({"message": $scope.masteritems[0].message});
                      $scope.tableloading = false;
                      $scope.layout.tableloaded = false;
                      return false;
                    }
                    $scope.tableloading = false;
                    $scope.layout.tableloaded = true;
                  };
                  $scope.table.OnData.bind(addItems);
                });
              };


              // List all the dimensions and the measures for all apps available to the user
              $scope.collectAppObjects = (id) => {
                var e = {
                  appid: "",
                  measureList: [],
                  dimensionList: []
                };
                if (id === $scope.app.id) {
                  return e;
                }
                var a = qlik.openApp(id, $scope.config);
                return a.getList('MeasureList').then(o => {
                  return a.getList('DimensionList').then((p) => {
                      a.close();
                    return {
                      appid: id,
                      measureList: o.layout.qMeasureList.qItems,
                      dimensionList: p.layout.qDimensionList.qItems
                    };
                  }).catch((error)=>{
                    $scope.errors.push({message: error.message});
                    return e;
                  });
                }).catch((error)=>{
                  $scope.errors.push({message: error.message});
                  return e;
                });
              };


              // List all the apps available to the current user and collect their objects
              $scope.buildApplicationList = function (list) {
                $scope.dialogloading = true;
                $scope.applist = [];
                $scope.applist.length = 0;
                if ( list.length === 0 ) {
                  $scope.errors.push({message: 'No application found.'});
                  return false;
                }
                // If not full access rights or published app remove it from the list and warn user
                list.forEach(function (item, index) {
                  if ( (item.qConnectedUsers > 0) || (item.qMeta.published && item.qMeta.published === true) || (item.qMeta.privileges && item.qMeta.privileges.length < 4) ) {
                      $scope.warnings.push({message: `Not allowed to modify ${item.qDocName}, removing it from the list.`});
                      list.splice(index,1);
                  }
                });
                $scope.applist = list.map((item) => ({
                      id: item.qDocId
                    , name: item.qDocName
                    , title: item.qTitle
                    , description: item.qMeta.description
                }));
                var p = $scope.applist.map((item) => {return $scope.collectAppObjects(item.id)});
                Promise.all(p).then((data) => {
                  $scope.appobjects = data;
                  $scope.dialogloading = false;
                }).catch(error=>$scope.errors.push({message: error.message}));
                $scope.showDialog();
              };


              // Show the dialog with the apps and master items
              $scope.showDialog = function () {
                luiDialog.show({
                  template: dialogTemplate,
                  input: {
                      applist: $scope.applist,
                      masteritems: $scope.masteritems
                  },
                  controller: ['$scope', function ($$scope) {
                    $$scope.errors = $scope.errors;
                    $$scope.infos = $scope.infos;
                    $$scope.warnings = $scope.warnings;
                    $scope.currentApptObjects = [];
                    $$scope.masteritemcheck = {};
                    $$scope.selectedapps = [];
                    $$scope.selectedmasteritems = [];

                    // Mechanism for disabling action button if either of app or master item has no selection
                    $$scope.countChecked = function () {
                      return $scope.applist.some(item => item.isselected) && $scope.masteritems.some(item => item.isselected) && !$scope.loading ? true : false;
                    }


                    // Function to create the objects in the backend
                    $$scope.createObject = function (doc, method, item, appid, overwrite, realid) {
                      var payload = overwrite ? realid : item;
                      return doc[method](payload).then(function (response) {
                        if ( overwrite === true ) {
                          response.setProperties(item);
                        } else {
                          $$scope.infos.push({message: `Master item ${response.qInfo.id} of type ${response.qInfo.genericType} created successfully in ${appid.name}.`});
                        }
                      }).catch((error) => {
                        console.log("createObject() error: ", error);
                        $$scope.errors.push({message: "Engine error. Check the console."});
                      });
                    };


                    // Wrapper function to call the engine
                    $$scope.callAppEngine = function (apps, items) {

                      angular.forEach(apps, function (a) {
                        var qlik_app = qlik.openApp(a.id, $scope.config);
                        qlik_app.getAppLayout().then((r) => {
                          r.waitForOpen.promise.then((resp) => {
                            var promisearray = [];
                            angular.forEach(items, function(item) {
                              var method = item.status.overwrite === true  && item.qtype === 'dimension' ? 'getDimension'    :
                                           item.status.overwrite === true  && item.qtype === 'measure'   ? 'getMeasure'      :
                                           item.status.overwrite === false && item.qtype === 'dimension' ? 'createDimension' :
                                                                                                           'createMeasure'   ;
                              var masteritem = tools.buildMasterItemObject(item);
                              // For items that need to be overwritten, get the original qlik id from the array by matching the index with that of the app name
                              if ( item.status.overwrite === true )  {
                                var qlikid_index = item.status.forapps.indexOf(a.id);
                              }
                              var qlik_id = item.status.overwrite ? item.status.qlikid[qlikid_index] : null;
                              var enginecall = $$scope.createObject(r.engineApp, method, masteritem, a, item.status.overwrite, qlik_id);
                              promisearray.push(enginecall);
                            });
                            Promise.all(promisearray).then(response => {
                              $$scope.infos.push({message: `All task finished for app: ${r.layout.qTitle}`});
                              r.doSave();
                              if (a.id !== $scope.app.id) {
                                qlik_app.close();
                              }
                            }).catch(err=>{
                              console.log("callAppEngine() error: ",err);
                              $$scope.loading = false;
                              $$scope.errors.push({message: err});
                              // Close the app if it's not the current one
                              if (a.id !== $scope.app.id) {
                                qlik_app.close();
                              }
                            });
                          });
                        });
                      });
                    };


                    // Setting the notification icons for each app in the list
                    $$scope.isMasterItemInAppIcon = function (app) {
                      // Placeholder for selected applications and items
                      $$scope.selectedapps = $scope.applist.filter(a=>a.isselected);
                      $$scope.selectedmasteritems = $scope.masteritems.filter(item=>item.isselected);
                      // If the user has not selected any app, skip the check because it is costly
                      if ( $$scope.selectedmasteritems.length === 0 ) {
                          return 'lui-icon lui-icon--small lui-icon--warning lui-text-warning';
                      }
                      // Do not give a status icon for the current app
                      if (app.id === $scope.app.id) {
                        return '';
                      }
                      // Simple master item title check function, this can be extended to compare any props
                      function check(c,a) {
                        return a.filter((k) => {
                          return k.title === c;
                        });
                      }
                      // Only run this if the app objects are already loaded else angular keeps dirty checking for nothing
                      if ( $scope.appobjects.length > 1 && app ) {
                        var a = $scope.appobjects.filter(item => item.appid === app.id);
                        var d = Object.keys(a[0]).filter((e) => /List/.test(e));
                        var x = d.map(type => {
                          return a[0][type].map(i => {
                            // Add the real qlik object id to the selected master items
                            var m = $$scope.selectedmasteritems.filter(y => y.title === i.qData.title);
                            function findItemIndex(e) {
                              return e === i.qData.title;
                            }
                            var n = $$scope.selectedmasteritems.findIndex(findItemIndex);
                            if ( n > -1 ) {
                              m.map((q) => {
                                if ( !q.status.qlikid.includes(i.qInfo.qId) ) {
                                  $$scope.selectedmasteritems[n].status.qlikid.push(i.qInfo.qId);
                                }
                                if ( !q.status.forapps.includes(app.id) ) {
                                  $$scope.selectedmasteritems[n].status.forapps.push(app.id);
                                }
                                  $$scope.selectedmasteritems[n].status.overwrite = true;
                              });
                            }
                            return check(i.qData.title, $$scope.selectedmasteritems);
                          });
                        });
                        // Flatten the multidimensional arrays to get to the actual results
                        var z = x.reduce((acc, curr) => {
                          return acc + curr.reduce((ac, cu) => {
                            return ac + cu.length },0)
                        }, 0);
                        // Add the result for easy referencing outside this function
                        $$scope.masteritemcheck[app.id] = z;
                        // Set the icon class
                        return z === 0 ? 'lui-icon lui-icon--small lui-icon--tick lui-text-success' :
                                         'lui-icon lui-icon--small lui-icon--warning-triangle lui-text-danger';
                      }
                    };


                    // Show a different info depending on icon
                    $$scope.isMasterItemInAppTooltip = function (app) {
                      if ( $$scope.selectedmasteritems.length === 0) { return 'Select at least one master item first.'; }
                      if ( Object.keys($$scope.masteritemcheck).length > 0 ) {
                        return $$scope.masteritemcheck[app.id] > 0 ? 'This app already contains some of these master items. They will be overwritten if you save them.' :
                                                                     'This app does not contain any of these master items.'  ;
                      }
                    };


                    // Create the new master items (called from ui)
                    $$scope.populateMasterItems = function () {
                      return !$$scope.selectedmasteritems || $$scope.selectedmasteritems.length < 1 ?
                        $$scope.errors.push({message: 'Master item selection is empty.'}) :
                        $$scope.callAppEngine($$scope.selectedapps, $$scope.selectedmasteritems);
                    };


                    // Clear selections and placeholders when dialog is closed
                    $$scope.clearSelections = function () {
                      $$scope.selectedmasteritems = [];
                      $$scope.selectedapps = [];
                      $scope.errors = [];
                      ["applist","masteritems"].map((type) => {
                        $scope[type].map(i=>i.isselected = false);
                      });
                    };
                    // Clear notifications
                    $$scope.clearNotifications = function () {
                      $scope.errors = [];
                      $scope.infos = [];
                      $scope.warnings = [];
                      $$scope.errors = [];
                      $$scope.infos = [];
                      $$scope.warnings = [];
                    };
                  }]
                });
              }
              // This function is called from the template, only get data if it's not already there
              $scope.loadApplicationList = function () {
                if ( $scope.applist.length > 0 && $scope.appobjects.length > 0 ) {
                  $scope.showDialog();
                } else {
                  $scope.global.getAppList($scope.buildApplicationList, $scope.config);
                }
              };
            }]
          }}
        );
