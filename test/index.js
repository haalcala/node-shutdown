var shutdown = require("../index");

require("./index2");

shutdown.configure({
	port: "MyApp.sock",
	pid_file: "MyApp.pid",
});

var timer_id = setInterval(function () {
	console.log(shutdown.shutting_down);
}, 3000);

shutdown.on("shutdown", function (params) {
	console.log("It is shutting down!!!", shutdown.time_remaining);

	setTimeout(function () {
		console.log("shutdown.time_remaining", shutdown.time_remaining);
		shutdown.shutdown(10);
		console.log("shutdown.time_remaining", shutdown.time_remaining);
	}, 5000)
});

setTimeout(function () {
	shutdown.shutdown(10);
}, 5000);