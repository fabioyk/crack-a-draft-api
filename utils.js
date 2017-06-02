var utils = {
  
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
    console.log(val)
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
  
  formatDate(stringDate) {
    
  },

  treatResult(res, err, obj) {
    if (err) {
      console.log(err);
      res.json({error:err});
    } else {
      res.json(obj);
    }
  },

  treatResultArr(res, err, obj) {
    if (err) {
      console.log(err);
      res.json([{error:err}]);
    } else {
      res.json(obj);
    }
  },

  validationError(res) {
    res.json({error: 'Validation error'});
  }
}

module.exports = utils;