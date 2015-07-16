"use strict";

/*
 * provides Midi-IO functionality via the browsers WebMIDI API
 */
angular
    .module('WebMidi', [])
    .factory('MidiIO', ['$window', '$timeout', '$q', function($window, $timeout, $q) {
        
        var inDevice, outDevice; // current devices

        /**
         * setter for the input device
         * @param the device to set
         * @param the callback function, which is called on a incoming MIDI event
         */
        function _setInDevice(device, onMessage) {
            if(device) {
                // unplug any already connected device
                if(inDevice) {
                    _disconnectInDevice();
                }

                inDevice = device;
                inDevice.onmidimessage = onMessage;
            }
        }

        function _setOutDevice(device) {
            if (device) {
                _disconnectOutDevice();
                outDevice = device;
            }
        }
        
        /**
         * cancels the connection to the current input device
         */
        function _disconnectInDevice() {
            if(inDevice && inDevice.onmidimessage) {
                inDevice.onmidimessage = null;
            }

            inDevice = null;
        }

        function _disconnectOutDevice() {
            if (outDevice) {
                outDevice = null;
            }
        }

        /**
         * sends a midi note to the outDevice (on channel 0)
         * @param pitch range 0-127, not checked
         * @param velocity range 0-127, not checked
         * @param length in miliseconds [not too accurate, as its using $timeout]
         */
        function _sendNote(pitch, velocity, length) {
            if (outDevice != null) {
                outDevice.send([0x90, pitch, velocity]);
                $timeout( function(){
                    outDevice.send([0x80, pitch, velocity]);
                }, length);
            }
        }

        /**
         * @return a boolean reflecting the availability of WebMidi API
         */
        function _testMidiAccess() {
            return ($window.navigator && $window.navigator.requestMIDIAccess) ? true : false;
        }

        /**
         * finds available mididevices
         * @return promise containing the found devices, which can be passed to setDevice()
         */
        function _connect() {
            var d = $q.defer(),
            p = d.promise
            //a = null;

            if(_testMidiAccess()) {
                $window
                    .navigator
                    .requestMIDIAccess()
                    .then(d.resolve, d.reject);
            } else {
                d.reject(new Error('No Web MIDI support'));
            }

            return p;
        }

        /**
         * get midiDevices & push their descriptions into the given arrays
         * @param array which will contain the input devices
         * @param array which will contain the output devices
         */
        function _getDevices(inDevices, outDevices) {
            // remove existing connections
            _disconnectInDevice();
            _disconnectOutDevice();
            inDevices  = [];
            outDevices = [];

            // find devices
            _connect().then(function(access) {
                if(access.inputs && access.inputs.size > 0) {
                    var inputs  = access.inputs.values();
                    var outputs = access.outputs.values();

                    // iterate through the found devices and add them to the given arrays
                    for (var input = inputs.next(); input && !input.done; input = inputs.next()) {
                        inDevices.push(input.value);
                    }
                    for (var output = outputs.next(); output && !output.done; output = outputs.next()) {
                        outDevices.push(output.value);
                    }
                } else {
                    console.error('No devices detected!');
                }
            }).catch(function(e) {
                console.error(e);
            });
        }

        function _logMidiEvent(event) {
            var string = "MIDI message received at timestamp " + event.timestamp + "[" + event.data.length + " bytes]: ";
            for (var i=0; i<event.data.length; i++) {
                string += "0x" + event.data[i].toString(16) + " ";
            }
            console.log(string);
        }

        return {
            getDevices:   _getDevices,
            setInDevice:  _setInDevice,
            setOutDevice: _setOutDevice,
            disconnectInDevice:  _disconnectInDevice,
            disconnectOutDevice: _disconnectOutDevice,
            sendNote: _sendNote
        };
    }]);