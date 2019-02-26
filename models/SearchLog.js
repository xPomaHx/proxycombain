var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var searchLogSchema = new Schema({
    date: {
        type: Date,
        default: Date.now
    },
});
module.exports = mongoose.model('SearchLog', searchLogSchema);