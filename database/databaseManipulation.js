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
  
  // upload one or more drafts already processed by manageDraftUpload
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
            formatManip.insertFormat(format, formatManip.getNameFromMtgo(format), draftsObj.length, callback, utils.createOkCallback(callback));
          }
        }, function(formatObj) {
          formatManip.incrementFormat(format, draftsObj.length, callback, utils.createOkCallback(callback));
        });
      });
    });


    // dbSchema.Draft.collection.insert(draftsObj, function(err, drafts) {
    //   if (err) {
    //     callback(err);
    //   } else {
        
    //     var cards = [];
    //     draftsObj.forEach(function(eachDraft) {
    //       eachDraft.packs.forEach(function(eachPack, index) {
    //         cards.push(eachPack[eachDraft.picks[index]]);
    //       });
    //     })
        
    //     var filteredCards = cards.filter(utils.filterRepeats);
    //     dbManip.getCardsFromList(filteredCards, function(err, dbCards) {
    //       if (err) {
    //         console.log(err);
    //       }
    //     });
        
    //     dbManip.getFormat(format, true, function(formatErr, formatObj) {
    //       if (formatErr === 'Not found') {
    //         dbManip.insertFormat(formatManipulation.getNameFromMtgo(format), format, draftsObj.length, function(insertFormatErr, insertedFormat) {
    //           dbManip.checkErr(insertFormatErr, altIds, callback);
    //         });
    //       } else {
    //         if (formatErr) {
    //           callback(formatErr, null);
    //         }
    //         dbManip.incrementFormat(format, draftsObj.length, function(incrementErr, incrementedFormat) {
    //           dbManip.checkErr(incrementErr, altIds, callback);
    //         });            
    //       }
    //     });        
    //   }
    // });
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

    // dbSchema.Draft.findById(draftId, function(err, draftFound) {
    //   if (!isCardInfoEmbed) {
    //     dbManip.processAndReturnDraft(err, draftFound, callback);
    //   } else {
    //     dbManip.processAndReturnDraft(err, draftFound, function(err, draft) {
    //       if (err) {
    //         callback(err, null);
    //       } else {
    //         dbManip.createCardsArr(draft, function(err, cardSet) {
    //           if (err) {
    //             callback(err, null);
    //           } else {
    //             draft.cards = cardSet;
    //             callback(null, draft);
    //           }
    //         });
    //       }
          
    //     });
    //   }
      
    // });
  },
  
  getRandomDraftByFormat(format, randomSize, callback) {
    draftManip.getRandomDraft(format, randomSize, callback, function(draftFound) {
      dbManip.processAndReturnDraft(draftFound, callback, utils.createOkCallback(callback));
    });    
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
  
  getDrafts(username, pageSize, pageNumber, callback) {
    draftManip.getDraftsByUser(username, pageSize, pageNumber, callback, function(drafts) {
      dbManip.processAndReturnDraft(drafts, callback, utils.createOkCallback(callback));
    });
    
    // dbSchema.Draft.find(query)
    //   .sort(sortObj)
    //   .skip(pageSize * pageNumber)
    //   .limit(pageSize)
    //   .exec(function(err, drafts) {
    //     if (err) {
    //       callback(err, null);          
    //     } else {
    //       var formats = [];
    //       drafts.forEach(function(draft) {
    //         if (formats.indexOf(draft.format) === -1) {
    //           formats.push(draft.format);
    //         }
    //       });
    //       var query = [];
    //       formats.forEach(function(format) {
    //         query.push({mtgoName: format});
    //       });
    //       dbSchema.Format.find({$or: query}, function(err, formats) {
    //         if (err) {
    //           callback(err, null);
    //         } else {
    //           var draftDataArr = [];
    //           drafts.forEach(function(draft) {
    //             var formatName = draft.format;
    //             formats.forEach(function(formatObj) {
    //               if (formatObj.mtgoName === draft.format) {
    //                 formatName = formatObj.name;
    //               }
    //             });
    //             draftDataArr.push({
    //               draft: draft,
    //               format: {
    //                 name: formatName,
    //                 mtgoName: draft.format
    //               }
    //             })
    //           });
    //           callback(null, draftDataArr);
    //         }            
    //       });
    //     }
    //     // dbManip.checkErrNotFound(err, drafts, callback);
    // });
  },
  
  getDraftsCount(username, callback) {
    draftManip.getDraftsCount(username, callback, utils.createOkCallback(callback));
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



  // getAllFormats(callback) {
  //   dbSchema.Format.find({drafts: {$gt: 0}}, function(err, formats) {
  //     var formattedFormats = [];
  //     if (!err) {        
  //       formats.forEach(function(format) {
  //         formattedFormats.push({
  //           name: format.name,
  //           mtgoName: format.mtgoName,
  //           drafts: format.drafts
  //         });
  //       });
  //     }
  //     dbManip.checkErrNotFound(err, formattedFormats, callback);
  //   });
  // },
  
  // insertFormat(formatName, mtgoName, number, callback) {
  //   var formatObj = {
  //     name: formatName,
  //     mtgoName: mtgoName,
  //     drafts: number
  //   };
  //   console.log('Trying to create',formatName,mtgoName);
  //   dbSchema.Format.create(formatObj, function(err, res) {
  //     dbManip.checkErr(err, res, callback);
  //   })
  // },
  
  // getFormat(name, isMtgoName, callback) {
  //   var searchObj = {};
  //   if (isMtgoName) {
  //     searchObj.mtgoName = name;
  //   } else {
  //     searchObj.name = name;
  //   }
    
  //   dbSchema.Format.findOne(searchObj, function(err, formatFound) {
  //     dbManip.checkErrNotFound(err, formatFound, callback);
  //   });
  // },
  
  // incrementFormat(formatName, number, callback) {    
  //   dbSchema.Format.findOneAndUpdate(
  //     {mtgoName: formatName}, {$inc: {drafts: number}}, function (err, res) {
  //       dbManip.checkErr(err, res, callback);
  //     })
    
  // },
  
  // checkErrNotFound(err, obj, callback) {
  //   if (err || !obj) {
  //       if (err) {
  //         console.log(err);
  //       }
  //       callback(err || 'Not found', null);
  //     } else {        
  //       callback(null, obj);
  //     }
  // },
  
  // checkErr(err, obj, callback) {
  //   if (err) {
  //     console.log(err);
  //     callback(err, null);      
  //   } else {
  //     callback(null, obj);
  //   }
  // },
  
  
  // uploadDraftCards(draftId, callback) {
  //   dbManip.getDraft(draftId, false, function(err, draft) {
  //     if (err) {
  //       callback(err, null);
  //     } else {
  //       var cards = [];
  //       draft.draft.packs.forEach(function(eachPack, index) {
  //         cards.push(eachPack[draft.draft.picks[index]]);
  //       });
  //       var filteredCards = cards.filter(utils.filterRepeats);
  //       dbManip.getCardsFromList(filteredCards, function(err, dbCards) {
  //         if (err) {
  //           callback(err, null);
  //         } else {
  //           callback(null, dbCards);
  //         }
  //       });
  //     }
  //   });
  // },

  // uploadCardsFromList(cardArr, callback) {
  //   var apiUrl = 'https://api.magicthegathering.io/v1/cards?rarity=Common|Uncommon|Rare|Mythic Rare|Basic Land&name="';
  //   var functionArr = cardArr.map(function(eachCard) {
  //     return function(cb) {
  //       if (eachCard.indexOf('//') !== -1) {
  //         var cards = eachCard.split(' // ');
  //          request(apiUrl + cards[0] + '"', function(error, response, body) {
  //             if (error) {
  //               cb(error, null);
  //             } else {
  //               request(encodeURI(apiUrl + cards[1] + '"'), function(error, response, body2) {
  //                 if (error) {
  //                   cb(error, null);
  //                 } else {
  //                   cb(null, [JSON.parse(body), JSON.parse(body2)]);
  //                 }
  //               });
  //             }
  //           });
  //       } else {
          
  //         request(encodeURI(apiUrl + eachCard + '"'), function(error, response, body) {
  //           if (error) {
  //             cb(error, null);
  //           } else {
  //             cb(null, JSON.parse(body));
  //           }
  //         });
  //       }
  //     };
  //   });
    
  //   async.parallel(functionArr, function(err, results) {
  //     if (err) {
  //       callback(err, null);
  //     } else {
  //       var cardsObj = results.map(function(card) {
  //         var obj = {
  //           name: '',
  //           cmc: 0,
  //           colorIdentity: [],
  //           colors: [],
  //           types: [],
  //           rarity: ''
  //         };
  //         var colorLetter = ['W', 'U', 'B', 'R', 'G'];
  //         var colorNames = ['White', 'Blue', 'Black', 'Red', 'Green'];
  //         if (Array.isArray(card)) {
  //           obj.name = card[0].cards[0].name + ' // ' + card[1].cards[0].name;
  //           obj.cmc = card[0].cards[0].cmc + card[1].cards[0].cmc;
  //           obj.colorIdentity = card[0].cards[0].colorIdentity.concat(card[1].cards[0].colorIdentity);
  //           obj.colors = card[0].cards[0].colors.concat(card[1].cards[0].colors);
  //           if (obj.colors) {
  //             obj.colors = obj.colors.filter(utils.filterRepeats);
  //             obj.colors.forEach(function(eachColor, i) {
  //               obj.colors[i] = colorLetter[colorNames.indexOf(eachColor)];
  //             });
  //           }
            
  //           obj.types = card[0].cards[0].types;
  //           obj.rarity = card[0].cards[0].rarity;
  //         } else {
  //           obj.name = card.cards[0].name;
  //           if (card.cards[0].cmc)
  //             obj.cmc = card.cards[0].cmc;
  //           else
  //             obj.cmc = 0;
  //           obj.colorIdentity = card.cards[0].colorIdentity;
  //           obj.colors = card.cards[0].colors;
  //           if (obj.colors) {
  //             obj.colors.forEach(function(eachColor, i) {
  //               obj.colors[i] = colorLetter[colorNames.indexOf(eachColor)];
  //             });
  //           }
            
  //           obj.types = card.cards[0].types;
  //           obj.rarity = card.cards[0].rarity;
  //         }
  //         return obj;
  //       });
        
  //       dbSchema.Card.collection.insert(cardsObj, function(err, cardsUploaded) {
  //         if (err) {
  //           callback(err, null);
  //         } else {
  //           callback(null, cardsObj);
  //         }
  //       });
  //     }
  //   });
  // },
  
//   generateDraftId(username, draftDate, picks) {
//     var id = '';
//     id += utils.convertBase(username, process.env.USERNAME_BASE, process.env.ID_BASE);
//     id += utils.convertBase(Date.now()+'', process.env.TIME_BASE, process.env.ID_BASE);
//     id += utils.convertBase(draftDate+'', process.env.TIME_BASE, process.env.ID_BASE);
    
//     var pickLetters = '';
//     var picksToGet = [1,2,3,4,16,17,18,19,31,32,33,34];
//     picksToGet.forEach(function(pickNumber) {
//       pickLetters += String.fromCharCode(65 + picks[pickNumber]);
//     });
    
//     //console.log(pickLetters);
//     id += utils.convertBase(pickLetters, process.env.PICK_BASE, process.env.ID_BASE);
    
//     return id;
//   }
  
    // generateCrackId(picks) {
    //   const millSince2017 = 1483236000000;
      
    //   var id = '';
    //   id += utils.convertBase((Date.now() - millSince2017).toString(), process.env.TIME_BASE, process.env.ID_BASE);
    //   var pickNumbers = '';
    //   picks.forEach(function(pickNumber) {
    //     pickNumbers += pickNumber;
    //   });
    //   id += utils.convertBase(pickNumbers, process.env.PICK_BASE, process.env.ID_BASE);
      
    //   return id;
    // },
  
  
  uploadAllCards() {
    cardManip.uploadAllCards();
  },
  
  uploadAllSets() {
    formatManip.uploadAllSets();
  }
};

module.exports = dbManip;