---
layout: post
title: Homemade thermostat for my apartment
date: 2015-12-23
tags: home assistant, thermostat
---

In the process of setting up a home automation system, I realized that I can't do a lot of what I want with simple off-the-shelf parts - because I rent. For example, I wanted to set up a [Lockitron](https://lockitron.com), but I can't replace the lock<sup>[1](#1)</sup>. I also wanted to set up a [Nest](https://nest.com), but I don't want to risk my security deposit. I'm still working on the smartlock thing<sup>[2](#2)</sup>, but I think I figured out the thermostat.

A bit of background first, though. I set up a Raspberry Pi 2 to run [Home Assistant](https://home-assistant.io), and I've long since set that up to control the lights <sup>[3](#3)</sup>. I have it hooked up to quite a few different components - for example, when we watch a movie using Kodi, it adjusts the lights for optimal enjoyment<sup>[4](#4)</sup>.

This winter, however, I ran into another area for improvement. While my apartment does have a heater/thermostat, it's not programmable in any way. Instead, I hooked a space heater to a [WeMo wifi-enabled power outlet](http://www.amazon.com/WeMo-Enabled-Electronics-anywhere-Compatible/dp/B00BB2MMNE/), and gave Home Assistant similar rules as the lights<sup>[5](#5)</sup>. It works wonderfully. I don't have to worry about a potential fire hazard, because I can just check Home Assistant from anywhere and see that the power outlet is off.

To improve upon this, I have plans to set up a thermometer so that Home Assistant can act as a proper thermostat. This will certainly be useful as it starts to warm up in a couple months, and I no longer have to waste electricity needlessly heating our apartment.

[Here's a link to a scrubbed copy of my configuration.yml](https://gist.github.com/younata/930e85a717d1006245a5)

<a name="1">1</a>: I suffer from the problem of forgetting that I locked the door. I'd love the ability to check at a glance that my door is locked, and if not, have it locked.  
<a name="2">2</a>: As I understand it, the kickstarted lockitron could do this, but I'm a couple years too late for that.  
<a name="3">3</a>: Before I set this up, I just used the Hue app on my phone. However, after my partner moved in with me, I found using home assistant to the handle the either/or cases for us to be superior to us both using the Hue app. For example, when I would leave for work, the app would sense that I had left home and turn the lights out even though my partner was still home. Now, Home Assistant sees that I leave home, but doesn't turn the lights off because my partner is still home.  
<a name="4">4</a>: Unfortunately, it doesn't detect when I turn on any of my other media devices, and I don't know how to do that.  
<a name="5">5</a>: Turn on at a certain time (2 hours before the lights, so that it can warm the room up), turn off when nobody is home, etc.