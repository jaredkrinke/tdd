// Random number generator implementation using Math.random()
function RandomDefault() {
}

RandomDefault.prototype.random = function () {
    return Math.random();
};

// Simple deterministic (but less random) random number generator
function RandomFixed(json) {
    this.index = 0;
    if (json) {
        // Parse the supplied values (in JSON format)
        this.randomValues = JSON.parse(json);
    } else {
        // Generate some new random values
        this.randomValues = [];
        var count = RandomFixed.randomValueCount;
        for (var i = 0; i < count; i++) {
            this.randomValues[i] = Math.random();
        }
    }
}

RandomFixed.randomValueCount = 211;

RandomFixed.prototype.random = function () {
    // Get the next number and move to the next index
    var value = this.randomValues[this.index];
    this.index = (this.index + 1) % this.randomValues.length;
    return value;
};

RandomFixed.prototype.toJSON = function () {
    return JSON.stringify(this.randomValues);
};

// Test all the implementations for correctness
module('Correctness');
var randomFixedNoSeed = new RandomFixed();
var implementations = [
    { name: 'Default', create: function () { return new RandomDefault(); } },
    { name: 'Fixed (no seed)', create: function () { return new RandomFixed(); } },
    { name: 'Fixed (cloned)', create: function () { return new RandomFixed(randomFixedNoSeed.toJSON()); } }
];
for (var i = 0; i < implementations.length; i++) {
    (function (i) {
        var implementation = implementations[i];
        var name = implementation.name;
        var random = implementation.create();

        test('Uniform distribution (10 buckets) - ' + name, function () {
            // Generate 200 values in 10 buckets
            var count = 200;
            var buckets = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            for (var j = 0; j < count; j++) {
                buckets[Math.floor(random.random() * buckets.length)]++;
            }

            // Make sure the distribution is roughly uniform
            var allowedError = 0.1;
            var expected = count / buckets.length;
            var allowedDelta = allowedError * count;
            for (var j = 0; j < buckets.length; j++) {
                ok(Math.abs(buckets[j] - expected) <= allowedDelta, 'Numbers should be uniformly distributed: bucket ' + j + ': ' + buckets[j] + ', expected: ' + expected);
            }
        });

        test('Non-repeating (100 values) - ' + name, function () {
            // Generate values
            var count = 100;
            var values = [];
            for (var i = 0; i < count; i++) {
                values.push(random.random());
            }

            // Ensure there are no duplicates
            for (var i = 0; i < count; i++) {
                var value = values[i];
                equal(values.indexOf(value), i, 'Value should appear at this index');
                if (i < count - 1) {
                    equal(values.indexOf(value, i + 1), -1, 'Value should not appear again');
                }
            }
        });

        test('Non-monotonic - ' + name, function () {
            // Generate values
            var count = 50;
            var values = [];
            for (var i = 0; i < count; i++) {
                values.push(random.random());
            }

            var increasing = (values[1] >= values[0]);
            var monotonic = true;
            for (var i = 2; i < count && monotonic; i++) {
                if (increasing) {
                    monotonic = (values[i] >= values[i - 1]);
                } else {
                    monotonic = (values[i] <= values[i - 1]);
                }
            }

            ok(!monotonic, 'Sequence should not be monotonic');
        });

        // TODO: Check for granularity?
    })(i);
}

// Test determinism for relevant implementations
module('Determinism');
var deterministicImplementations = [
    {
        name: 'Fixed',
        createA: function () { return new RandomFixed(); },
        createB: function (a) { return new RandomFixed(a.toJSON()); },
    },
];
for (var i = 0; i < deterministicImplementations.length; i++) {
    (function (i) {
        var implementation = deterministicImplementations[i];
        var name = implementation.name;
        var a = implementation.createA();
        var b = implementation.createB(a);

        test('Determinism - ' + name, function () {
            var count = 20;
            for (var j = 0; j < count; j++) {
                equal(a.random(), b.random(), 'Implementations should return the same values');
            }
        });
    })(i);
}
