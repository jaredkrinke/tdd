// Dates
(function () {
    var padNumber = function (number, digits) {
        return new String(new Array(digits + 1).join('0') + number).slice(-digits);
    }

    var formatDate = function (date) {
        // Note: Using local time
        return [padNumber(date.getFullYear(), 4), padNumber(date.getMonth() + 1, 2), padNumber(date.getDate(), 2)].join('-');
    };

    QUnit.assert.dateEqual = function (actual, expected, message) {
        var equal = true;
        var getters = ['getDate', 'getMonth', 'getFullYear'];
        for (var i = 0, count = getters.length; i < count && equal; i++) {
            var getter = getters[i];
            equal = (equal && actual[getter]() === expected[getter]());
        }
        QUnit.push(equal, formatDate(actual), formatDate(expected), message);
    };
})();

(function () {
    // Comparison
    var millisecondsPerDay = 1000 * 60 * 60 * 24;
    var truncateTime = function (date) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    };

    Date.compareDates = function (a, b) {
        // Note: This is rounding rather than truncating the quotient in an attempt to ignore leap seconds
        return Math.round((truncateTime(a).getTime() - truncateTime(b).getTime()) / millisecondsPerDay);
    };

    // Creation
    Date.create = function (year, month, day) {
        return new Date(year, month - 1, day);
    };

    Date.today = function () {
        return new Date();
    };

    // Getters/properties
    Date.prototype.year = function () { return this.getFullYear(); };
    Date.prototype.month = function () { return this.getMonth() + 1; };
    Date.prototype.day = function () { return this.getDate(); };

    // Manipulation
    // TODO: Subtraction?
    Date.prototype.addYears = function (years) {
        // Note: It looks like the Date constructor handles leap years internally (so there is no special logic here)
        return Date.create(this.year() + years, this.month(), this.day());
    };

    var getDaysInMonth = function (year, month) {
        switch (month) {
            case 1:
            case 3:
            case 5:
            case 7:
            case 8:
            case 10:
            case 12:
                return 31;
                break;

            case 4:
            case 6:
            case 9:
            case 11:
                return 30;
                break;

            case 2:
                return (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 29 : 28;
                break;

            default:
                throw 'Invalid month';
                break;
        }
    };

    Date.prototype.addMonths = function (months) {
        // Handle years first
        var years = Math.floor(months / 12);
        var baseDate = this;
        if (years > 0) {
            baseDate = baseDate.addYears(years);
            months = months % 12;
        }

        // Handle wrap-around
        var endingYear = baseDate.year() + ((baseDate.month() + months > 12) ? 1 : 0);
        var endingMonth = (baseDate.month() + months - 1) % 12 + 1;

        // Ensure the date still lands in the month
        var endingDay = Math.min(baseDate.day(), getDaysInMonth(endingYear, endingMonth));

        return Date.create(endingYear, endingMonth, endingDay);
    };

    Date.prototype.addDays = function (days) {
        // Note that this could be made more efficient when handling >= 1 year's worth of days
        var endingYear = this.year();
        var endingMonth = this.month();
        var endingDay = this.day();

        while (days > 0) {
            var daysInMonth = getDaysInMonth(endingYear, endingMonth);
            if (endingDay + days <= daysInMonth) {
                // Fits in the same month, so break out of the loop
                endingDay += days;
                break;
            } else {
                // Wrap to the next month
                days -= (daysInMonth - endingDay + 1);
                endingDay = 1;
                if (++endingMonth > 12) {
                    // Wrap to next year
                    endingMonth = 1;
                    endingYear++;
                }
            }
        }

        return Date.create(endingYear, endingMonth, endingDay);
    };
})();

