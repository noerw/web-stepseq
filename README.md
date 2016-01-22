# web-stepseq
This is a simple step-sequencer with MIDI in- & output, that runs in the browser.
It utilizes the [webMidi API](http://www.w3.org/TR/webmidi/) (draft specification, but mostly stable) and angularJS.

**Currently only works in chromium v43, newer versions do not register the midi devices!**

At the moment (July 2015) only chromium/chrome supports the webMidi API. In the meantime there is a [polyfill](https://github.com/cwilso/WebMIDIAPIShim/), which should provide the needed functionality in other browsers (not tested).

Tested in chrome (win 64bit) and chromium (ubuntu 14.04 64bit) 43.0.2357 with a M-Audio Axiom keyboard.

### midi config
To configure the app to the mapping of your own midi input device, you have to look into `app.js#l52`.
In the object `mMap`, the mapping for midi inputs is configured:

For each functionality that is supported, you can configure the corresponding MIDI channel (index starts at 0), type of command (mostly CC-messages), and the corresponding CC-values.

If you are not familiar with the MIDI protocol, you may want to look [here](https://de.wikipedia.org/wiki/Musical_Instrument_Digital_Interface#Nachrichtentypen)

**Note that** currently the combination of channel and command type (eg 11 for CC) must be unique.
This will be resolved in future releases.
Also this configuration will be put into an external json file.
