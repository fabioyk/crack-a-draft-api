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
  },

  convertBase(src,srctable,desttable) {
    var srclen=srctable.length;
    var destlen=desttable.length;
    var val=0;
    var numlen=src.length;
    for(var i=0;i<numlen;i++) {
      var ind = srctable.indexOf(src.charAt(i));
      if (ind === -1){
        ind = 0;}
      val=val*srclen+ind;
    }
    
    if(val<0) {
      return 0;
    }
    var r=val%destlen;
    var res=desttable.charAt(r);
    var q=Math.floor(val/destlen);
    while(q) {
      r=q%destlen;
      q=Math.floor(q/destlen);
      res=desttable.charAt(r)+ res;
    }
    return res;
  },
}