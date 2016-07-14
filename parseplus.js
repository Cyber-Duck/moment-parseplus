(function (root, factory) {
	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['exports', 'moment'], function (exports, moment) {
			factory((root.commonJsStrictGlobal = exports), moment);
		});
	} else if (typeof exports === 'object' && typeof exports.nodeName !== 'string') {
		// CommonJS
		factory(exports, require('moment'));
	} else {
		// Browser globals
		factory((root.commonJsStrictGlobal = {}), root.moment);
	}
}(this, function (exports, moment) {

	moment.createFromInputFallback = function(config) {
		var date = attemptToParse(config._i);
		if (date instanceof Date) {
			config._d = date;
		}
		else {
			config._isValid = false;
		}
	};

	(function(locale) {
		moment.locale = function(names, object) {
			if (arguments.length === 0) {
				return locale.call(moment);
			}
			var currName = locale.call(moment);
			var result = locale.call(moment, names, object);
			var newName = locale.call(moment);
			if (currName != newName) {
				updateMatchers();
			}
			return result;
		};
	})(moment.locale);

	var attemptToParse = function(input) {
		var match;
		var parser;
		var i = 0;
		var ms;
		var obj;
		while ((parser = parsers[i++])) {
			if (!(match = input.match(parser.matcher))) {
				continue;
			}
			if (parser.handler) {
				obj = parser.handler(match, input);
				if (obj) {
					return obj;
				}
			}
			else if (parser.replacer) {
				ms = Date.parse(input.replace(parser.matcher, parser.replacer));
				if (!isNaN(ms)) {
					return new Date(ms);
				}
			}
		}
	};

	var zeroPad = function(number, places) {

	};

	var compile = function(code) {
		code = code.replace(/_([A-Z][A-Z0-9]+)_/g, function($0, $1) {
			return regexes[$1];
		});
		var matcher = new RegExp(code, 'i');
		matcher.rawSource = code;
		return matcher;
	};

	var updateMatchers = function() {
		regexes.MONTHNAME = moment.months().join('|') + '|' + moment.monthsShort().join('|');
		regexes.DAYNAME = moment.weekdays().join('|') + '|' + moment.weekdaysShort().join('|');
		// regexes.AMPM = somehow get meridiemParse...
		parsers.forEach(function(parser) {
			if (parser.matcher.rawSource) {
				parser.matcher = compile(parser.matcher.rawSource);
			}
		});
	};

	var regexes = {
		YEAR: "[1-9]\\d{3}",
		MONTH: "1[0-2]|0?[1-9]",
		MONTH2: "1[0-2]|0[1-9]",
		MONTHNAME: "jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september|oct|october|nov|november|dec|december",
		DAYNAME: "mon|monday|tue|tuesday|wed|wednesday|thu|thursday|fri|friday|sat|saturday|sun|sunday",
		DAY: "3[01]|[12]\\d|0?[1-9]",
		DAY2: "3[01]|[12]\\d|0[1-9]",
		TIMEZONE: "[+-][01]\\d\\:?[0-5]\\d",
		H24: "[01]\\d|2[0-3]",
		H12: "0?[1-9]|1[012]",
		AMPM: "am|pm",
		MIN: "[0-5]\\d",
		SEC: "[0-5]\\d",
		MS: "\\d{3,}",
		UNIT: "year|month|week|day|hour|minute|second|millisecond"
	};

	var parsers = [];

	var smartParse = {
		addParser: function (spec) {
			parsers.push(spec);
			return this;
		},
		removeParser: function (name) {
			parsers.some(function(parser, i) {
				if (parser.name == name) {
					parsers.splice(i, 1);
					return true;
				}
			});
			return this;
		},
		clearParsers: function () {
			parsers = [];
			return this;
		}
	};
	smartParse
		// 24 hour time
		.addParser({
			name: '24h',
			matcher: compile("^(?:(.+?)(?: |T))?(_H24_)\\:(_MIN_)(?:\\:(_SEC_)(?:\\.(_MS_))?)? ?(?:GMT)?(_TIMEZONE_)?(?: \\([A-Z]+\\))?$"),
			handler: function(match) {
				var d;
				if (match[1]) {
					d = Date.create(match[1]);
					if (isNaN(d)) {
						return false;
					}
				} else {
					d = Date.current();
					d.setMilliseconds(0);
				}
				d.setHours(parseFloat(match[2]), parseFloat(match[3]), parseFloat(match[4] || 0));
				if (match[5]) {
					d.setMilliseconds(+String(match[5]).slice(0,3));
				}
				if (match[6]) {
					d.setUTCOffsetString(match[6]);
				}
				return d;
			}
		})
		// 12-hour time
		.addParser({
			name: '12h',
			matcher: compile("^(?:(.+) )?(_H12_)(?:\\:(_MIN_)(?:\\:(_SEC_))?)? ?(_AMPM_)$"),
			handler: function (match) {
				var d;
				if (match[1]) {
					d = Date.create(match[1]);
					if (isNaN(d)) {
						return false;
					}
				} else {
					d = Date.current();
					d.setMilliseconds(0);
				}
				var hour = parseFloat(match[2]);
				hour = match[5].toLowerCase() == 'am' ? (hour == 12 ? 0 : hour) : (hour == 12 ? 12 : hour + 12);
				d.setHours(hour, parseFloat(match[3] || 0), parseFloat(match[4] || 0));
				return d;
			}
		})
		// date such as "3-15-2010"
		.addParser({
			name: 'US',
			matcher: compile("^(_MONTH_)([\\/-])(_DAY_)\\2(_YEAR_)$"),
			replacer: '$1/$3/$4',
		})
		// date such as "15.03.2010"
		.addParser({
			name: 'World',
			matcher: compile("^(_DAY_)([\\/\\.])(_MONTH_)\\2(_YEAR_)$"),
			replacer: '$3/$1/$4',
		})
		// date such as "15-Mar-2010", "8 Dec 2011", "Thu, 8 Dec 2011"
		.addParser({
			name: 'RFC-1123',
			matcher: compile("^(?:(?:_DAYNAME_),? )?(_DAY_)([ -])(_MONTHNAME_)\\2(_YEAR_)$"),
			replacer: '$3 $1, $4',
		})
		// date such as "March 4, 2012", "Mar 4 2012", "Sun Mar 4 2012"
		.addParser({
			name: 'Conversational',
			matcher: compile("^(?:(?:_DAYNAME_),? )?(_MONTHNAME_) (_DAY_),? (_YEAR_)$"),
			replacer: '$1 $2, $3',
		})
		// date such as "Tue Jun 22 17:47:27 +0000 2010"
		.addParser({
			name: 'Dangling-Year',
			matcher: compile("^(?:_DAYNAME_) (_MONTHNAME_) (_DAY_) ((?:_H24_)\\:(?:_MIN_)(?:\\:_SEC_)?) (_TIMEZONE_) (_YEAR_)$"),
			handler: function(m) {
				var month = zeroPad( Date.getMonthByName(m[1]), 2 );
				var day = zeroPad( m[2], 2 );
				var date = Date.create(m[5] + '-' + month + '-' + day + 'T' + m[3] + m[4]);
				if (isNaN(date)) {
					return false;
				}
				return date;
			}
		})
	;

	exports.smartParse = smartParse;

}));
//
// // RFC-2616
// //
//
// Date.create.patterns = [
//
// 	// 24-hour time (This will help catch Date objects that are casted to a string)
// 	[
// 		'24_hour',
// 		Date.create.makePattern("^(?:(.+?)(?: |T))?(_H24_)\\:(_MIN_)(?:\\:(_SEC_)(?:\\.(_MS_))?)? ?(?:GMT)?(_TIMEZONE_)?(?: \\([A-Z]+\\))?$"),
// 		function(match) {
// 			var d;
// 			if (match[1]) {
// 				d = Date.create(match[1]);
// 				if (isNaN(d)) {
// 					return false;
// 				}
// 			} else {
// 				d = Date.current();
// 				d.setMilliseconds(0);
// 			}
// 			d.setHours(parseFloat(match[2]), parseFloat(match[3]), parseFloat(match[4] || 0));
// 			if (match[5]) {
// 				d.setMilliseconds(+String(match[5]).slice(0,3));
// 			}
// 			if (match[6]) {
// 				d.setUTCOffsetString(match[6]);
// 			}
// 			return d;
// 		}
// 	],
//
// 	// 12-hour time
// 	[
// 		'12_hour',
// 		Date.create.makePattern("^(?:(.+) )?(_H12_)(?:\\:(_MIN_)(?:\\:(_SEC_))?)? ?(_AMPM_)$"),
// 		function(match) {
// 			var d;
// 			if (match[1]) {
// 				d = Date.create(match[1]);
// 				if (isNaN(d)) {
// 					return false;
// 				}
// 			} else {
// 				d = Date.current();
// 				d.setMilliseconds(0);
// 			}
// 			var hour = parseFloat(match[2]);
// 			hour = match[5].toLowerCase() == 'am' ? (hour == 12 ? 0 : hour) : (hour == 12 ? 12 : hour + 12);
// 			d.setHours(hour, parseFloat(match[3] || 0), parseFloat(match[4] || 0));
// 			return d;
// 		}
// 	],
//
// 	// 2 weeks after today, 3 months after 3-5-2008
// 	[
// 		'weeks_months_before_after',
// 		Date.create.makePattern("^(\\d+) (_UNIT_)s? (before|from|after) (.+)$"),
// 		function(match) {
// 			var fromDate = Date.create(match[4]);
// 			if (fromDate instanceof Date) {
// 				return fromDate.add((match[3].toLowerCase() == 'before' ? -1 : 1) * match[1], match[2]);
// 			}
// 			return false;
// 		}
// 	],
//
// 	// 5 months ago
// 	[
// 		'time_ago',
// 		Date.create.makePattern("^(\\d+) (_UNIT_)s? ago$"),
// 		function(match) {
// 			return Date.current().add(-1 * match[1], match[2]);
// 		}
// 	],
//
// 	// in 2 hours/weeks/etc.
// 	[
// 		'in_time',
// 		Date.create.makePattern("^in (\\d) (_UNIT_)s?$"),
// 		function(match) {
// 			return Date.current().add(match[1], match[2]);
// 		}
// 	],
//
// 	// "+2 hours", "-3 years"
// 	[
// 		'plus_minus',
// 		Date.create.makePattern("^([+-]) ?(\\d+) (_UNIT_)s?$"), function(match) {
// 		var mult = match[1] == '-' ? -1 : 1;
// 		return Date.current().add(mult * match[2], match[3]);
// 	}
// 	],
//
// 	// "/Date(1296824894000)/", "/Date(1296824894000-0700)/"
// 	[
// 		'asp_json',
// 		/^\/Date\((\d+)([+-]\d{4})?\)\/$/i,
// 		function(match) {
// 			var d = new Date;
// 			d.setTime(match[1]);
// 			if (match[2]) {
// 				d.setUTCOffsetString(match[2]);
// 			}
// 			return d;
// 		}
// 	],
//
// 	// today, tomorrow, yesterday
// 	[
// 		'today_tomorrow',
// 		/^(today|now|tomorrow|yesterday)/i,
// 		function(match) {
// 			var now = Date.current();
// 			switch (match[1].toLowerCase()) {
// 				case 'today':
// 				case 'now':
// 					return now;
// 				case 'tomorrow':
// 					return now.add(1, 'day');
// 				case 'yesterday':
// 					return now.add(-1, 'day');
// 			}
// 		}
// 	],
//
// 	// this/next/last january, next thurs
// 	[
// 		'this_next_last',
// 		Date.create.makePattern("^(this|next|last) (?:(_UNIT_)s?|(_MONTHNAME_)|(_DAYNAME_))$"),
// 		function(match) {
// 			// $1 = this/next/last
// 			var multiplier = match[1].toLowerCase() == 'last' ? -1 : 1;
// 			var now = Date.current();
// 			var i;
// 			var diff;
// 			var month;
// 			var weekday;
// 			// $2 = interval name
// 			if (match[2]) {
// 				return now.add(multiplier, match[2]);
// 			}
// 			// $3 = month name
// 			else if (match[3]) {
// 				month = Date.getMonthByName(match[3]) - 1;
// 				diff = 12 - (now.getMonth() - month);
// 				diff = diff > 12 ? diff - 12 : diff;
// 				return now.add(multiplier * diff, 'month');
// 			}
// 			// $4 = weekday name
// 			else if (match[4]) {
// 				weekday = Date.getWeekdayByName(match[4]);
// 				diff = now.getDay() - weekday + 7;
// 				return now.add(multiplier * (diff == 0 ? 7 : diff), 'day');
// 			}
// 			return false;
// 		}
// 	],
//
// 	// January 4th, July the 4th
// 	[
// 		'conversational_sans_year',
// 		Date.create.makePattern("^(_MONTHNAME_) (?:the )?(\\d+)(?:st|nd|rd|th)?$"),
// 		function(match) {
// 			var d = Date.current();
// 			if (match[1]) {
// 				d.setMonth( Date.getMonthByName(match[1]) - 1 );
// 			}
// 			d.setDate(match[2]);
// 			return d;
// 		}
// 	]
// ];
