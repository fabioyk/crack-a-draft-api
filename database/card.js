var dbSchema = require('./db-schema');
var utils = require('./utils');

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
    var query = cardArr.map(function(eachCardName) {
      return {name: eachCardName};
    });
    dbSchema.Card.find({$or: query}, function(err, cards) {
      utils.checkErr(err, cards, errCallback, function(cards) {        
        if (cardArr.length != cards.length) {
          var cardsGot = cards.map(function(eachCard) {
            return eachCard.name;
          });
          var missingCards = [];
          cardArr.forEach(function(eachCard) {
            if (cardsGot.indexOf(eachCard) === -1) {
              missingCards.push(eachCard);
            }
          });
          
          console.log('A Card was missed!');
          console.log(missingCards);
          errCallback('Card data missing');
        } else {
          okCallback(cards);
        }
      });
    });
    
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
  }
};

module.exports = cardManip;