// server.js
// where your node app starts

// init project
var express = require('express');
var app = express();
var multer  =   require('multer');
var processDraft = require('./manageDraftUpload');
var dbManip = require('./databaseManipulation');
var validation = require('./validation');

var bodyParser =    require("body-parser");
app.use(bodyParser.json());

var cors = require('cors');
app.use(cors());

app.treatResult = function(res, err, obj) {
  if (err) {
    console.log(err);
    res.json({error:err});
  } else {
    res.json(obj);
  }
}

app.treatResultArr = function(res, err, obj) {
  if (err) {
    console.log(err);
    res.json([{error:err}]);
  } else {
    res.json(obj);
  }
}

app.validationError = function(res) {
  res.json({error: 'Validation error'});
}

app.all('/', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (dbManip.readyToGo) {
    next();
  } else {
    setTimeout(next, 1000);
  }
    
  });

// we've started you off with Express, 
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});


var storage =   multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, './uploads');
  },
  filename: function (req, file, callback) {
    callback(null, file.fieldname + '-' + Date.now());
  }
});
var upload = multer({ storage : storage }).array('file'); // todo check multiple uploads


var fs = require('fs');

app.post("/api/draft", function (req, res, next) {
  upload(req,res,function(err) {
    if(err) {
      console.log(err);
      return res.json({error: "Error uploading file."});
    }
    try {
      fs.readFile(req.files[0].path, 'utf8', function (err,data) {
        if (err) {
          res.json({error: "Error uploading file."});
          return console.log(err);
        }
        // todo validate draft
        var anonymize = req.query.anonymous;
        if (anonymize && anonymize !== 'true') {
          app.validationError(res);
          return;
        }
        processDraft(data, req.files[0].originalname, anonymize, function(err, drafts) {
          if (drafts && Array.isArray(drafts)) {
            drafts.forEach(function(eachDraftId) {
              dbManip.uploadDraftCards(eachDraftId, function(err, res){
                if (err) {
                  console.log(err);
                }
              });
            });
          }
          app.treatResult(res, err, {ids: drafts, filename: req.files[0].originalname});

          next();
        });      
      });
    } finally {
      fs.unlink('./' + req.files[0].path);
    }    
  });
});

app.get("/api/draft/count", function(req, res) {
  var username = req.query.username;
  
  if (username) {
    if (username && !validation.isUsername(username)) {
      app.validationError(res);
      return;
    }
    dbManip.getDraftsCount({drafter: { $regex : new RegExp('^'+username+"$", "i") }}, function(err, count) {
      app.treatResult(res, err, {count: count});
    });
  } else {
    dbManip.getDraftsCount({}, function(err, count) {
      app.treatResult(res, err, {count: count});
    });
  }
  
});

app.get("/api/draft", function(req, res) {
  var draftId = req.query.id;
  var username = req.query.username;
  var format = req.query.format;
    
  if ((username && !validation.isUsername(username)) ||
      (draftId && !validation.isDraftId(draftId)) ||
      (format && !validation.isFormat(format))) {
    app.validationError(res);
    return;
  }
  
  if (draftId) {
    var isEmbed = req.query.embed === 'true';
    dbManip.getDraft(draftId, isEmbed, function(err, draft) {
      app.treatResult(res, err,draft);
    })
  } else if (username) {
    // get all drafts by username    
    dbManip.getDrafts({drafter: { $regex : new RegExp('^'+username+"$", "i") }}, +req.query.pageSize, +req.query.pageNumber, {submitDate: -1}, function(err, drafts) {
      app.treatResultArr(res, err, drafts);
    });
  } else if (format) {
    // get random draft from format
    var formatAndSize = format.split(',');
    dbManip.getRandomDraftByFormat(formatAndSize[0], +formatAndSize[1], function(err, draft) {
      app.treatResult(res, err, draft);
    });
  } else if (req.query.pageSize) {
    dbManip.getDrafts({}, +req.query.pageSize, 0, {submitDate: -1}, function(err, drafts) {
      app.treatResultArr(res, err, drafts);
    });    
  } else {
    res.json({error: 'Error'});
  }
});



app.post("/api/crack", function(req, res, next) {
  var params = req.body;
  
  if (!validation.isDraftPicks(params.picks, 8) ||
      !validation.isDraftId(params.draftId) ||
      !validation.isArchetype(params.archetype)) {
    app.validationError(res);
    return;
  }
  
  dbManip.uploadCrack(params.draftId, params.picks, params.archetype, function(err, crackId) {
    app.treatResult(res, err, {id: crackId});
    
    next();
  });
});

app.get("/api/format", function(req, res) {
  dbManip.getAllFormats(function(err, formats) {
    app.treatResult(res, err, formats);
  });
});

app.get("/api/card", function(req, res) {
  var cardName = req.query.name;
  var cardArray = req.query.array;
  
  if ((cardName && !validation.isCardName(cardName)) ||
      (cardArray && !validation.isCardArray(cardArray))) {
    app.validationError(res);
    return;
  }
  
  if (cardName) {
    dbManip.getCardsFromList([cardName], function(err, card) {
      app.treatResult(res, err, card);
    });
  } else if (cardArray) {
    cardArray = JSON.parse(cardArray);
    dbManip.getCardsFromList(cardArray, function(err, card) {
      app.treatResult(res, err, card);
    });
  }
});



// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
  dbManip.init();
  
  
  //setTimeout(function(){ dbManip.uploadAllCards(); },1000);
  //setTimeout(function(){ dbManip.uploadAllSets(); },1000);
  /*setTimeout(function() {
    cardManip.uploadDraft('59169946c5eba0725e3178fa', function(err, res) {
        console.log(err);
        console.log(res); 
      });
  }, 1000);*/
//  console.log(dbManip.generateDraftId('gregoryshol', 1494279204246, [14,11,10,5,15,10,8,14,6,12,7,10]));
});
