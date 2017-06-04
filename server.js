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

var storage = multer.memoryStorage();
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

app.get('/', function(req, res) {
  res.json({alive:'hi'});
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
      console.log(req.file.originalname);
      processDraft(fileb.toString('utf8'), req.file.originalname, anonymize, function(err, drafts) {        
        utils.treatResult(res, err, {ids: drafts, filename: req.file.originalname});
        next();
      });      
    } else {
      res.json({error: "Error uploading file."});
    }
    return;
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
  var draftIds = req.query.ids;
  var username = req.query.username;
  var format = req.query.format;

  if (draftIds) {
    draftIds = draftIds.split(',');
  }

  if ((username && !validation.isUsername(username)) ||
      (draftId && !validation.isDraftId(draftId)) ||
      (format && !validation.isFormat(format)) ||
      (draftIds && !validation.isDraftIdArray(draftIds))) {
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
  } else if (draftIds) {
      dbManip.getDraftsById(draftIds, function(err, drafts) {
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

  if (cardArray) {
    cardArray = cardArray.substring(1);
    cardArray = cardArray.substring(0, cardArray.length-2);
    cardArray = cardArray.split(',');
    for (var i=0; i<cardArray.length; i++) {
      if (cardArray[i].charAt(0) === '"') {
        cardArray[i] = cardArray[i].substring(1);
      }
      if (cardArray[i].charAt(cardArray[i].length-1) === '"') {
        cardArray[i] = cardArray[i].substring(0, cardArray.length-2);
      }
    }
  }
  
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
