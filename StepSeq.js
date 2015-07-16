"use strict";

/*
 * provides functionality for a step sequencer (steps, playback, midiOUT via MidiIO)
 */
angular
    .module('StepSequencer', ['WebMidi'])
    .factory('Playback', ['$interval', 'MidiIO', function($interval, MidiIO) {

        // contains the $interval-promise when the seq is running, undefined otherwise
        var _running;

        /*
         * array containing the steps for the sequencer
         * may have some arbitrary length, as long as length % 'stepGrouping' = 0
         * index:   for iteration and linear search
         * current: defines the single (!) current step
         * active:  states, wheter a step is active -> if its note is played when it becomes current
         */
        var _numSteps = 16;
        var _steps = [];
        for (var i = 0; i < _numSteps; i++) {
            _steps.push( { index: i,  current: false,  active: false, pitch: 60, velocity: 127} );
        }
        _steps[0].current = true;

        /* rates at which the sequencer may run */
        var _rates = [
            {string: '1/2',   divisor: 2},
            {string: '3/8',   divisor: 2.6667},
            {string: '1/2T',  divisor: 3},
            {string: '1/4',   divisor: 4},
            {string: '3/16',  divisor: 5.3332},
            {string: '1/4T',  divisor: 6},
            {string: '1/8',   divisor: 8},
            {string: '3/32',  divisor: 10.6667},
            {string: '1/8T',  divisor: 12},
            {string: '1/16',  divisor: 16},
            {string: '1/16T', divisor: 24},
            {string: '1/32',  divisor: 32},
            {string: '1/64',  divisor: 64}
        ];

        /* current parameters, mirrored from StepSeqCtrl.sequencer */
        var _settings = {
            bpm: 120,
            rate: 6,
            gateLength: 0.7
        }

        /**
         * changes the sequencers state of running or paused
         * @param state truthy to start running, falsy to pause
         */
        function _run(state) {
            if (state) {
                // play current note
                _playStep(_currentStep());
                // register interval
                _running = $interval( function(){ _nextStep(); }, _getSteptime() );
            } else {
                $interval.cancel(_running);
                _running = undefined;
            }
            console.log('_running: ' + state);
        }


        /**
         * stops running and sets the first step as current
         */
        function _stop() {
            // stop _running
            _run(false);
            // set first step as current
            _currentStep().current = false;
            _steps[0].current = true;
        }

        /**
         * updates the interval at which the next step is advanced
         */
        function _updateTimer() {
            if (_running) {
                $interval.cancel(_running);
                _running = $interval( function(){ _nextStep(); }, _getSteptime() );
            }
        }

        /**
         * @return the time for a step in milliseconds, depending on rate & bpm
         */
        function _getSteptime() {
            var stepTime = 240000 / _rates[_settings.rate].divisor / _settings.bpm;
            console.log('steptime: ' + stepTime + 'ms');
            return stepTime;
        }

        function _setBPM(v) {
            _settings.bpm = v;
            console.log('bpm: ' + _settings.bpm);
            if (_running) _updateTimer();
        }

        function _setRate(v) {
            _settings.rate = v;
            console.log('rate: ' + _rates[_settings.rate].string);
            if (_running) _updateTimer();
        }

        function _setGate(v) {
            _settings.gateLength = v;
            console.log('gate: ' + _settings.gateLength);
        }

        /**
         * advances the current step
         */
        function _nextStep() {
            var currStep = _currentStep();
            currStep.current = false;
            currStep = _steps[(currStep.index + 1) % _steps.length];
            currStep.current = true;

            _playStep(currStep);
        };

        /**
         * advances the current step backwards :^D
         */
        function _prevStep() {
            var currStep = _currentStep();
            currStep.current = false;
            currStep = _steps[(currStep.index  + _steps.length - 1) % _steps.length];
            currStep.current = true;

            _playStep(currStep);
        };

        /**
         * plays the note of a step
         */
        function _playStep(step) {
            if (step.active && _running) {
                MidiIO.sendNote(step.pitch, step.velocity, _settings.gateLength * _getSteptime());
            }
        }

        /**
         * finds the current step in the array of steps, using linear search
         * @return the current step
         */
        function _currentStep() {
            for (var i in _steps) {
                if (_steps[i].current) return _steps[i];
            }
        }

        return {
            steps: _steps,
            currentStep: _currentStep,
            setBPM: _setBPM,
            setRate: _setRate,
            setGate: _setGate,
            run: _run,
            stop: _stop,
            nextStep: _nextStep,
            prevStep: _prevStep
        };
    }]);