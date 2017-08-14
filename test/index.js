var shutdown = require("../index");

shutdown.configure({
	port: "MyApp.sock",
	pid_file: "MyApp.pid",
});

var timer_id = setInterval(function () {
	console.log(shutdown.shutting_down);
}, 3000);

shutdown.on("shutdown", function (params) {
	console.log("It is shutting down!!!");
});
