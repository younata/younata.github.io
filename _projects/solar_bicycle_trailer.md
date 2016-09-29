---
layout: page
title: Solar Bicycle Trailer
---

This is describing my efforts to attach a couple solar panels to my bike trailer and set them to charge my electric bicycle.

## Existing System

Prior to this project, I had converted my old [2013 GT Tachyon 3.0](http://www.gtbicycles.com/usa_en/2013/bikes/road/performance/tachyon-3-0) to carry a bafang bbs02 with a 52v nominal lipo battery. The default controller on the bbs02 is rated for up to 60v, which means that I can maximize the power output with a 52v battery (because it has a max voltage of 58.6v). This is enough power to get me going upwards of 30 mph (which is illegally fast where I live). With the 11.5 amp-hour battery I have, I have about 480 watt-hours of usable energy (using only the middle 80% power of the battery, as is recommended for long battery life). In practice, this gets me anywhere between 5 and 30 watt-hours/mile, depending on how hilly the route I take, how fast I go, and how much I peddle. For purposes of this post, let's call it 15 watt-hours/mile, going 20 mph. Meaning that, on that full charge, I can go roughly 32 miles before I run out of charge. This is excellent range, and honestly, unless I plan on going bike touring, I will never need to exceed this.

Unfortunately, I would like to go bike touring with this, and I would like to actually camp during this time. Meaning that I need to be able to charge in the woods/during the ride.

## Donor Trailer

I bought a [burley cargo trailer](https://burley.com/product/nomad/) and am in the process of adapting it to better suit my needs.

## Panels

I bought 2 semi-flexible 50 watt (18v nominal) panels off Amazon. Cost about $200, and I have them wired in series to output 100 watts at 36v nominal. The idea being that it's easier to convert up to 60 volts from 36v and ~2.5 amps than at 18v and ~5 amps. While this wouldn't be enough power to allow me to continuously cycle (even if I was constantly getting the full 100watts from the system, I use roughly 300 watt-hours of electricity cycling), it is enough to fully charge my battery (and then some) while I camp.

I'm in the process of building a rigid frame to mount the panels to, this will be attached to the trailer at the top of it, and then to the rear of the trailer through a linear actuator. The linear actuator will be programmed to act both as a pivot point for a single axis tracker, and as a way to lift the panels to provide access to the contents of the trailer.

## Electronics

The panels are fed to a Genasun MPPT, which in turn provides power to a separate 52v, 14 amp-hour battery (to be determined, though this is what I'm leaning towards), as well as 5v and 12v rails. The 5v rail powers 4 usb ports (for charging phones, bike lights, etc.), and an atmega 328p (which controls the linear actuator). The 12v rail powers the linear actuator.

## Control

As mentioned before, the linear actuator is controlled by an atmega 328p. The microcontroller is fed data from a GPS sensor and a magnetometer. Combined, this gives location, time, and orientation, and the means to divine the Sun's position (and thus, the ability to re-orient the panel to directly face the sun as much as possible). There's simple LCD character display that gives current estimated sun exposure and the current battery charge level. Depending on how much this single-axis tracking system actually works, I may add a bluetooth system to feed data from this into a smartphone display which will allow me to show prettier graphs of how it's working.

