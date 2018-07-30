var hap = require("hap-nodejs")
var uuid = require("hap-nodejs").uuid;
var Accessory = require("hap-nodejs").Accessory;
var Service = require("hap-nodejs").Service;
var Characteristic = require("hap-nodejs").Characteristic;
// var qrcode = require('qrcode-terminal');
var qrcode = require('qrcode');
var exec = require('child_process').exec;

var err = null; // in case there were any problems

console.log("Pi-Switch starting...");


// Initialize our storage system
hap.init();

// here's a fake hardware device that we'll expose to HomeKit
var PI_SWITCH = {
    // It should be one as long by default
    powerOn: true,
    isRebooting: false,

    setPowerOn: function (on) {
        console.log("Turning the Pi %s!...", on ? "on" : "off");
        if (on) {
            PI_SWITCH.powerOn = true;
            if (err) { return console.log(err); }
            console.log("...Pi is now on.");
        } else {
            PI_SWITCH.powerOn = false;
            exec("sudo shutdown -h now", (err, stdout, stderr) => {
                console.log(err, stdout, stderr);
            });
            if (err) { return console.log(err); }
            console.log("...Pi is going to off.");
        }
    },
    setReboot: () => {
        console.log("exectuing sudo reboot!!!!");
        this.isRebooting = true;
        exec("sudo reboot", (err, stdout, stderr) => {
            console.log(err, stdout, stderr);
        });
        // setTimeout(() => {
        //     this.isRebooting = false;
        //     console.log('reboot done!!');
        //     piSwitch.getService("Switch Reboot")
        //         .updateCharacteristic(Characteristic.On, piSwitch.isRebooting);
        // }, 2000);
    },
    identify: function () {
        console.log("Identify the Pi.");
    }
};

// Generate a consistent UUID for our outlet Accessory that will remain the same even when
// restarting our server. We use the `uuid.generate` helper function to create a deterministic
// UUID based on an arbitrary "namespace" and the accessory name.
var outletUUID = uuid.generate('hap-nodejs:accessories:Switch');
console.log(outletUUID);
// This is the Accessory that we'll return to HAP-NodeJS that represents our fake light.
var piSwitch = new Accessory('Switch', outletUUID);

// Add properties for publishing (in case we're using Core.js and not BridgedCore.js)
piSwitch.username = "1A:2B:3C:4D:5D:FA";
piSwitch.pincode = "031-45-154";

// set some basic properties (these values are arbitrary and setting them is optional)
piSwitch
  .getService(Service.AccessoryInformation)
  .setCharacteristic(Characteristic.Manufacturer, "Oltica")
  .setCharacteristic(Characteristic.Model, "Rev-1")
  .setCharacteristic(Characteristic.SerialNumber, "A1S2NASF88EW");

// listen for the "identify" event for this Accessory
piSwitch.on('identify', function(paired, callback) {
  PI_SWITCH.identify();
  callback(); // success
});

// Add the actual outlet Service and listen for change events from iOS.
// We can see the complete list of Services and Characteristics in `lib/gen/HomeKitTypes.js`
console.log("service is: " + JSON.stringify(Service.Switch));
piSwitch
  .addService(Service.Switch, "Pi On/Off", "Switch On/Off") // services exposed to the user should have "names" like "Fake Light" for us
  .getCharacteristic(Characteristic.On)
  .on('set', function(value, callback) {
    PI_SWITCH.setPowerOn(value);
    callback(); // Our fake Outlet is synchronous - this value has been successfully set
  });

// We want to intercept requests for our current power state so we can query the hardware itself instead of
// allowing HAP-NodeJS to return the cached Characteristic.value.
piSwitch
  .getService("Switch On/Off")
  .getCharacteristic(Characteristic.On)
  .on('get', function(callback) {

    // this event is emitted when you ask Siri directly whether your light is on or not. you might query
    // the light hardware itself to find this out, then call the callback. But if you take longer than a
    // few seconds to respond, Siri will give up.

    var err = null; // in case there were any problems

    if (PI_SWITCH.powerOn) {
      console.log("Are we On/Off? Yes.");
      callback(err, true);
    }
    else {
      console.log("Are we On/Off? No.");
      callback(err, false);
    }
  }); 

  piSwitch
  .addService(Service.Switch, "Pi Reboot", "Switch Reboot") // services exposed to the user should have "names" like "Fake Light" for us
  .getCharacteristic(Characteristic.On)
  .on('set', function(value, callback) {
    // PI_SWITCH.setPowerOn(value);
    console.log('call setReboot..');
    PI_SWITCH.setReboot();
    callback(); // Our fake Outlet is synchronous - this value has been successfully set
  });

// We want to intercept requests for our current power state so we can query the hardware itself instead of
// allowing HAP-NodeJS to return the cached Characteristic.value.
piSwitch
  .getService("Switch Reboot")
  .getCharacteristic(Characteristic.On)
  .on('get', function(callback) {

    // this event is emitted when you ask Siri directly whether your light is on or not. you might query
    // the light hardware itself to find this out, then call the callback. But if you take longer than a
    // few seconds to respond, Siri will give up.

    var err = null; // in case there were any problems

    if (PI_SWITCH.isRebooting) {
      console.log("Are we rebooting? No.");
      callback(err, true);
    }
    else {
      console.log("Are we on rebooting? Yes.");
      callback(err, false);
    }
  }); 

// Publish the camera on the local network.
piSwitch.publish({
  username: piSwitch.username,
  port: 51062,
  pincode: piSwitch.pincode,
});

// Generate the QRCode
console.log(piSwitch.setupURI());
qrcode.toFile('QRCODE.txt', piSwitch.setupURI(), err => {
    if (err) {
        console.log("Failed to Generate QRCODE.");
    } else {
        console.log('QRCODE.txt has been generated.')
    }
});

var signals = { 'SIGINT': 2, 'SIGTERM': 15 };
Object.keys(signals).forEach(function (signal) {
  process.on(signal, function () {
    piSwitch.unpublish();
    setTimeout(function (){
        process.exit(128 + signals[signal]);
    }, 1000)
  });
});
