var dbSchema = require('./db-schema');
var utils = require('./utils');

var formatManip = {
  /// Returns all formats with at least one draft uploaded
  getAllFormats(errCallback, okCallback) {
    dbSchema.Format.find({drafts: {$gt: 0}}, function(err, formats) {
      var formattedFormats = [];
      if (!err) {        
        formats.forEach(function(format) {
          formattedFormats.push({
            name: format.name,
            mtgoName: format.mtgoName,
            drafts: format.drafts
          });
        });
      }
      utils.checkErrNotFound(err, formattedFormats, errCallback, okCallback);
    });
  },

  /// Insert a format with a certain name and mtgo name
  insertFormat(formatName, mtgoName, number, errCallback, okCallback) {
    var formatObj = {
      name: formatName,
      mtgoName: mtgoName,
      drafts: number
    };

    dbSchema.Format.create(formatObj, function(err, res) {
      utils.checkErr(err, res, errCallback, okCallback);
    })
  },

  /// Get a format with either the Name or MtgoName specified
  getFormat(name, isMtgoName, errCallback, okCallback) {
    var searchObj = {};
    if (isMtgoName) {
      searchObj.mtgoName = name;
    } else {
      searchObj.name = name;
    }
    
    dbSchema.Format.findOne(searchObj, function(err, formatFound) {
      utils.checkErrNotFound(err, formatFound, errCallback, okCallback);
    });
  },

  getTheseFormats(nameArray, errCallback, okCallback) {
    var query = [];
    nameArray.forEach(function(format) {
      query.push({mtgoName: format});
    });
    dbSchema.Format.find({$or: query}, function(err, formats) {
      utils.checkErrNotFound(err, formatFound, errCallback, okCallback);
    });
  },
  
  /// Increment the number of drafts done to a format
  incrementFormat(mtgoName, number, errCallback, okCallback) {
    dbSchema.Format.findOneAndUpdate(
      {mtgoName: mtgoName}, {$inc: {drafts: number}}, function (err, res) {
        utils.checkErr(err, res, errCallback, okCallback);
      })
    
  },

  uploadAllSets() {
    var sets = {'HOUHOUAKH': 'Hour of Devastation',
                'AKHAKHAKH': 'Amonkhet',
                'MM3MM3MM3': 'Modern Masters 2017',
                'AERAERKLD': 'Aether Revolt',
                'KLDKLDKLD': 'Kaladesh',
                'EMAEMAEMA': 'Eternal Masters',
                'EMNEMNSOI': 'Eldritch Moon',
                'SOISOISOI': 'Shadows over Innistrad',
                'OGWOGWBFZ': 'Oath of the Gatewatch',
                'BFZBFZBFZ': 'Battle for Zendikar',
                'ORIORIORI': 'Magic Origins',
                'MM2MM2MM2': 'Modern Masters 2015',
                'DTKDTKFRF': 'Dragons of Tarkir',
                'FRFKTKKTK': 'Fate Reforged',
                'KTKKTKKTK': 'Khans of Tarkir',
                'M15M15M15': 'Magic 2015',
                'VMAVMAVMA': 'Vintage Masters',
                'JOUBNGTHS': 'Journey into Nyx',
                'BNGTHSTHS': 'Born of the Gods',
                'THSTHSTHS': 'Theros',
                'M14M14M14': 'Magic 2014',
                'MMAMMAMMA': 'Modern Masters',
                'DGMGTCRTR': 'Dragon\'s Maze',
                'GTCGTCGTC': 'Gatecrash',
                'RTRRTRRTR': 'Return to Ravnica',
                'M13M13M13': 'Magic 2013',
                'AVRAVRAVR': 'Avacyn Restored',
                'DKAISDISD': 'Dark Ascension',
                'ISDISDISD': 'Innistrad',
                'M12M12M12': 'Magic 2012',
                'NPHMBSSOM': 'New Phyrexia',
                'MBSSOMSOM': 'Mirrodin Besieged',
                'SOMSOMSOM': 'Scars of Mirrodin',
                'M11M11M11': 'Magic 2011',
                'ROEROEROE': 'Rise of the Eldrazi',
                'ZENZENWWK': 'Worldwake',
                'ZENZENZEN': 'Zendikar',
                'M10M10M10': 'Magic 2010',
                'ALACONARB': 'Alara Reborn',
                'ALAALACON': 'Conflux',
                'ALAALAALA': 'Shards of Alara',
                'SHMSHMEVE': 'Eventide',
                'SHMSHMSHM': 'Shadowmoor',
                'LRWLRWMOR': 'Morningtide',
                'LRWLRWLRW': 'Lorwyn',
                '10E10E10E': 'Tenth Edition',
                'TSPPLCFUT': 'Future Sight',
                'TSPTSPPLC': 'Planar Chaos',
                'TSPTSPTSP': 'Time Spiral',
                'CSPCSPCSP': 'Coldsnap',
                'RAVGPTDIS': 'Dissension',
                'RAVRAVGPT': 'Guildpact',
                'RAVRAVRAV': 'Ravnica: City of Guilds',
                '9ED9ED9ED': 'Ninth Edition',
                'CHKBOKSOK': 'Saviors of Kamigawa',
                'CHKCHKBOK': 'Betrayers of Kamigawa',
                'CHKCHKCHK': 'Champions of Kamigawa',
                'MRDDST5DN': 'Fifth Dawn',
                'MRDMRDDST': 'Darksteel',
                'MRDMRDMRD': 'Mirrodin',
                '8ED8ED8ED': 'Eighth Edition',
                'ONSLGNSCG': 'Scourge',
                'ONSONSLGN': 'Legions',
                'ONSONSONS': 'Onslaught',
                'ODYTORJUD': 'Judgment',
                'ODYODYTOR': 'Torment',
                'ODYODYODY': 'Odyssey',
                '7ED7ED7ED': 'Seventh Edition',
                'INVPLSAPC': 'Apocalypse',
                'INVINVPLS': 'Planeshift',
                'INVINVINV': 'Invasion',
                'MMQNMSPCY': 'Prophecy',
                'MMQMMQNMS': 'Nemesis',
                'MMQMMQMMQ': 'Mercadian Masques',
                '6ED6ED6ED': 'Sixth Edition',
                'USGUSLUSD': 'Urza\'s Destiny',
                'USGUSGUSL': 'Urza\'s Legacy',
                'USGUSGUSG': 'Urza\'s Saga',
                'TMPSTHEXO': 'Exodus',
                'TMPTMPSTH': 'Stronghold',
                'TMPTMPTMP': 'Tempest',
                '5ED5ED5ED': 'Fifth Edition',
                'MIRVISWTH': 'Weatherlight',
                'MIRMIRVIS': 'Visions',
                'MIRMIRMIR': 'Mirage',
                'ME4ME4ME4': 'Masters Edition IV',
                'ME3ME3ME3': 'Masters Edition III',
                'ME2ME2ME2': 'Masters Edition II',
                'MEDMEDMED': 'Masters Edition',
                'C00C00C00': 'MTGO Legacy Cube',
                'C04C04C04': 'MTGO Cube',
                'C03C03C03': 'MTGO Vintage Cube',
                'C11C11C11': 'MTGO Twisted Color Pie Cube' };
    var formatsObj = [];
    Object.keys(sets).forEach(function(setName) {
      formatsObj.push({
        name: sets[setName],
        mtgoName: setName,
        drafts: 0
      });
    });
    
    dbSchema.Format.collection.insert(formatsObj, function(err, res) {
      if (err) {
        console.log('Error when inserting all formats');
        console.log(err);
      } else {
        console.log('Done!');
      }
    });
  }
}

module.exports = formatManip;