var dbSchema = require('./db-schema');
var utils = require('./utils');
var request = require('request');

var cardManip = {
  checkMissingCards(draftsObj, errCallback, okCallback) {
    var cards = [];
    draftsObj.forEach(function(eachDraft) {
      eachDraft.packs.forEach(function(eachPack, index) {
        cards.push(eachPack[eachDraft.picks[index]]);
      });
    })
    
    var filteredCards = cards.filter(utils.filterRepeats);
    cardManip.getCardsFromList(filteredCards, errCallback, okCallback);
  },

  createCardsArr(draftObj, errCallback, okCallback) {
    var cards = draftObj.draft.packs.map(function(eachPack, index) {
      return eachPack[draftObj.draft.picks[index]];
    });
    var filteredCards = cards.filter(utils.filterRepeats);
    cardManip.getCardsFromList(cards, errCallback, function(arr) {
      draftObj.cards = arr;
      okCallback(draftObj);
    });
  },

  getCardsFromList(cardArr, errCallback, okCallback) {
    var cardArr = cardArr.filter(utils.filterRepeats);
    var query = cardArr.map(function(eachCardName) {
      return {name: eachCardName};
    });
    dbSchema.Card.find({$or: query}, function(err, cards) {
      utils.checkErr(err, cards, errCallback, function(cards) { 
        var result = [];
        var missing = [];
        cardArr.forEach(function(eachCard) {
          var checked = false;
          for (var i = 0; i < cards.length; i++) {
            if (cards[i].name === eachCard) {
              result.push(cards[i]);
              checked = true;
              break;
            }
          }
          if (!checked) {
            missing.push(eachCard);
          }
        });
        if (result.length !== cardArr.length) {
          console.log('A Card was missed!');
          console.log(missing);
          errCallback('Card data missing');
        } else {
          okCallback(result);
        }
      });
    });
    
  },

  uploadAllCards(jsonFileUrl) {
    var apiUrl = jsonFileUrl;
    
    var colorLetter = ['W', 'U', 'B', 'R', 'G'];
    var colorNames = ['White', 'Blue', 'Black', 'Red', 'Green'];
    
    request(encodeURI(apiUrl), function(error, response, body) {
      if (error) {
        console.log('Error on request');
        console.log(error);
        return;
      } else {
        var allCards = JSON.parse(body).cards;
                
        var ourCards = [];
        
        allCards.forEach(function(card) {
          var cardObj = {};
          if (card.layout !== 'split' && card.layout !== 'aftermath' && 
              !((card.layout === 'double-faced' || card.layout === 'flip') && card.name !== card.names[0])) {
            cardObj.name = card.name;
            cardObj.cmc = card.cmc;
            cardObj.colorIdentity = card.colorIdentity;
            cardObj.types = card.types;
            cardObj.colors = card.colors;
            if (cardObj.colors) {
              cardObj.colors.forEach(function(eachColor, i) {
                cardObj.colors[i] = colorLetter[colorNames.indexOf(eachColor)];
              })
            }
          } else if (card.layout === 'split' || card.layout === 'aftermath') {
            if (card.name === card.names[0]) {
              cardObj.name = card.names.join(' // ');
              cardObj.cmc = 0;
              cardObj.colorIdentity = [];
              cardObj.types = [];
              cardObj.colors = [];
              
              card.names.forEach(function(eachName) {
                var otherCard;
                allCards.forEach(function(otherPartCard) {
                  if (otherPartCard.name === eachName) {
                    otherCard = otherPartCard;
                  }
                });
                if (otherCard) {
                  cardObj.cmc += otherCard.cmc;
                  cardObj.types = cardObj.types.concat(otherCard.types);
                  cardObj.colors = cardObj.colors.concat(otherCard.colors);
                  cardObj.colorIdentity = cardObj.colorIdentity.concat(otherCard.colorIdentity);
                }
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
  }
};

module.exports = cardManip;