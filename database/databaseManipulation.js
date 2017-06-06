var mongoose = require('mongoose');
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
    
  uploadDrafts(username, draftDate, format, date, draftData, callback) {
    var draftsObj = [];

    formatManip.getFormat(format, true, callback, function(formatFound) {
      draftData.forEach(function(singleDraftData) {
        draftsObj.push({
          drafter: username,
          submitDate: Date.now(),
          modifiedDate: date,
          format: format,
          packs: singleDraftData.packs,
          picks: singleDraftData.picks,
          cracks: []
        });
      });

      cardManip.checkMissingCards(draftsObj, callback, function(cardsOk) {      
        draftManip.uploadDrafts(draftsObj, callback, function(drafts) {          
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
        dbManip.processAndReturnDraft(draftFound, false, callback, utils.createOkCallback(callback));
      } else {
        dbManip.processAndReturnDraft(draftFound, false, callback, function(draft) {
          cardManip.createCardsArr(draft, callback, utils.createOkCallback(callback));
        });
      }
    });
  },

  getDraftsById(draftIds, callback) {
    draftManip.getDraftsById(draftIds, callback, function(drafts) {
      dbManip.processAndReturnDraft(drafts, true, callback, utils.createOkCallback(callback));
    });
  },
  
  getRandomDraftByFormat(format, randomSize, callback) {
    draftManip.getRandomDraft(format, randomSize, callback, function(draftFound) {
      dbManip.processAndReturnDraft(draftFound, true, callback, utils.createOkCallback(callback));
    });    
  },
  
  getDrafts(username, pageSize, pageNumber, callback) {
    draftManip.getDraftsByUser(username, pageSize, pageNumber, callback, function(drafts) {
      dbManip.processAndReturnDraft(drafts, true, callback, utils.createOkCallback(callback));
    });
  },
  
  getDraftsCount(username, callback) {
    draftManip.getDraftsCount(username, callback, utils.createOkCallback(callback));
  },

  processAndReturnDraft(draft, isSmall, errCallback, okCallback) {
    if (!Array.isArray(draft)) {
      formatManip.getFormat(draft.format, true, errCallback, function(formatFound) {
        if (!draft.modifiedDate) {
          draft.modifiedDate = 0;
        }
        var crackArr = [];
        var packs = [];
        var picks = [];
        if (!isSmall) {
          crackArr = draft.cracks;
          packs = draft.packs;
          picks = draft.picks;
        }
        var crackArr = isSmall ? [] : draft.cracks;
        okCallback({
          draft: {
            _id: draft._id,
            drafter: draft.drafter,
            submitDate: draft.submitDate,
            modifiedDate: draft.modifiedDate,
            format: draft.format,
            packs: packs,
            picks: picks,
            cracks: crackArr,
            faceCard: draft.packs[0][13],
            numCracks: draft.cracks.length
          },
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

          if (!eachDraft.modifiedDate) {
            eachDraft.modifiedDate = 0;
          }

          var crackArr = [];
          var packs = [];
          var picks = [];
          if (!isSmall) {
            crackArr = eachDraft.cracks;
            crackArr = eachDraft.packs;
            crackArr = eachDraft.picks;
          }

          draftDataArr.push({
            draft: {
            _id: eachDraft._id,
            drafter: eachDraft.drafter,
            submitDate: eachDraft.submitDate,
            modifiedDate: eachDraft.modifiedDate,
            format: eachDraft.format,
            packs: packs,
            picks: picks,
            cracks: crackArr,
            faceCard: eachDraft.packs[0][13],
            numCracks: eachDraft.cracks.length
          },
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