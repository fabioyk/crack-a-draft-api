module.exports = {
  checkErrNotFound(err, obj, errCallback, okCallback) {
    if (err || !obj) {
        if (err) {
          console.log(err);
        }
        errCallback(err || 'Not found');
      } else {        
        okCallback(obj);
      }
  },
  
  checkErr(err, obj, errCallback, okCallback) {
    if (err) {
      console.log(err);
      errCallback(err);      
    } else {
      okCallback(obj);
    }
  },

  filterRepeats(item, index, arr) {
    return arr.indexOf(item) === index;
  },

  createOkCallback(callback) {
    return function(result) {
      callback(null, result);
    }
  }
}