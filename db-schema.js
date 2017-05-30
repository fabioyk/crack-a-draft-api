var mongoose = require('mongoose');

var schemas = {   
  draftSchema: new mongoose.Schema({
    drafter: { type: String, index: true },
    submitDate: { type: Date, index: true },
    format: String,
    packs: [[String]],
    picks: [Number],
    cracks: [{
      id: String,
      date: Date,
      picks: [Number],
      archetype: String
    }]
  }),  
  formatSchema: new mongoose.Schema({
    name: String,
    mtgoName: String,
    drafts: Number
  }),
  cardSchema: new mongoose.Schema({
    name: { type: String, index: true },
    cmc: Number,
    colorIdentity: [String],
    colors: [String],
    types: [String]
  }),
  
  
  Draft: null,
  Format: null,
  Card: null,
  
  init() {
    this.Draft = mongoose.model('Draft', this.draftSchema);
    this.Format = mongoose.model('Format', this.formatSchema);
    this.Card = mongoose.model('Card', this.cardSchema);
  }
};

module.exports = schemas;