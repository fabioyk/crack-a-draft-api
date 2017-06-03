var mongoose = require('mongoose');
var async = require('async');
var utils = require('./utils');

var cardManip = require('./card');
var draftManip = require('./draft');
var formatManip = require('./format');

var dbSchema = require('./db-schema');

var shouldConnect = true;

var dbManip = {
  readyToGo: false,
  // initialize db and schema
  init() {
    dbManip.readyToGo = false;
    if (shouldConnect) mongoose.connect(process.env.DB_URI);
    var db = mongoose.connection;
    db.on('error', console.error.bind(console, 'Connection error:'));

    db.once('open', function() {
      console.log('dbManip - Db connected!');
      dbSchema.init();
      dbManip.readyToGo = true;
    });
  },
  
  //// ----------------------- DRAFT MANIPULATION ----------------------- ////
    
  uploadDrafts(username, draftDate, format, draftData, callback) {
    var draftsObj = [];
    
    draftData.forEach(function(singleDraftData) {
      draftsObj.push({
        drafter: username,
        submitDate: Date.now(),
        format: format,
        packs: singleDraftData.packs,
        picks: singleDraftData.picks,
        cracks: []
      });
    });
    
    cardManip.checkMissingCards(draftsObj, callback, function(cardsOk) {      
      draftManip.uploadDrafts(draftsObj, callback, function(drafts) {
        formatManip.getFormat(format, true, function(formatErr) {
          if (formatErr === 'Not found') {
            formatManip.insertFormat(format, formatManip.getNameFromMtgo(format), draftsObj.length, callback, function(formatAdded) {
              callback(null, drafts);
            });
          }
        }, function(formatObj) {
          formatManip.incrementFormat(format, draftsObj.length, callback, function(formatFound) {
              callback(null, drafts);
            });
        });
      });
    });
  },
  
  getDraft(draftId, isCardInfoEmbed, callback) {
    draftManip.getDraftById(draftId, callback, function(draftFound) {
      if (!isCardInfoEmbed) {
        dbManip.processAndReturnDraft(draftFound, callback, utils.createOkCallback(callback));
      } else {
        dbManip.processAndReturnDraft(draftFound, callback, function(draft) {
          cardManip.createCardsArr(draft, callback, utils.createOkCallback(callback));
        });
      }
    });
  },
  
  getRandomDraftByFormat(format, randomSize, callback) {
    draftManip.getRandomDraft(format, randomSize, callback, function(draftFound) {
      dbManip.processAndReturnDraft(draftFound, callback, utils.createOkCallback(callback));
    });    
  },
  
  getDrafts(username, pageSize, pageNumber, callback) {
    draftManip.getDraftsByUser(username, pageSize, pageNumber, callback, function(drafts) {
      dbManip.processAndReturnDraft(drafts, callback, utils.createOkCallback(callback));
    });
  },
  
  getDraftsCount(username, callback) {
    draftManip.getDraftsCount(username, callback, utils.createOkCallback(callback));
  },

  processAndReturnDraft(draft, errCallback, okCallback) {
    if (!Array.isArray(draft)) {
      formatManip.getFormat(draft.format, true, errCallback, function(formatFound) {            
        okCallback({
          draft: draft,
          format: {
            name: formatFound.name,
            mtgoName: formatFound.mtgoName
          }
        });
      })
    } else {
      var formats = [];
      draft.forEach(function(eachDraft) {
        if (formats.indexOf(eachDraft.format) === -1) {
          formats.push(eachDraft.format);
        }
      });
      formatManip.getTheseFormats(formats, errCallback, function(formats) {
        var draftDataArr = [];
        draft.forEach(function(eachDraft) {
          var formatName = formats.reduce(function(currentName, eachFormat) {
            if (eachFormat.mtgoName === eachDraft.format) {
              return eachFormat.name;
            } else {
              return currentName;
            }            
          }, eachDraft.format);

          draftDataArr.push({
            draft: eachDraft,
            format: {
              name: formatName,
              mtgoName: eachDraft.format
            }
          })
        });
        okCallback(draftDataArr);
      });
    }    
  },

  getCardsFromList(cardArr, callback) {
    cardManip.getCardsFromList(cardArr, callback, utils.createOkCallback(callback));
  },
  
  //// ----------------------- CRACK MANIPULATION ----------------------- ////
  
  uploadCrack(draftId, picks, archetype, callback) {
    draftManip.uploadCrack(draftId, picks, archetype, callback, utils.createOkCallback(callback));
  },
  
  //// ----------------------- FORMAT MANIPULATION ----------------------- ////
  
  getAllFormats(callback) {
    formatManip.getAllFormats(callback, utils.createOkCallback(callback));
  },

  insertFormat(formatName, mtgoName, number, callback) {
    formatManip.insertFormat(formatName, mtgoName, number, callback, utils.createOkCallback(callback));
  },

  getFormat(name, isMtgoName, callback) {
    formatManip.getFormat(name, isMtgoName, callback, utils.createOkCallback(callback));
  },  
  
  //// ----------------------- STARTUP ----------------------- ////

  uploadAllCards(setName) {
    if (setName) {
      cardManip.uploadAllCards('https://mtgjson.com/json/'+setName+'.json');
    } else {
      cardManip.uploadAllCards('https://mtgjson.com/json/AllCards.json');
    }    
  },

  uploadAllSets() {
    formatManip.uploadAllSets();
  }
};

module.exports = dbManip;