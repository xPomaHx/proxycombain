var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var proxySchema = new Schema({
    ipport: {
        type: String,
        unique: true
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
    good: [{
        date: Date
    }],
    bad: [{
        date: Date
    }],
    anonymityLevel: Number,
    date: Date,
});
proxySchema.pre('save', function(next) {
    if (!this.isNew) return next();
    var ipport = this.ipport.split(":");
    this.port = ipport[1];
    this.ip = ipport[0];
    return next();
});
module.exports = mongoose.model('Proxy', proxySchema);