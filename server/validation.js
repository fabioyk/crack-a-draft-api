module.exports = {
  hexCharacters: '0123456789abcdef',
  alphanumeric: '0123456789QWERTYUIOPASDFGHJKLZXCVBNMqwertyuiopasdfghjklzxcvbnm',
  username: '0123456789QWERTYUIOPASDFGHJKLZXCVBNMqwertyuiopasdfghjklzxcvbnm -_',
  format: 'QWERTYUIOPASDFGHJKLZXCVBNM0123456789',
  cardAdditionals: '/ ",éáúâ\'-',
  
  isHex(stringCheck, isFixedLength, expectedLength) {
    if (isFixedLength && stringCheck.length !== expectedLength) {
      return false;
    }
    
    return this.checkCharacters(stringCheck, this.hexCharacters);
  },
  isNumericString(stringCheck) {
    if (isNaN(stringCheck)) {
      return false;
    }
    var num = +stringCheck;
    if (num < 0 || num !== parseInt(stringCheck, 10)) {
      return false;
    }
    return true;
  },
  
  isUsername(stringCheck) {
    if (typeof stringCheck !== 'string') {
      return false;
    }
    if (stringCheck.length < 3 || stringCheck.length > 20) {
      return false;
    }
    return this.checkCharacters(stringCheck, this.username);
  },
  
  isDraftId(stringCheck) {
    if (typeof stringCheck !== 'string') {
      return false;
    }
    return this.isHex(stringCheck, true, 24);
  },
  
  isDraftPicks(arrayCheck, expectedLength) {
    if (!Array.isArray(arrayCheck)) {
      return false;
    }
    if (arrayCheck.length !== expectedLength) {
      return false;
    }
    for (var i=0; i<arrayCheck.length; i++) {
      if (typeof arrayCheck[i] !== 'number') {
        return false;
      }
      if (arrayCheck[i] < 0 || arrayCheck[i] > 14) {
        return false;
      }
    }
    return true;
  },
  
  isDraftPacks(packArray) {
    if (!Array.isArray(packArray)) {
      return false;
    }
    if (packArray.length !== 45) {
      return false;
    }
    for (var i=0; i<packArray.length; i++) {
      if (!Array.isArray(packArray[i])) {
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
      return false;
    }
    var letters = 'WUBRG';
    if (stringCheck.length < 1 || stringCheck.length > 5) {
      return false;
    }
    var letterIndex = 0;
    for (var i=0; i<stringCheck.length; i++) {
      if (letters.indexOf(stringCheck.charAt(i)) === -1) {
        return false;
      } else {
        var i = letters.indexOf(stringCheck.charAt(i));
        if (i < letterIndex) {
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
      return false;
    }
    var format = stringCheck;
    if (stringCheck.indexOf(',') !== -1) {
      format = stringCheck.split(',')[0];
      var numDrafts = stringCheck.split(',')[1];
      if (!this.isNumericString(numDrafts)) {
        return false;
      }
    }
    if (format === 'random') {
      return true;
    }
    if (format.length !== 9) {
      return false;
    }
    return this.checkCharacters(format, this.format);
  },
  
  isPageInfo(numCheck) {
    if (typeof numCheck !== 'number') {
      return false;
    }
    if (numCheck < 0 || numCheck > 100) {
      return false;    
    }
    return true;
  },
  
  isBoolean(boolCheck) {
    if (typeof boolCheck !== 'boolean') {
      return false;
    }
    return true;
  },
  
  isCardName(stringCheck) {
    if (typeof stringCheck !== 'string') {
      return false;
    }
    return this.checkCharacters(stringCheck, this.alphanumeric + this.cardAdditionals);
  },
  
  isCardArray(arrayCheck) {
    if (!Array.isArray(arrayCheck)) {
      return false;
    }
    if (arrayCheck.length > 50) {      
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
        return false;
      }
    }
    return true;
  }
};