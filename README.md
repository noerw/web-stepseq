# web-stepseq
This is a simple step-sequencer with MIDI in- & output, that runs in the browser.
It utilizes the [webMidi API](http://www.w3.org/TR/webmidi/) (draft specification, but mostly stable) and angularJS.

The project currently is in development phase, but basic functionality is working.
The code isn't that well structured, as this is my first angular project. I'm working on it.

At the moment (20150704) only chromium/chrome supports the webMidi API. In the meantime there is a [polyfill](https://github.com/cwilso/WebMIDIAPIShim/), which should provide the needed functionality in other browsers (not tested).

Tested in chrome (win 64bit) and chromium (ubuntu 14.04 64bit) 43.0.2357 with a M-Audio Axiom keyboard.
