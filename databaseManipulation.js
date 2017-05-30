var dbSchema = require('./db-schema');
var mongo = require('mongodb');
var mongoose = require('mongoose');
var formatManipulation = require('./formatManipulation');
var async = require('async');
var request = require('request');
var utils = require('./utils');

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
    var numDrafts = draftData.length;
    var draftsObj = [];
    //var draftIds = [];
    
    draftData.forEach(function(singleDraftData) {
      //draftIds.push(dbManip.generateDraftId(username, draftDate, singleDraftData.picks));
      draftsObj.push({
        //id: draftIds[draftIds.length-1],
        drafter: username,
        submitDate: Date.now(),
        format: format,
        packs: singleDraftData.packs,
        picks: singleDraftData.picks,
        cracks: []
      });
    });
    
    dbSchema.Draft.collection.insert(draftsObj, function(err, drafts) {
      if (err) {
        callback(err);
      } else {
        var altIds = drafts.insertedIds;
        
        var cards = [];
        draftsObj.forEach(function(eachDraft) {
          eachDraft.packs.forEach(function(eachPack, index) {
            cards.push(eachPack[eachDraft.picks[index]]);
          });
        })
        
        var filteredCards = cards.filter(utils.filterRepeats);
        dbManip.getCardsFromList(filteredCards, function(err, dbCards) {
          if (err) {
            console.log(err);
          }
        });
        
        dbManip.getFormat(format, true, function(formatErr, formatObj) {
          if (formatErr === 'Not found') {
            dbManip.insertFormat(formatManipulation.getNameFromMtgo(format), format, draftsObj.length, function(insertFormatErr, insertedFormat) {
              dbManip.checkErr(insertFormatErr, altIds, callback);
            });
          } else {
            if (formatErr) {
              callback(formatErr, null);
            }
            dbManip.incrementFormat(format, draftsObj.length, function(incrementErr, incrementedFormat) {
              dbManip.checkErr(incrementErr, altIds, callback);
            });            
          }
        });        
      }
    });
  },
  
  getDraft(draftId, isCardInfoEmbed, callback) {
    dbSchema.Draft.findById(draftId, function(err, draftFound) {
      if (!isCardInfoEmbed) {
        dbManip.processAndReturnDraft(err, draftFound, callback);
      } else {
        dbManip.processAndReturnDraft(err, draftFound, function(err, draft) {
          if (err) {
            callback(err, null);
          } else {
            dbManip.createCardsArr(draft, function(err, cardSet) {
              if (err) {
                callback(err, null);
              } else {
                draft.cards = cardSet;
                callback(null, draft);
              }
            });
          }
          
        });
      }
      
    });
  },
  
  getRandomDraftByFormat(format, randomSize, callback) {
    var random = Math.floor(Math.random() * randomSize);
    var queryObj = {};
    if (format !== 'random') {
      queryObj.format = format;
    }
    dbSchema.Draft.findOne(queryObj).skip(random).exec(function(err, draftFound) {
      dbManip.processAndReturnDraft(err, draftFound, callback);
    });
  },
  
  processAndReturnDraft(err, draftFound, callback) {
    if (!err && draftFound) {
      dbManip.getFormat(draftFound.format, true, function(err, formatName) {
        if (formatName) {
          var draftData = {
            draft: draftFound,
            format: {
              name: formatName.name,
              mtgoName: formatName.mtgoName
            }
          }; 
        }                   
        dbManip.checkErr(err, draftData, callback);
      })
    } else {
      callback('Error', null);        
    }
  },
  
  getDrafts(query, pageSize, pageNumber, sortObj, callback) {
    dbSchema.Draft.find(query)
      .sort(sortObj)
      .skip(pageSize * pageNumber)
      .limit(pageSize)
      .exec(function(err, drafts) {
        if (err) {
          callback(err, null);          
        } else {
          var formats = [];
          drafts.forEach(function(draft) {
            if (formats.indexOf(draft.format) === -1) {
              formats.push(draft.format);
            }
          });
          var query = [];
          formats.forEach(function(format) {
            query.push({mtgoName: format});
          });
          dbSchema.Format.find({$or: query}, function(err, formats) {
            if (err) {
              callback(err, null);
            } else {
              var draftDataArr = [];
              drafts.forEach(function(draft) {
                var formatName = draft.format;
                formats.forEach(function(formatObj) {
                  if (formatObj.mtgoName === draft.format) {
                    formatName = formatObj.name;
                  }
                });
                draftDataArr.push({
                  draft: draft,
                  format: {
                    name: formatName,
                    mtgoName: draft.format
                  }
                })
              });
              callback(null, draftDataArr);
            }            
          });
        }
        // dbManip.checkErrNotFound(err, drafts, callback);
    });
  },
  
  getDraftsCount(query, callback) {
    dbSchema.Draft.count(query, function(err, count) {
      dbManip.checkErr(err, count, callback);
    });
  },
  
  //// ----------------------- CRACK MANIPULATION ----------------------- ////
  
  uploadCrack(draftId, picks, archetype, callback) {
    var crackId = dbManip.generateCrackId(picks);
    
    console.log('Crack Id:',crackId);
    
    var crackObj = {
      id: crackId,
      date: Date.now(),
      picks: picks,
      archetype: archetype
    };
    
    dbSchema.Draft.findByIdAndUpdate(draftId, { $push: { cracks: crackObj }}, function(err, crackUploaded) {
      dbManip.checkErr(err, crackId, callback);
    });
  },
  
  //// ----------------------- FORMAT MANIPULATION ----------------------- ////
  
  getAllFormats(callback) {
    dbSchema.Format.find({drafts: {$gt: 0}}, function(err, formats) {
      var formattedFormats = [];
      if (!err) {        
        formats.forEach(function(format) {
          formattedFormats.push({
            name: format.name,
            mtgoName: format.mtgoName,
            drafts: format.drafts
          });
        });
      }
      dbManip.checkErrNotFound(err, formattedFormats, callback);
    });
  },
  
  insertFormat(formatName, mtgoName, number, callback) {
    var formatObj = {
      name: formatName,
      mtgoName: mtgoName,
      drafts: number
    };
    console.log('Trying to create',formatName,mtgoName);
    dbSchema.Format.create(formatObj, function(err, res) {
      dbManip.checkErr(err, res, callback);
    })
  },
  
  getFormat(name, isMtgoName, callback) {
    var searchObj = {};
    if (isMtgoName) {
      searchObj.mtgoName = name;
    } else {
      searchObj.name = name;
    }
    
    dbSchema.Format.findOne(searchObj, function(err, formatFound) {
      dbManip.checkErrNotFound(err, formatFound, callback);
    });
  },
  
  incrementFormat(formatName, number, callback) {    
    dbSchema.Format.findOneAndUpdate(
      {mtgoName: formatName}, {$inc: {drafts: number}}, function (err, res) {
        dbManip.checkErr(err, res, callback);
      })
    
  },
  
  checkErrNotFound(err, obj, callback) {
    if (err || !obj) {
        if (err) {
          console.log(err);
        }
        callback(err || 'Not found', null);
      } else {        
        callback(null, obj);
      }
  },
  
  checkErr(err, obj, callback) {
    if (err) {
      console.log(err);
      callback(err, null);      
    } else {
      callback(null, obj);
    }
  },
  
  
  uploadDraftCards(draftId, callback) {
    dbManip.getDraft(draftId, false, function(err, draft) {
      if (err) {
        callback(err, null);
      } else {
        var cards = [];
        draft.draft.packs.forEach(function(eachPack, index) {
          cards.push(eachPack[draft.draft.picks[index]]);
        });
        var filteredCards = cards.filter(utils.filterRepeats);
        dbManip.getCardsFromList(filteredCards, function(err, dbCards) {
          if (err) {
            callback(err, null);
          } else {
            callback(null, dbCards);
          }
        });
      }
    });
  },
  
  createCardsArr(draftObj, callback) {
    var cards = [];
    draftObj.draft.packs.forEach(function(eachPack, index) {
      cards.push(eachPack[draftObj.draft.picks[index]]);
    });
    dbManip.getCardsFromList(cards, function(err, arr) {
      if (err) {
        callback(err, null);
      } else {
        callback(null, arr);
      }
    });
  },
  
  getCardsFromList(cardArr, callback) {
    var query = cardArr.map(function(eachCardName) {
      return {name: eachCardName};
    });    
    dbSchema.Card.find({$or: query}, function(err, cards) {
      if (err) {        
        callback(err, null);        
      } else {
        var filteredCards = cardArr.filter(utils.filterRepeats);
        if (filteredCards.length != cards.length) {
          var cardsGot = cards.map(function(eachCard) {
            return eachCard.name;
          });
          var missingCards = [];
          filteredCards.forEach(function(eachCard) {
            if (cardsGot.indexOf(eachCard) === -1) {
              missingCards.push(eachCard);
            }
          });
          
          if (missingCards.length > 0) {
            console.log('A Card was missed!');
            console.log(missingCards);
            callback('Card data missing', null);
          } else {
            callback(null, cards);
          }
          
          /*dbManip.uploadCardsFromList(missingCards, function(err, cardsUploaded) {
            if (err) {
              callback(err, null);
            } else {
              callback(null, cards.concat(cardsUploaded));
            }
          });*/
        } else {
          callback(null, cards);
        }
      }
    });
    
  },
  
  uploadCardsFromList(cardArr, callback) {
    var apiUrl = 'https://api.magicthegathering.io/v1/cards?rarity=Common|Uncommon|Rare|Mythic Rare|Basic Land&name="';
    var functionArr = cardArr.map(function(eachCard) {
      return function(cb) {
        if (eachCard.indexOf('//') !== -1) {
          var cards = eachCard.split(' // ');
           request(apiUrl + cards[0] + '"', function(error, response, body) {
              if (error) {
                cb(error, null);
              } else {
                request(encodeURI(apiUrl + cards[1] + '"'), function(error, response, body2) {
                  if (error) {
                    cb(error, null);
                  } else {
                    cb(null, [JSON.parse(body), JSON.parse(body2)]);
                  }
                });
              }
            });
        } else {
          
          request(encodeURI(apiUrl + eachCard + '"'), function(error, response, body) {
            if (error) {
              cb(error, null);
            } else {
              cb(null, JSON.parse(body));
            }
          });
        }
      };
    });
    
    async.parallel(functionArr, function(err, results) {
      if (err) {
        callback(err, null);
      } else {
        var cardsObj = results.map(function(card) {
          var obj = {
            name: '',
            cmc: 0,
            colorIdentity: [],
            colors: [],
            types: [],
            rarity: ''
          };
          var colorLetter = ['W', 'U', 'B', 'R', 'G'];
          var colorNames = ['White', 'Blue', 'Black', 'Red', 'Green'];
          if (Array.isArray(card)) {
            obj.name = card[0].cards[0].name + ' // ' + card[1].cards[0].name;
            obj.cmc = card[0].cards[0].cmc + card[1].cards[0].cmc;
            obj.colorIdentity = card[0].cards[0].colorIdentity.concat(card[1].cards[0].colorIdentity);
            obj.colors = card[0].cards[0].colors.concat(card[1].cards[0].colors);
            if (obj.colors) {
              obj.colors = obj.colors.filter(utils.filterRepeats);
              obj.colors.forEach(function(eachColor, i) {
                obj.colors[i] = colorLetter[colorNames.indexOf(eachColor)];
              });
            }
            
            obj.types = card[0].cards[0].types;
            obj.rarity = card[0].cards[0].rarity;
          } else {
            obj.name = card.cards[0].name;
            if (card.cards[0].cmc)
              obj.cmc = card.cards[0].cmc;
            else
              obj.cmc = 0;
            obj.colorIdentity = card.cards[0].colorIdentity;
            obj.colors = card.cards[0].colors;
            if (obj.colors) {
              obj.colors.forEach(function(eachColor, i) {
                obj.colors[i] = colorLetter[colorNames.indexOf(eachColor)];
              });
            }
            
            obj.types = card.cards[0].types;
            obj.rarity = card.cards[0].rarity;
          }
          return obj;
        });
        
        dbSchema.Card.collection.insert(cardsObj, function(err, cardsUploaded) {
          if (err) {
            callback(err, null);
          } else {
            callback(null, cardsObj);
          }
        });
      }
    });
  },
  
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
  
    generateCrackId(picks) {
      const millSince2017 = 1483236000000;
      
      var id = '';
      id += utils.convertBase((Date.now() - millSince2017).toString(), process.env.TIME_BASE, process.env.ID_BASE);
      var pickNumbers = '';
      picks.forEach(function(pickNumber) {
        pickNumbers += pickNumber;
      });
      id += utils.convertBase(pickNumbers, process.env.PICK_BASE, process.env.ID_BASE);
      
      return id;
    },
  
  
  uploadAllCards() {
    var apiUrl = 'https://mtgjson.com/json/AllCards.json';
    
    var colorLetter = ['W', 'U', 'B', 'R', 'G'];
    var colorNames = ['White', 'Blue', 'Black', 'Red', 'Green'];
    
    request(encodeURI(apiUrl), function(error, response, body) {
      if (error) {
        console.log('Error on request');
        console.log(error);
        return;
      } else {
        var allCards = JSON.parse(body);
        
        var allCardNames = Object.keys(allCards);
        
        var ourCards = [];
        
        allCardNames.forEach(function(cardName) {
          var thisCard = allCards[cardName];
          var cardObj = {};
          if (thisCard.layout !== 'split' && thisCard.layout !== 'aftermath' && 
              !((thisCard.layout === 'double-faced' || thisCard.layout === 'flip') && cardName !== thisCard.names[0])) {
            cardObj.name = cardName;
            cardObj.cmc = thisCard.cmc;
            cardObj.colorIdentity = thisCard.colorIdentity;
            cardObj.types = thisCard.types;
            cardObj.colors = thisCard.colors;
            if (cardObj.colors) {
              cardObj.colors.forEach(function(eachColor, i) {
                cardObj.colors[i] = colorLetter[colorNames.indexOf(eachColor)];
              })
            }
          } else if (thisCard.layout === 'split' || thisCard.layout === 'aftermath') {
            if (cardName === thisCard.names[0]) {
              cardObj.name = thisCard.names.join(' // ');
              cardObj.cmc = 0;
              cardObj.colorIdentity = [];
              cardObj.types = [];
              cardObj.colors = [];
              
              thisCard.names.forEach(function(eachName) {
                cardObj.cmc += allCards[eachName].cmc;
                cardObj.types = cardObj.types.concat(allCards[eachName].types);
                cardObj.colors = cardObj.colors.concat(allCards[eachName].colors);
                cardObj.colorIdentity = cardObj.colorIdentity.concat(allCards[eachName].colorIdentity);
              });
              if (cardObj.colors.length > 0) {
                cardObj.colors.forEach(function(eachColor, i) {
                  cardObj.colors[i] = colorLetter[colorNames.indexOf(eachColor)];
                })
              }
              cardObj.colors = cardObj.colors.filter(utils.filterRepeats);
              cardObj.types = cardObj.types.filter(utils.filterRepeats);
              cardObj.colorIdentity = cardObj.colorIdentity.filter(utils.filterRepeats);

            }
          }
          
          ourCards.push(cardObj);
        });
        console.log(ourCards.length,'cards');
        dbSchema.Card.collection.insert(ourCards, function(err, cardsUploaded) {
          if (err) {
            console.log('Error on insert');
            console.log(err);
          } else {
            console.log('Success!');
          }
        });
      }
    });
  },
  
  uploadAllSets() {
    var sets = {'HOUHOUAKH': 'Hour of Devastation',
                'AKHAKHAKH': 'Amonkhet',
                'MM3MM3MM3': 'Modern Masters 2017',
                'AERAERKLD': 'Aether Revolt',
                'KLDKLDKLD': 'Kaladesh',
                'EMAEMAEMA': 'Eternal Masters',
                'EMNEMNSOI': 'Eldritch Moon',
                'SOISOISOI': 'Shadows over Innistrad',
                'OGWOGWBFZ': 'Oath of the Gatewatch',
                'BFZBFZBFZ': 'Battle for Zendikar',
                'ORIORIORI': 'Magic Origins',
                'MM2MM2MM2': 'Modern Masters 2015',
                'DTKDTKFRF': 'Dragons of Tarkir',
                'FRFKTKKTK': 'Fate Reforged',
                'KTKKTKKTK': 'Khans of Tarkir',
                'M15M15M15': 'Magic 2015',
                'VMAVMAVMA': 'Vintage Masters',
                'JOUBNGTHS': 'Journey into Nyx',
                'BNGTHSTHS': 'Born of the Gods',
                'THSTHSTHS': 'Theros',
                'M14M14M14': 'Magic 2014',
                'MMAMMAMMA': 'Modern Masters',
                'DGMGTCRTR': 'Dragon\'s Maze',
                'GTCGTCGTC': 'Gatecrash',
                'RTRRTRRTR': 'Return to Ravnica',
                'M13M13M13': 'Magic 2013',
                'AVRAVRAVR': 'Avacyn Restored',
                'DKAISDISD': 'Dark Ascension',
                'ISDISDISD': 'Innistrad',
                'M12M12M12': 'Magic 2012',
                'NPHMBSSOM': 'New Phyrexia',
                'MBSSOMSOM': 'Mirrodin Besieged',
                'SOMSOMSOM': 'Scars of Mirrodin',
                'M11M11M11': 'Magic 2011',
                'ROEROEROE': 'Rise of the Eldrazi',
                'ZENZENWWK': 'Worldwake',
                'ZENZENZEN': 'Zendikar',
                'M10M10M10': 'Magic 2010',
                'ALACONARB': 'Alara Reborn',
                'ALAALACON': 'Conflux',
                'ALAALAALA': 'Shards of Alara',
                'SHMSHMEVE': 'Eventide',
                'SHMSHMSHM': 'Shadowmoor',
                'LRWLRWMOR': 'Morningtide',
                'LRWLRWLRW': 'Lorwyn',
                '10E10E10E': 'Tenth Edition',
                'TSPPLCFUT': 'Future Sight',
                'TSPTSPPLC': 'Planar Chaos',
                'TSPTSPTSP': 'Time Spiral',
                'CSPCSPCSP': 'Coldsnap',
                'RAVGPTDIS': 'Dissension',
                'RAVRAVGPT': 'Guildpact',
                'RAVRAVRAV': 'Ravnica: City of Guilds',
                '9ED9ED9ED': 'Ninth Edition',
                'CHKBOKSOK': 'Saviors of Kamigawa',
                'CHKCHKBOK': 'Betrayers of Kamigawa',
                'CHKCHKCHK': 'Champions of Kamigawa',
                'MRDDST5DN': 'Fifth Dawn',
                'MRDMRDDST': 'Darksteel',
                'MRDMRDMRD': 'Mirrodin',
                '8ED8ED8ED': 'Eighth Edition',
                'ONSLGNSCG': 'Scourge',
                'ONSONSLGN': 'Legions',
                'ONSONSONS': 'Onslaught',
                'ODYTORJUD': 'Judgment',
                'ODYODYTOR': 'Torment',
                'ODYODYODY': 'Odyssey',
                '7ED7ED7ED': 'Seventh Edition',
                'INVPLSAPC': 'Apocalypse',
                'INVINVPLS': 'Planeshift',
                'INVINVINV': 'Invasion',
                'MMQNMSPCY': 'Prophecy',
                'MMQMMQNMS': 'Nemesis',
                'MMQMMQMMQ': 'Mercadian Masques',
                '6ED6ED6ED': 'Sixth Edition',
                'USGUSLUSD': 'Urza\'s Destiny',
                'USGUSGUSL': 'Urza\'s Legacy',
                'USGUSGUSG': 'Urza\'s Saga',
                'TMPSTHEXO': 'Exodus',
                'TMPTMPSTH': 'Stronghold',
                'TMPTMPTMP': 'Tempest',
                '5ED5ED5ED': 'Fifth Edition',
                'MIRVISWTH': 'Weatherlight',
                'MIRMIRVIS': 'Visions',
                'MIRMIRMIR': 'Mirage',
                'ME4ME4ME4': 'Masters Edition IV',
                'ME3ME3ME3': 'Masters Edition III',
                'ME2ME2ME2': 'Masters Edition II',
                'MEDMEDMED': 'Masters Edition',
                'C00C00C00': 'MTGO Legacy Cube',
                'C04C04C04': 'MTGO Cube',
                'C03C03C03': 'MTGO Vintage Cube',
                'C11C11C11': 'MTGO Twisted Color Pie Cube' };
    var formatsObj = [];
    Object.keys(sets).forEach(function(setName) {
      formatsObj.push({
        name: sets[setName],
        mtgoName: setName,
        drafts: 0
      });
    });
    
    dbSchema.Format.collection.insert(formatsObj, function(err, res) {
      if (err) {
        console.log('Error when inserting all formats');
        console.log(err);
      } else {
        console.log('Done!');
      }
    })
  }
};

module.exports = dbManip;