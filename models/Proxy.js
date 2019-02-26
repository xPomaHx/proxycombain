var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var proxySchema = new Schema({
    ipport: {
        type: String,
        unique: true,
        required: true,
        index: false,
    },
    ip: String,
    port: Number,
    protocol: String,
    supportsHttps: Boolean,
    pickabu: Boolean,
    lock: {
        type: Boolean,
        default: false,
    },
    good: {
        type: Number,
        default: 0
    },
    bad: {
        type: Number,
        default: 0
    },
    anonymityLevel: Number,
    isGoodInLastTest: Boolean,
    dateAdd: {
        type: Date,
        default: Date.now
    },
    dateGood: Date,
    dateTest: Date,
});
proxySchema.index({ ipport: -1 });
module.exports = mongoose.model('Proxy', proxySchema);