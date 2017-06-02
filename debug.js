var dbManip = require('./database/databaseManipulation');
var draftManip = require('./database/draft');
var formatManip = require('./database/format');

dbManip.init();

setTimeout(function() {
  if (process.argv[2] === 'deleteDrafts') {
    if (process.argv[3]) {
      return;
    }
    draftManip.deleteDraft({}, function(err) {
      console.log('Error!');
      console.log(err);
    }, function(ok) {
      console.log('Deleted successfully');
    });
  }
  if (process.argv[2] === 'deleteOneDraft') {
    draftManip.deleteDraft({'_id': process.argv[3]}, function(err) {
      console.log('Error!');
      console.log(err);
    }, function(ok) {
      console.log('Deleted successfully');
    });
  }
  if (process.argv[2] === 'editFormat') {
    if (process.argv[3] && process.argv[4]) {
      formatManip.editFormat(process.argv[3], process.argv[4], function(err, ok) {
        if (err) {
          console.log('Error!');
          console.log(err);          
        } else {
          console.log('Edited successfully');
        }
      });
    }
  }
  if (process.argv[2] === 'uploadSet') {
    if (process.argv[3]) {
      dbManip.uploadAllSets(process.argv[3]);
    } else {
      dbManip.uploadAllSets(null);
    }
  }
  if (process.argv[2] === 'uploadAllSets') {
    dbManip.uploadAllSets();
  }

}, 1000);