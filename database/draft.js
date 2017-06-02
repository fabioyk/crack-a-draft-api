var dbSchema = require('./db-schema');
var utils = require('./utils');

var draftManip = {
  uploadDrafts(draftsObj, errCallback, okCallback) {
    dbSchema.Draft.collection.insert(draftsObj, function(err, drafts) {
      utils.checkErr(err, drafts.insertedIds, errCallback, okCallback);
    });
  },

  getDraftById(draftId, errCallback, okCallback) {
    dbSchema.Draft.findById(draftId, function(err, draftFound) {
      utils.checkErrNotFound(err, draftFound, errCallback, okCallback);
    });
  },

  getRandomDraft(format, randomLimit, errCallback, okCallback) {
    var random = Math.floor(Math.random() * randomLimit);
    var queryObj = {};
    if (format !== 'random') {
      queryObj.format = format;
    }
    dbSchema.Draft.findOne(queryObj).skip(random).exec(function(err, draftFound) {
      utils.checkErrNotFound(err, draftFound, errCallback, okCallback);
    });
  },

  getDraftsByUser(username, pageSize, pageNumber, errCallback, okCallback) {
    var queryObj = {};
    if (username) {
      queryObj = {drafter: { $regex : new RegExp('^'+name+"$", "i") }};
    }
    var skip = 0;
    if (pageSize && pageNumber) {
      skip = pageSize * pageNumber;
    }
    dbSchema.Draft.find(queryObj)
      .sort({ submitDate: -1 })
      .skip(skip)
      .limit(pageSize)
      .exec(function(err, drafts) {
        utils.checkErr(err, drafts, errCallback, okCallback);
      });
  },

  getDraftsCount(username, errCallback, okCallback) {
    var queryObj = {};
    if (username) {
      queryObj = {drafter: { $regex : new RegExp('^'+username+"$", "i") }};
    }
    dbSchema.Draft.count(queryObj, function(err, count) {
      utils.checkErr(err, count, errCallback, okCallback);
    });
  },

  uploadCrack(draftId, picks, archetype, errCallback, okCallback) {
    var crackId = dbManip.generateCrackId(picks);
    
    var crackObj = {
      id: crackId,
      date: Date.now(),
      picks: picks,
      archetype: archetype
    };
    
    dbSchema.Draft.findByIdAndUpdate(draftId, { $push: { cracks: crackObj }}, function(err, crackUploaded) {
      utils.checkErr(err, crackId, errCallback, okCallback);
    });
  },


  generateCrackId(picks) {
    const millSince2017 = 1483236000000;
    
    var id = '';
    id += utils.convertBase((Date.now() - millSince2017).toString(), process.env.TIME_BASE, process.env.ID_BASE);
    var pickNumbers = picks.join('');
    id += utils.convertBase(pickNumbers, process.env.PICK_BASE, process.env.ID_BASE);
    
    return id;
  },
};

module.exports = draftManip;