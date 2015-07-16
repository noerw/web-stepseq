"use strict";

/*
 * main module, loading all dependencies
 */
angular
    .module('StepSeqApp', ['StepSequencer', 'WebMidi'])

    /*
     * one controller to rule them all
     * contains some utility functions //TODO encapsulate them?
     */
    .controller('StepSeqCtrl', ['$scope', 'Playback','MidiIO', function($scope, Playback, MidiIO) {

        // arrays containing information on midi devices, model for the select menus
        $scope.inDevices  = [];
        $scope.outDevices = [];

        // get the steps from Playback (StepSeq.js)
        $scope.steps = Playback.steps;

        // size of buttongroups in which the steps are
        $scope.stepGrouping = 4;
        
        // helper for ng-repeat creating buttongroups for each 4 steps
        $scope.stepGroups = [];
        for (var i = $scope.stepGrouping; i <= $scope.steps.length; i += $scope.stepGrouping) {
            $scope.stepGroups.push(i);
        }

        // bootstrap classes for the html buttons
        //TODO hardcode in index.html (?)
        $scope.buttonStates = {
            current:   'btn-primary',
            active:    'btn-info',
            recording: 'btn-danger',
            standard:  'btn-default'
        };

        // current settings, mirrored in Playback.settings via watches
        $scope.sequencer = {
            bpm: 120,
            rate: 6,
            gate: 0.7,
            running: false,
            recording: false
        };

        // lookup table for the MIDI mapping (note names, channels, CCs)
        // combinations of channel & cmd type must be unique!
        //TODO: load from file
        var mMap = {
            notes: [
                'C-1', 'C#-1', 'D-1', 'D#-1', 'E-1', 'F-1', 'F#-1', 'G-1', 'G#-1', 'A-1', 'A#-1', 'B-1',
                'C0' , 'C#0', 'D0' , 'D#0', 'E0' , 'F0' , 'F#0', 'G0' , 'G#0', 'A0' , 'A#0', 'B0' ,
                'C1' , 'C#1', 'D1' , 'D#1', 'E1' , 'F1' , 'F#1', 'G1' , 'G#1', 'A1' , 'A#1', 'B1' ,
                'C2' , 'C#2', 'D2' , 'D#2', 'E2' , 'F2' , 'F#2', 'G2' , 'G#2', 'A2' , 'A#2', 'B2' ,
                'C3' , 'C#3', 'D3' , 'D#3', 'E3' , 'F3' , 'F#3', 'G3' , 'G#3', 'A3' , 'A#3', 'B3' ,
                'C4' , 'C#4', 'D4' , 'D#4', 'E4' , 'F4' , 'F#4', 'G4' , 'G#4', 'A4' , 'A#4', 'B4' ,
                'C5' , 'C#5', 'D5' , 'D#5', 'E5' , 'F5' , 'F#5', 'G5' , 'G#5', 'A5' , 'A#5', 'B5' ,
                'C6' , 'C#6', 'D6' , 'D#6', 'E6' , 'F6' , 'F#6', 'G6' , 'G#6', 'A6' , 'A#6', 'B6' ,
                'C7' , 'C#7', 'D7' , 'D#7', 'E7' , 'F7' , 'F#7', 'G7' , 'G#7', 'A7' , 'A#7', 'B7' ,
                'C8' , 'C#8', 'D8' , 'D#8', 'E8' , 'F8' , 'F#8', 'G8' , 'G#8', 'A8' , 'A#8', 'B8' ,
                'C9' , 'C#9', 'D9' , 'D#9', 'E9' , 'F9' , 'F#9', 'G9'
            ],
            /*
             * defines the channel on which to listen for note-events
             */
            noteOn: {
                channel: 0,
                cmdType: 9    // note on
            },
            /*
             * defines channel & CC-numbers for buttons that control the playback
             */
            playback: {
                channel: 15,
                cmdType: 11,  // CC (hex B)
                rewind:  114,
                forward: 115,
                stop:    116,
                play:    117,
                record:  118
            },
            /*
             * defines channel & CC-numbers to toggle the active-state of steps
             * unless toggleMultiSteps is activated, each step reacts to a different midiCC
             */
            stepActive: {
                channel:          9,
                cmdType:          11,
                startCC:          52,  // the cc value that toggles the first step.
                                       // CC numbers increase for each following step
                toggleMultiSteps: true // enables toggling the active state of multiple steps at once (i+k*8)
            },
            /*
             * defines channel & CC-numbers that change sequencers params like speed & gateLength
             */
            parameters: {
                channel:    0,
                cmdType:    11,
                bpm:        16,
                rate:       17,
                gateLength: 18
            },
            /*
             * defines channel & CC-number that control the  transpose function
             * lowering the value transposes down, increasing the value transposes up
             */
            transpose: {
                channel:   6,
                cmdType:   11,
                CC:        19,
                lastValue: 63
            }
        };

        /**
         * @param midiNumber int(0-127) of a midi note 
         * @param string name of the corresponding midi note
         */
        $scope.pitchToKey = function (midiNumber) {
            return mMap.notes[midiNumber];
        };

        /**
         * @param key: string of a note to look up
         * @param int the corresponding midi number of the note
         */        
        $scope.keyToPitch = function(key) {
            return mMap.notes.indexOf(key);
        };

        /**
         * sets the pitch of a step from a UI event
         * @param step the step to alter
         * @param $event onclick-event on a element the select-note-menu of a step
         */
        $scope.setPitchFromUI = function(step, $event) {
            //get content (key string) of clicked item
            var selectedDropdownNote = angular.element($event.target).text();
            
            //assign it to the step
            step.pitch = $scope.keyToPitch(selectedDropdownNote);
        };
        
        /**
         * @param midiNumber note around which the array will be centered
         * @param range 1/2 size of the array
         * @return stringarray array of note-strings
         */
        $scope.getNoteArray = function(midiNumber, range) {
            var noteArray = [];
            var lowerLimit = Math.max(midiNumber - range, 0);
            var upperLimit = Math.min(midiNumber + range, mMap.notes.length);

            for (var i = lowerLimit; i <= upperLimit ; i++) {
                noteArray.push(mMap.notes[i]);
            }
            return noteArray;
        };

        /**
         * gets midi-in & -out devices and stores them in the array inDevices and outDevices
         */
        $scope.getMidiDevices = function() {
            MidiIO.getDevices($scope.inDevices, $scope.outDevices);
        }

        /**
         * handles midi inputs & their logic
         * depends on the mapping defined in mMap
         * is registered as onMidiEvent-callback on the input device.
         * @param event the midi event to handle
         */
        function _onMidiIn(event) {
            if (event.data[2] != 0) { // dismiss note off events
                $scope.$apply(function(){ // to reflect changes made by this function in the view

                    switch (event.data[0]) {
                        case _getStatusByte(mMap.noteOn):   // note on/off
                            //change current step
                            if ($scope.sequencer.recording) {
                                var currStep = Playback.currentStep();
                                currStep.pitch    = event.data[1];
                                currStep.velocity = event.data[2];
                                currStep.active   = true;
                                if (!$scope.sequencer.running) Playback.nextStep();
                            }
                            break;

                        case _getStatusByte(mMap.stepActive):   // toggle active steps
                            // toggle every 8 step active / inactive
                            var i = event.data[1] - mMap.stepActive.startCC; 
                            while (typeof Playback.steps[i] !== 'undefined') {
                                var step  = Playback.steps[event.data[1] - mMap.stepActive.startCC];
                                step.active =! step.active;
                                if (mMap.stepActive.toggleMultiSteps) {
                                    i += 8;
                                } else { break; }
                            }
                            break;

                        case _getStatusByte(mMap.playback):   // playback buttons
                            var k = event.data[1];
                            if (k === mMap.playback.rewind) {
                                Playback.prevStep();
                            } else if (k === mMap.playback.forward) {
                                Playback.nextStep();
                            } else if (k === mMap.playback.stop) {
                                $scope.stop();
                            } else if (k === mMap.playback.play) {
                                $scope.sequencer.running =! $scope.sequencer.running;
                            } else if (k === mMap.playback.record) {
                                $scope.sequencer.recording =! $scope.sequencer.recording;
                            }
                            break;

                        case _getStatusByte(mMap.parameters):
                            var k = event.data[1];
                            if (k === mMap.parameters.bpm) {
                                $scope.sequencer.bpm = parseInt(event.data[2] / 127 * 240 + 40);
                            } else if (k === mMap.parameters.rate) {
                                $scope.sequencer.rate = parseInt(event.data[2] / 127 * 12);
                            } else if (k === mMap.parameters.gateLength) {
                                $scope.sequencer.gate = event.data[2] / 127;
                            }
                            break;

                        case _getStatusByte(mMap.transpose):
                            var k = event.data[1];
                            if (k === mMap.transpose.CC) {
                                if (event.data[2] > mMap.transpose.lastValue) $scope.transpose('up');
                                else $scope.transpose('down');
                                mMap.transpose.lastValue = event.data[2];
                            }
                            break;
                    }
                });
            }
        }

        /**
         * converts the channel and command type as defined in mMap
         * needed, as the MIDIprotocol combines both values into a single (hex)byte
         * @param mapping the sub-object of a functionality as defined in mMap
         * @return int status byte for the functionality passed in mapping
         */
        function _getStatusByte(mapping) {
            return mapping.cmdType * 16 + mapping.channel;
        }

        // watches to pass changes in the view to the model in Playback / MidiIO
        $scope.$watch('sequencer.bpm',     Playback.setBPM);
        $scope.$watch('sequencer.rate',    Playback.setRate);
        $scope.$watch('sequencer.gate',    Playback.setGate);
        $scope.$watch('sequencer.running', Playback.run);
        $scope.$watch('activeInDevice', function(newVal, oldVal) {
            MidiIO.setInDevice(newVal, _onMidiIn);
        });
        $scope.$watch('activeOutDevice', MidiIO.setOutDevice);
    
        // stops playback
        $scope.stop = function(){
            $scope.sequencer.running = false;
            Playback.stop();
        }

        /**
         * transposes all steps up or down one semitone
         * @param direction string "up" or "down", giving the direction in which to transpose
         */
        $scope.transpose = function(direction) {
            for (var i in $scope.steps) {
                var pitch = $scope.steps[i].pitch;
                if (direction == 'up')   $scope.steps[i].pitch = Math.min(127, pitch + 1);
                if (direction == 'down') $scope.steps[i].pitch = Math.max(0,   pitch - 1);
            }
            console.log('transposed ' + direction);
        }

        // init device list
        $scope.getMidiDevices();

    }]);