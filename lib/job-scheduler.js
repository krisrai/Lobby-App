var schedule = require('node-schedule');
var print = require('../print');


var scheduledJobs = {};

// schedule daily job at the given day, hour, minute
// day is a day of week, 0 is Sunday, 6 is Saturday
exports.scheduleJob = function(job, day, hour, minute, work) {
	var rule = new schedule.RecurrenceRule();
	if (day !== null) {
		rule.dayOfWeek;
	}
	if (hour !== null) {
		rule.hour = hour;
	}
	if (minute !== null) {
		rule.minute = minute;
	}

	print._('Scheduling '+job+' at day '+day+', '+hour+':'+minute);
	var j = schedule.scheduleJob(rule, function() {
	    print._(job+' is fired -----');
	    work(job);
	});
	scheduledJobs[job] = j;

}

// cancel the scheduled job
exports.cancelJob = function(job) {
	var j = scheduledJobs[job];
	if (j) {
		print._('Cancelling '+job);
		j.cancel();
	}
}