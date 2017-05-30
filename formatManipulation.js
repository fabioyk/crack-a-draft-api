module.exports = {
  getNameFromMtgo(mtgoName) {
    if(mtgoName.length === 9) {
      var s1 = mtgoName.substr(0,3);
      var s2 = mtgoName.substr(3,3);
      var s3 = mtgoName.substr(6,3);
      
      var s1Count = 1;
      var s2Count = 0;
      var s3Count = 0;
      if (s2 === s1) {
        s1Count++;
        if (s3 === s1) {
          s1Count++;
        } else {
          s3Count++;
        }
      } else {
        s2Count++;
        if (s3 === s2) {
          s2Count++;
        } else {
          s3Count++;
        }
      }
      
      var formatName = '';
      
      if (s1Count === s2Count && s2Count === s3Count) {
        formatName = s1 + ' ' + s2 + ' ' + s3;
      } else {
        formatName = s1Count + 'x ' + s1;
        if (s2Count > 0) {
          formatName += ' ' + s2Count + 'x ' + s2;
        }
        if (s3Count > 0) {
          formatName += ' ' + s3Count + 'x ' + s3;
        }
      }
      
      return formatName;
    } else {
      // todo format name != 9?
      return mtgoName;
    }
  }
};