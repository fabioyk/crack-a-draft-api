var validation = {
  hexCharacters: '0123456789abcdef',
  alphanumeric: '0123456789QWERTYUIOPASDFGHJKLZXCVBNMqwertyuiopasdfghjklzxcvbnm',
  username: '0123456789QWERTYUIOPASDFGHJKLZXCVBNMqwertyuiopasdfghjklzxcvbnm -_',
  format: 'QWERTYUIOPASDFGHJKLZXCVBNM0123456789',
  cardAdditionals: '/ ",éáúâ\'-',
  
  isHex(stringCheck, isFixedLength, expectedLength) {
    if (isFixedLength && stringCheck.length !== expectedLength) {
      console.log('VALIDATION ERROR:',stringCheck,'Not hex');
      return false;
    }
    
    return this.checkCharacters(stringCheck, this.hexCharacters);
  },
  isNumericString(stringCheck) {
    if (isNaN(stringCheck)) {
      console.log('VALIDATION ERROR:',stringCheck,'Not a number');
      return false;
    }
    var num = +stringCheck;
    if (num < 0 || num !== parseInt(stringCheck, 10)) {
      console.log('VALIDATION ERROR:',stringCheck,'Not a number');
      return false;
    }
    return true;
  },
  
  isUsername(stringCheck) {
    if (typeof stringCheck !== 'string') {
      console.log('VALIDATION ERROR:',stringCheck,'Not a string');
      return false;
    }
    if (stringCheck.length < 3 || stringCheck.length > 20) {
      console.log('VALIDATION ERROR:',stringCheck,'Outside bounds 3/20');
      return false;
    }
    return this.checkCharacters(stringCheck, this.username);
  },

  isDraftIdArray(arrayCheck) {
    if (!Array.isArray(arrayCheck)) {
      console.log('VALIDATION ERROR: Draft Id Array Not an array');
      return false;
    }
    if (arrayCheck.length <= 0 || arrayCheck.length > 20) {
      console.log('VALIDATION ERROR: Draft Id Array Wrong Size',arrayCheck.length);
      return false;
    }
    arrayCheck.forEach(function(draftId) {
      if (!validation.isDraftId(draftId)) {
        return false;
      }
    });
    return true;
  },
  
  isDraftId(stringCheck) {
    if (typeof stringCheck !== 'string') {
      console.log('VALIDATION ERROR:',stringCheck,'Not a string');
      return false;
    }
    return this.isHex(stringCheck, true, 24);
  },
  
  isDraftPicks(arrayCheck, expectedLength) {
    if (!Array.isArray(arrayCheck)) {
      console.log('VALIDATION ERROR: Picks Not an array');
      return false;
    }
    if (arrayCheck.length !== expectedLength) {
      console.log('VALIDATION ERROR: Unexpected length.',arrayCheck.length,expectedLength);
      console.log(arrayCheck);
      return false;
    }
    for (var i=0; i<arrayCheck.length; i++) {
      if (typeof arrayCheck[i] !== 'number') {
        console.log('VALIDATION ERROR: Not a number',arrayCheck[i]);
        return false;
      }
      if (arrayCheck[i] < 0 || arrayCheck[i] > 14) {
        console.log('VALIDATION ERROR: Not between 0 and 14', arrayCheck[i]);
        return false;
      }
    }
    return true;
  },
  
  isDraftPacks(packArray) {
    if (!Array.isArray(packArray)) {
      console.log('VALIDATION ERROR: Pack Not an array');
      return false;
    }
    if (packArray.length !== 45) {
      console.log('VALIDATION ERROR: Not 45 cards long');
      return false;
    }
    for (var i=0; i<packArray.length; i++) {
      if (!Array.isArray(packArray[i])) {
        console.log('VALIDATION ERROR: packArray not an array');
        return false;
      }
      if (!this.isCardArray(packArray[i])) {
        return false;
      }
    }
    return true;
  },
  
  isArchetype(stringCheck) {
    if (typeof stringCheck !== 'string') {
      console.log('VALIDATION ERROR:',stringCheck,'Not a string');
      return false;
    }
    var letters = 'WUBRG';
    if (stringCheck.length < 1 || stringCheck.length > 5) {
      console.log('VALIDATION ERROR:',stringCheck,'outside 5 characters length');
      return false;
    }
    var letterIndex = 0;
    for (var i=0; i<stringCheck.length; i++) {
      if (letters.indexOf(stringCheck.charAt(i)) === -1) {
        console.log('VALIDATION ERROR:',stringCheck,'not using wubrg letters');
        return false;
      } else {
        var i = letters.indexOf(stringCheck.charAt(i));
        if (i < letterIndex) {
          console.log('VALIDATION ERROR:',stringCheck,'Out of order');
          return false;
        } else if (i > letterIndex) {
          letterIndex = i;
        }
      }
    }
    return true;
  },
  
  isFormat(stringCheck) {
    if (typeof stringCheck !== 'string') {
      console.log('VALIDATION ERROR: ',stringCheck,'Format Not a string');
      return false;
    }
    var format = stringCheck;
    if (stringCheck.indexOf(',') !== -1) {
      format = stringCheck.split(',')[0];
      var numDrafts = stringCheck.split(',')[1];
      if (!this.isNumericString(numDrafts)) {
        console.log('VALIDATION ERROR:',numDrafts,'Not a numeric string');
        return false;
      }
    }
    if (format === 'random') {      
      return true;
    }
    if (format.length !== 9) {
      console.log('VALIDATION ERROR:',format,'outside 9 characters');
      return false;
    }
    return this.checkCharacters(format, this.format);
  },
  
  isPageInfo(numCheck) {
    if (typeof numCheck !== 'number') {
      console.log('VALIDATION ERROR:',numCheck,'Not a number');
      return false;
    }
    if (numCheck < 0 || numCheck > 100) {
      console.log('VALIDATION ERROR:',numCheck,'Page outside bounds');
      return false;    
    }
    return true;
  },
  
  isBoolean(boolCheck) {
    if (typeof boolCheck !== 'boolean') {
      console.log('VALIDATION ERROR:',boolCheck,'Not a boolean');
      return false;
    }
    return true;
  },
  
  isCardName(stringCheck) {
    if (typeof stringCheck !== 'string') {
      console.log('VALIDATION ERROR:',stringCheck,'Not a string');
      return false;
    }
    return this.checkCharacters(stringCheck, this.alphanumeric + this.cardAdditionals);
  },
  
  isCardArray(arrayCheck) {
    if (!Array.isArray(arrayCheck)) {
      console.log('VALIDATION ERROR: CardArray Not an array');
      return false;
    }
    if (arrayCheck.length > 200) {  
      console.log('VALIDATION ERROR: Card array too big');    
      return false;
    }
    for (var i=0; i<arrayCheck.length; i++) {
      if (!this.isCardName(arrayCheck[i])) {
        return false;
      }
    }
    return true;
  },
  
  checkCharacters(stringCheck, alphabet) {
    for (var i=0; i<stringCheck.length; i++) {
      if (alphabet.indexOf(stringCheck.charAt(i)) === -1) {
        console.log('VALIDATION ERROR: '+stringCheck+' Not from alphabet '+alphabet);
        return false;
      }
    }
    return true;
  }
};

module.exports = validation;