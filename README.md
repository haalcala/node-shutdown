# Description

A library to safely shutdown your NodeJS app


# Usage

	var shutdown = require("node-shutdown")({
	    port: "MyApp.sock",
	    pid_file: "MyApp.pid"
	    grace_period: 10 // In seconds. default is 120 (2 minutes)
	});

    shutdown.on("shutdown", MyShutdownFunc); // NOTE: This is not an event emitter kind. calling this multiple times will cause the previous value to be overwritten.  In short, there can only be one, and it supports promise

    function MyShutdownFunc(params) {
        http.close(); // stop accepting HTTP requests

        // or you're using express
        app.use(function(req, res, next) {
            if (shutdown.shutting_down) {
                res.send(503); // tell load balancer to forward the request to another node
            }
            else {
                next();
            }
        });

        // stop accepting more incoming requests

        var timer_id = setInterval(function() {
            if (shutdown.shutting_down) {
                if (tasks.length == 0) {
                    clearInterval(timer_id); // stop processing more background task or wait for all to finish
                }
                else {
                    if (shutdown.time_remaining < 10) { // if you need more time
                        shutdown.shutdown(10); // extend the timer for 10 more seconds
                    }
                }
            }
        }, 1000);
    }

## in your terminal

	// shutdown in 120 seconds (default)
	$ echo shutdown | nc -U MyApp.sock

	// shutdown in 10 seconds
	$ echo shutdown 10 | nc -U MyApp.sock

	// the shutdown command can be called repeatedly and it will reset the timer to the new one mentioned

# Use case

Safely shutdown your app by stop accepting incoming requests.

# Precaution

It is recommended to not close database connections so that pending tasks should be able to complete accordingly