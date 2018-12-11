define([], function () {

    var buildMasterItemPlaceHolder = function (d) {
      // TODO make this with a Promise
        try {
          // These are loaded in the order of appearance of column in excel
          var o = {
                id              : d[0].qText
              , qtype           : d[1].qText
              , title           : d[2].qText
              , definition      : d[3].qText
              , label           : d[4].qText
              , description     : d[5].qText
              , grouping        : d[6].qText
              , labelexpression : d[7].qText
              , tags            : d[8].qText
              , color           : d[9].qText
              , status          : {
                  overwrite     : false
                , forapps       : [] // to which app or apps the items need to be sent
                , qlikid        : [] // what are the real object ids for master item that need to be overwritten
              }
            };
            Object.keys(o).forEach(function (key, index) {
              o[key] === "-" ? o[key] = "" : o[key] = o[key];
            });
            return o;

        } catch (e) {
          console.log("Error in table.",e);
          return {"message": "There is a problem with the table. Make sure there are 9 columns in the proper order with the proper headers."};
        }
    };
    var buildMasterItemObject = function (data) {

        /*
         * the name of the measure or dimension in the ui is the title
         * https://help.qlik.com/en-US/sense-developer/April2018/Subsystems/Mashups/Content/Create/Visualizations/dimensions.htm#Drill-do
         */
        var t = data.qtype === "dimension" ?

          {
              "qGrouping"        : data.grouping
            , "qFieldDefs"       : data.definition.split(/[,] ?/) || data.definition
            , "qFieldLabels"     : data.label.split(/[,] ?/) || data.label
            , "title"            : data.title
            , "qLabelExpression" : data.labelexpression
            , "coloring"         : {
                "baseColor" : {
                  "color": data.color,
                  "index": -1
                }
              }
          }

          :

          {
              "qLabel"           : data.label
            , "qDef"             : data.definition
            , "qGrouping"        : data.grouping
            , "qExpressions"     : []
            , "title"            : data.title
            , "qLabelExpression" : data.labelexpression
            , "coloring"         : {
                "baseColor" : {
                  "color": data.color,
                  "index": -1
                }
              }
          };

        var o = {
              "qInfo" : {
                "qId"   : data.status.overwrite ? data.id : "",
                "qType" : data.qtype
              },
              "qMetaDef" : {
                "title"       : data.title || "",
                "description" : data.description || "",
                "tags"        : data.tags.split(/[,] ?/) || data.tags || null
              }
            };

        // Add the subitem and clean up any double srings artifact from excel
        data.qtype === "dimension" ? o['qDim'] = t : o['qMeasure'] = t;

        if ( data.qtype == "dimension" && o.qDim.qFieldDefs.length > 1 ) {
          o.qDim.qFieldDefs.forEach(function(value, index) {
            o.qDim.qFieldDefs[index] = o.qDim.qFieldDefs[index].replace(/"/g,'')  });
          o.qDim.qFieldLabels.forEach(function(value, index) {
            o.qDim.qFieldLabels[index] = o.qDim.qFieldLabels[index].replace(/"/g,'')  });
        }

        return o;
    };

    return {
        buildMasterItemPlaceHolder: buildMasterItemPlaceHolder
      , buildMasterItemObject: buildMasterItemObject
    };

});
