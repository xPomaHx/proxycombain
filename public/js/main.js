var app;
$(function() {
    var socket = io("ws://192.168.1.35:3333", {
        'transports': ['websocket']
    });
    app = new Vue({
        el: '#app',
        data: {
            proxies: [],
            inproxies: "",
            isDisabled: false,
        },
        methods: {
            onSubmit: function() {
                this.isDisabled = true;
                socket.emit('addProxies', this.inproxies, (data) => {
                    this.inproxies = null;
                    this.isDisabled = false;
                    console.dir(data);
                });
            },
            shuffle: function() {
                this.proxies = _.shuffle(this.proxies)
            },
            dateFormat: function(date) {
                return moment(date).format('MM/DD/YYYY hh:mm')
            },
            proxiesSort: function() {
                this.proxies.sort(function(x, y) {
                    if (moment(x.date).format("X") > moment(y.date).format("X")) {
                        return -1;
                    } else {
                        return 1;
                    }
                });
            }
        },
        created: function() {
            $.ajax("/proxy/getall").then((data) => {
                if (data) {
                    this.proxies = data;
                    this.proxiesSort();
                }
                socket.on("updateProxy", (proxies) => {
                    proxies.forEach((proxyIn) => {
                        var exist = this.proxies.some((proxy, index) => {
                            if (proxyIn._id === proxy._id) {
                                this.$set(this.proxies, index, proxyIn);
                                return true;
                            } else {
                                return false;
                            }
                        });
                        if (!exist) {
                            this.proxies.push(proxyIn);
                        }
                    });
                    this.proxiesSort();
                });
            });
        },
    });
});