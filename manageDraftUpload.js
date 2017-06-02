var dbManip = require('./database/databaseManipulation');
var validation = require('./server/validation');

function processDraft(rawData, fileName, isAnonymized, callback) {
  // split all the .txt by line break
  var data = rawData.split('\n');
  
  // get the date on the second line
  var draftDate = data[1].split(' ')[4];  
  
  // lines 4 through 11 have the 8 drafters
  var players = data.slice(3, 11);
  var player = '';
  var origPlayer = '';
  
  // lookup who is the player (has a ---> before the name)
  players.forEach(function(eachPlayer) {
    if (eachPlayer.charAt(0) === '-') {
      player = eachPlayer.split(' ')[1];
      origPlayer = player;
    }
  });
  
  if (isAnonymized) {
    player = 'Anonymous';
  }
  
  // split the filename to get the mtgo name for the draft format 
  fileName = fileName.split('-');
  var format = fileName[fileName.length-1].split('.')[0];
  
  // get ready to parse the rest of the files with the packs/picks
  var drafts = [];
  var draftsIndex = -1;
  var index = 10;
  
  
  var pickIndex = 0;  
  var packIndex = 0;  
  
  while (index < data.length) {
    // find next pick
    while (index < data.length && !data[index].startsWith('Pack ')) {
      index++;
    }
    
    // if there's nothing left, get out
    if (index === data.length) {
      break;
    }
    
    // if there's a new pick and we finished 3 packs, it's a new draft!
    if (data[index].startsWith('Pack 1 pick 1:')) {
      drafts.push({
        packs: [],
        picks: []
      });
      packIndex = 0;
      draftsIndex++;      
    }
    
    index++; // going to first card    
    drafts[draftsIndex].packs[packIndex] = []; // create pick array from the packIndex pack
    
    pickIndex = 0;
    while (data[index] !== '') { // go through all picks for one pack
      var filteredCardName;
      if (data[index].charAt(0) === '-') { // if it's the picked card, mark it
        drafts[draftsIndex].picks.push(pickIndex);
        filteredCardName = data[index].split(' ').slice(1).join(' ');
      } else {
        filteredCardName = data[index].split(' ').slice(4).join(' ');
      }
      if (filteredCardName.indexOf('/') !== -1) {
        filteredCardName = filteredCardName.replace('/', ' // ');
      }
      drafts[draftsIndex].packs[packIndex].push(filteredCardName);
      
      pickIndex++; // thats one pick done
      index++; // lets go to the next one
    }
    
    packIndex++; // finished a pack    
  }

  console.log('Player: '+player);
  console.log('Format: '+format);
    
  if (!validation.isUsername(player) ||
      !validation.isFormat(format)) {
    callback('Validation error', null);
    return;
  }
  
  var validDrafts = [];
  for (var i=0; i<drafts.length; i++) {
    if (validation.isDraftPicks(drafts[i].picks, 45) &&
        validation.isDraftPacks(drafts[i].packs)) {
      validDrafts.push(drafts[i]);            
    }
  }
  
  if (validDrafts.length === 0) {
    callback('Validation error', null);
  } else {
    console.log(origPlayer + ' uploaded ' + validDrafts.length + ' drafts of ' + format);  
    dbManip.uploadDrafts(player, draftDate, format, validDrafts, callback);
  }  
}

module.exports = processDraft;