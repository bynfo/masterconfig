define([], function () {

    var initialproperties = {
      version: 1.0,
      qHyperCubeDef : {
                qDimensions : [],
                qMeasures: [],
                qInitialDataFetch : [{
                    qWidth : 20,
                    qHeight : 300
                }]
      },
      InitialNumRows: 300,
      InitialNumCols: 20
    };

    var snapshot = {
      canTakeSnapshot : true,
      export: true,
      exportData: true
    };

    var definition = {
  		type: "items",
  		component: "accordion",
  		items: {
        settings : {
          uses : "settings",
          type : "items",
          items : {
            maxrows: {
                ref: "tablerows",
                label: "Number of rows in table",
                type: "items",
                items: {
                  tablerows: {
                    ref: "tablerows",
                    label: "Set the amount of rows to show",
                    type: "integer",
                    defaultValue: 300
                  }
                }
              },
              tableloaded: {
                  ref: "tableloaded",
                  label : "Table is loaded",
                  type: "string",
                  defaultValue: false
                }
          }
        }
  		}
  	};

    return {
        initialproperties: initialproperties
      , snapshot: snapshot
      , definition: definition
    };
});