module('Date manipulation');
test('Assumptions', function (assert) {
    assert.dateEqual(new Date(), new Date(Date.now()), 'Empty constructor defaults to current date');

    var today = new Date();
    assert.dateEqual(today, today, 'Identity');
});
test('Built-in constructor', function (assert) {
    var march27of2014 = new Date(2014, 2, 27);
    equal(march27of2014.getFullYear(), 2014, 'Year is correct');
    equal(march27of2014.getMonth(), 2, 'Month is correct');
    equal(march27of2014.getDate(), 27, 'Day is correct');
});
test('Custom constructors', function (assert) {
    var march27of2014Default = new Date(2014, 2, 27);
    var march27of2014Custom = Date.create(2014, 3, 27);
    assert.dateEqual(march27of2014Custom, march27of2014Default, 'Explicitly-specified date');

    var todayDefault = new Date();
    var todayCustom = Date.today();
    assert.dateEqual(todayCustom, todayDefault, 'Today constructor')
});
// TODO: Invalid values passed to constructors?
test('Custom getters', function (assert) {
    var march27of2014 = Date.create(2014, 3, 27);
    equal(march27of2014.year(), 2014, 'Year is correct');
    equal(march27of2014.month(), 3, 'Month is correct');
    equal(march27of2014.day(), 27, 'Day is correct');
});
test('Year manipulation', function (assert) {
    var march27of2014 = Date.create(2014, 3, 27);
    assert.dateEqual(march27of2014.addYears(2), Date.create(2016, 3, 27), 'Adding a few years');
    assert.dateEqual(march27of2014.addYears(100), Date.create(2114, 3, 27), 'Adding a a lot of years');

    var leapDay = Date.create(2012, 2, 29);
    assert.dateEqual(leapDay.addYears(1), Date.create(2013, 3, 1), 'Add a year to a leap day');
    assert.dateEqual(leapDay.addYears(4), Date.create(2016, 2, 29), 'Add four years to a leap day');
    var leapDay = Date.create(1896, 2, 29);
    assert.dateEqual(leapDay.addYears(4), Date.create(1900, 3, 1), 'Add four years to a leap day to land on a non-leap day');
});
test('Month manipulation', function (assert) {
    var march27of2014 = Date.create(2014, 3, 27);
    assert.dateEqual(march27of2014.addMonths(3), Date.create(2014, 6, 27), 'Adding a few months');
    assert.dateEqual(march27of2014.addMonths(11), Date.create(2015, 2, 27), 'Adding months to get to next year');
    assert.dateEqual(march27of2014.addMonths(25), Date.create(2016, 4, 27), 'Adding a bunch of months');
    var date = Date.create(2014, 3, 31);
    assert.dateEqual(date.addMonths(1), Date.create(2014, 4, 30), 'Adding months and land on an invalid day (this should stay within the month)');
    assert.dateEqual(date.addMonths(13), Date.create(2015, 4, 30), 'Adding lots of months and land on an invalid day (this should stay within the month)');
});
test('Day manipulation', function (assert) {
    var march27of2014 = Date.create(2014, 3, 27);
    assert.dateEqual(march27of2014.addDays(5), Date.create(2014, 4, 1), 'Adding a few days');
    assert.dateEqual(march27of2014.addDays(365), Date.create(2015, 3, 27), 'Adding lots of days');
    assert.dateEqual(march27of2014.addDays(366), Date.create(2015, 3, 28), 'Adding even more days');

    var date = Date.create(2016, 2, 28);
    assert.dateEqual(date.addDays(1), Date.create(2016, 2, 29), 'Landing on a leap day');
    assert.dateEqual(date.addDays(2), Date.create(2016, 3, 1), 'Going over a leap day');
    var date = Date.create(2017, 2, 28);
    assert.dateEqual(date.addDays(2), Date.create(2017, 3, 2), 'Going over a non-leap day');
});
test('Date comparisons', function (assert) {
    var today = Date.today();
    var tomorrow = Date.today().addDays(1);

    ok(Date.compareDates(today, Date.today()) === 0, 'Today is the same as today');
    ok(Date.compareDates(today, Date.today()) >= 0, 'Today is at least today');
    ok(Date.compareDates(today, Date.today()) <= 0, 'Today is at most today');
    ok(!(Date.compareDates(today, Date.today()) < 0), 'Today is not before today');
    ok(!(Date.compareDates(today, Date.today()) > 0), 'Today is not after today');

    ok(Date.compareDates(today, tomorrow) !== 0, 'Today is not tomorrow');
    ok(!(Date.compareDates(today, tomorrow) >= 0), 'Today is not at least tomorrow');
    ok(Date.compareDates(today, tomorrow) <= 0, 'Today is at most tomorrow');
    ok(Date.compareDates(today, tomorrow) < 0, 'Today is before tomorrow');
    ok(!(Date.compareDates(today, tomorrow) > 0), 'Today is not after tomorrow');

    var someDate = Date.create(2014, 3, 30);
    var someDateWithTime = new Date(2014, 2, 30, 11, 40, 23, 103);
    equal(Date.compareDates(someDate, someDateWithTime), 0, 'Dates with different times are equivalent');
});

//// Objects with serializable state
//function ObjectWithState(state) {
//    this.state = state;
//}

//ObjectWithState.prototype.getState = function () {
//    return this.state;
//};

