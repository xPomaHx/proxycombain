var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var pageSchema = new Schema({
    url: {
        type: String,
        unique: true,
        required: true,
        index: false,
    },
    proxyNumber: Number,
    dateGrab: {
        type: Date,
        default: Date.now
    },
});
pageSchema.index({ url: -1 });
module.exports = mongoose.model('Page', pageSchema);