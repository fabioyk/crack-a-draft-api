var utils = {
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