//module('Object with state');
//test('Round-trip', function () {
//    var a = new ObjectWithState({
//        a: 0,
//        b: 1,
//        c: '',
//        d: 'string'
//    });
//    var b = new ObjectWithState(JSON.parse(JSON.stringify(a.getState())));

//    deepEqual(a, b, 'Recreated object should be identical');
//});

//function PeriodicTask(state) {
//    ObjectWithState.call(this, state);
//}

function PeriodicTask(properties) {
    this.properties = properties;
}

PeriodicTask.period = {
    oneWeek: 0,
    twoWeeks: 1,
    oneMonth: 2,
    twoMonths: 3,
    sixMonths: 4,
    oneYear: 5
};

PeriodicTask.status = {
    upToDate: 0,
    nearDue: 1,
    due: 2,
    pastDue: 3,
    wayPastDue: 4,
    unknown: 5
};

PeriodicTask.nearPeriodDays = 3;
PeriodicTask.wayPastPeriodDays = 7;

PeriodicTask.prototype.getStatusForDate = function (date) {
    // TODO: Shouldn't this just compute the number of days difference instead of doing a bunch of addition/comparisons?
    var dateDue = this.properties.dateDue;
    if (dateDue) {
        var daysUntilDue = Date.compareDates(dateDue, date);
        if (daysUntilDue > PeriodicTask.nearPeriodDays) {
            return PeriodicTask.status.upToDate;
        } else if (daysUntilDue > 0) {
            return PeriodicTask.status.nearDue;
        } else if (daysUntilDue === 0) {
            return PeriodicTask.status.due;
        } else if (daysUntilDue > -PeriodicTask.wayPastPeriodDays) {
            return PeriodicTask.status.pastDue;
        } else {
            return PeriodicTask.status.wayPastDue;
        }
    }

    return PeriodicTask.status.unknown;
};

PeriodicTask.prototype.getStatus = function () {
    return this.getStatusForDate(Date.today());
};

PeriodicTask.prototype.setDateCompleted = function (dateCompleted) {
    this.properties.dateCompleted = dateCompleted;
};

module('Periodic tasks');
test('No due date', function () {
    var task = new PeriodicTask({
        period: PeriodicTask.period.oneWeek
    });

    equal(PeriodicTask.status.unknown, task.getStatus());
});

test('With due date in one week', function () {
    var task = new PeriodicTask({
        period: PeriodicTask.period.oneWeek,
        dateDue: Date.today().addDays(7)
    });

    equal(PeriodicTask.status.upToDate, task.getStatus(), 'Up to date for one week');
    equal(PeriodicTask.status.upToDate, task.getStatusForDate(Date.today().addDays(3)), 'Up to date for 3 days');
    equal(PeriodicTask.status.nearDue, task.getStatusForDate(Date.today().addDays(4)), 'Near due for 4 days');
    equal(PeriodicTask.status.nearDue, task.getStatusForDate(Date.today().addDays(6)), 'Near due for 6 days');
    equal(PeriodicTask.status.due, task.getStatusForDate(Date.today().addDays(7)), 'Due for 7 days');
    equal(PeriodicTask.status.pastDue, task.getStatusForDate(Date.today().addDays(8)), 'Past due for 8 days');
    equal(PeriodicTask.status.pastDue, task.getStatusForDate(Date.today().addDays(13)), 'Past due for 13 days');
    equal(PeriodicTask.status.wayPastDue, task.getStatusForDate(Date.today().addDays(14)), 'Way past due for 14 days');
});

test('With due date in 14 days and last completed date in 8 days', function () {
    var task = new PeriodicTask({
        period: PeriodicTask.period.oneWeek,
        dateDue: Date.today().addDays(14),
        dateCompleted: Date.today().addDays(8)
    });

    equal(PeriodicTask.status.upToDate, task.getStatus());
    equal(PeriodicTask.status.upToDate, task.getStatusForDate(Date.today().addDays(10)));
    equal(PeriodicTask.status.nearDue, task.getStatusForDate(Date.today().addDays(11)));
    equal(PeriodicTask.status.nearDue, task.getStatusForDate(Date.today().addDays(13)));
    equal(PeriodicTask.status.due, task.getStatusForDate(Date.today().addDays(14)));
    equal(PeriodicTask.status.pastDue, task.getStatusForDate(Date.today().addDays(15)));
    equal(PeriodicTask.status.pastDue, task.getStatusForDate(Date.today().addDays(20)));
    equal(PeriodicTask.status.wayPastDue, task.getStatusForDate(Date.today().addDays(21)));
});
