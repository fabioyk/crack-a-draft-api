// server.js
var express = require('express');
var app = express();
var processDraft = require('./manageDraftUpload');
var dbManip = require('./database/databaseManipulation');
var validation = require('./server/validation');
var utils = require('./server/utils');
var cors = require('cors');
var bodyParser = require("body-parser");
var fs = require('fs');
var multer  =   require('multer');

var storage = multer.memoryStorage();  /* multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, './uploads');
  },
  filename: function (req, file, callback) {
    callback(null, file.fieldname + '-' + Date.now());
  }
});*/
var upload = multer({ storage : storage, limits: { fileSize:  1000000 } }).single('file');

app.use(bodyParser.json());
app.use(cors());
app.use(express.static('public'));

app.all('/', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (dbManip.readyToGo) {
    next();
  } else {
    setTimeout(next, 500);
  }    
});

app.post("/api/draft", function (req, res, next) {
  upload(req,res,function(err) {
    if(err) {
      console.log(err);
      return res.json({error: "Error uploading file."});
    }

    var fileb = Buffer.from(req.file.buffer);
    
    if (fileb) {
      var anonymize = req.query.anonymous;
      if (anonymize && anonymize !== 'true') {
        utils.validationError(res);
        return;
      }
      processDraft(fileb.toString('utf8'), req.file.filename, anonymize, function(err, drafts) {
        if (drafts && Array.isArray(drafts)) {
          drafts.forEach(function(eachDraftId) {
            dbManip.uploadDraftCards(eachDraftId, function(err, res){
              if (err) {
                console.log(err);
              }
            });
          });
        }
        utils.treatResult(res, err, {ids: drafts, filename: req.files[0].originalname});

        next();
      });      
    } else {
      res.json({error: "Error uploading file."});
    }
    return;
    /*fs.readFile(req.files[0].path, 'utf8', function (err,data) {
      if (err) {
        res.json({error: "Error uploading file."});
        return console.log(err);
      }
      // todo validate draft
      
    });*/
  });
});

app.get("/api/draft/count", function(req, res) {
  var username = req.query.username;
  
  if (username) {
    if (!validation.isUsername(username)) {
      utils.validationError(res);
      return;
    }
    dbManip.getDraftsCount(username, function(err, count) {
      utils.treatResult(res, err, {count: count});
    });
  } else {
    dbManip.getDraftsCount('', function(err, count) {
      utils.treatResult(res, err, {count: count});
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
    utils.validationError(res);
    return;
  }
  
  if (draftId) {
    // get a specific draft by id
    var isEmbed = req.query.embed === 'true';
    dbManip.getDraft(draftId, isEmbed, function(err, draft) {
      utils.treatResult(res, err,draft);
    })
  } else if (username) {
    // get from all drafts by username, a certain page
    dbManip.getDrafts(username, +req.query.pageSize, +req.query.pageNumber, function(err, drafts) {
      utils.treatResultArr(res, err, drafts);
    });
  } else if (format) {
    // get random draft from format
    var formatAndSize = format.split(',');
    dbManip.getRandomDraftByFormat(formatAndSize[0], +formatAndSize[1], function(err, draft) {
      utils.treatResult(res, err, draft);
    });
  } else if (req.query.pageSize) {
    // get from all drafts, a certain page
    dbManip.getDrafts('', +req.query.pageSize, +req.query.pageNumber, function(err, drafts) {
      utils.treatResultArr(res, err, drafts);
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
    utils.validationError(res);
    return;
  }
  
  dbManip.uploadCrack(params.draftId, params.picks, params.archetype, function(err, crackId) {
    utils.treatResult(res, err, {id: crackId});
    
    next();
  });
});

app.get("/api/format", function(req, res) {
  dbManip.getAllFormats(function(err, formats) {
    utils.treatResult(res, err, formats);
  });
});

app.get("/api/card", function(req, res) {
  var cardName = req.query.name;
  var cardArray = req.query.array;
  
  if ((cardName && !validation.isCardName(cardName)) ||
      (cardArray && !validation.isCardArray(cardArray))) {
    utils.validationError(res);
    return;
  }
  
  if (cardName) {
    dbManip.getCardsFromList([cardName], function(err, card) {
      utils.treatResult(res, err, card);
    });
  } else if (cardArray) {
    cardArray = JSON.parse(cardArray);
    dbManip.getCardsFromList(cardArray, function(err, card) {
      utils.treatResult(res, err, card);
    });
  }
});



// listen for requests
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
  dbManip.init();
});
