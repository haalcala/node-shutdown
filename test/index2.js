var shutdown = require("../index");

var timer_id = setInterval(function () {
	console.log("another module:: ", shutdown.shutting_down);
}, 3000);
