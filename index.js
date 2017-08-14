var net = require("net");
var fs = require("fs");
var Promise = require("bluebird");
var ps = require('ps-node');

var $ = exports;

var handlers = {}, default_shutdown_time = 120, shutdown_start, shutdown_time, shutdown_timer_id, log_interval, last_log;

$.on = function (key, fn) {
	handlers[key] = fn;
};

$.shutdown = function (_shutdown_time) {
	var _shutdown_fn = handlers.shutdown;

	shutdown_time = default_shutdown_time;
	shutdown_start = new Date();

	if (_shutdown_time >= 5) {
		shutdown_time = _shutdown_time;
	}

	shutdown_time *= 1000;

	log_interval = shutdown_time / 4;

	if (log_interval > 20) {
		log_interval = 20;
	}
	else if (log_interval < 5) {
		log_interval = 5;
	}

	log_interval *= 1000;
	last_log = null;

	$.time_remaining = shutdown_time - (new Date() - shutdown_start);

	if (!shutdown_timer_id) {
		shutdown_timer_id = setInterval(function () {
			if ((new Date() - shutdown_start) >= shutdown_time) {
				console.log("Process exiting now.");
				process.exit(0);
			}
			else {
				showLog();
			}

			$.time_remaining = shutdown_time - (new Date() - shutdown_start);
		}, 500);
	}
	else {
		console.log("Existing shutdown command already in progress. Timer will be updated.");
	}

	showLog();

	function showLog() {
		if (!last_log || ((new Date() - last_log) >= log_interval)) {
			last_log = new Date();

			console.log("Time remaining to exit the process: " + (shutdown_time - (new Date() - shutdown_start)) + "ms");
		}
	}

	if ($.shutting_down) {
		return Promise.resolve();
	}

	$.shutting_down = true;

	return typeof(_shutdown_fn) == "function" && _shutdown_fn();
};

$.configure  = function(options) {
	if (!options) {
		throw new Error("Missing required parameter 'options'");
	}

	if (!options.port) {
		throw new Error("Missing required parameter 'options.port'");
	}

	if (!options.pid_file) {
		throw new Error("Missing required parameter 'options.pid_file'");
	}

	options = options || {};

	var portPath = options.port, pid_file = options.pid_file;

	default_shutdown_time = options && options.grace_period || 120;

	var previous_pid = fs.existsSync(pid_file) && parseInt(fs.readFileSync(pid_file));

	// console.log("previous_pid", previous_pid);
	// console.log("process.pid", process.pid);

	return Promise.resolve()
		.then(function () {
			if (previous_pid) {
				return new Promise(function (resolve, reject) {
					ps.lookup({ pid: previous_pid }, function(err, resultList ) {
						if (err) {
							if (err.message.indexOf("No such process found") >= 0) {
								resolve();
							}
							else {
								reject(new Error( err ));
							}
						}
						else {
							var process = resultList[ 0 ];

							if( process ){
								console.log( 'PID: %s, COMMAND: %s, ARGUMENTS: %s', process.pid, process.command, process.arguments );

								console.log("Process with pid " + previous_pid + " is still running! Exiting!");

								reject(new Error("Process with pid " + previous_pid + " is still running! Exiting!"));
							}
							else {
								resolve();
							}
						}
					});
				})
			}
		})
		.then(function () {
			fs.existsSync(portPath)  && fs.unlinkSync(portPath);
			fs.writeFileSync(pid_file, process.pid);

			var command_server = net.createServer(function(socket) {
				socket.on("end", function() {
					console.log("client disconnected");
				});

				socket.on("data", function(request) {
					request = new Buffer(request).toString().trim().split(" ");

					if (console.is_debug_enabled) console.logDebug("request: " + request);
					console.log("request: " + request);

					processRequest(socket, request[0], request.slice(1))
				});

				function processRequest(socket, request, params) {
					var p = Promise.resolve();

					var response = {success: true, code: 0};

					var fn = handlers[request];

					p.then(function () {
						if (request == "shutdown") {
							console.log("Shutting down!!!");

							return $.shutdown(params[0]);
						}
						else if (request == "exit") {
							return {success: true};
						}
						else if (typeof(fn) == "function") {
							return fn();
						}
						else {
							throw new Error("Unknown request '" + request + "'");
						}
					})
					.catch(function (err) {
						console.log("---------------------");
						console.log(err.stack || err);

						response.success = false;
						response.code = 999;
						response.text = err.message || err;
					})
					.then(function (ret) {
						socket.write(JSON.stringify(response) + "\n");

						if (request == "exit") {
							socket.end();
						}
					});

					return p;
				}
			});

			command_server.listen(portPath, function() {
				console.log(" server listening on " + portPath);
			});
		});
};

