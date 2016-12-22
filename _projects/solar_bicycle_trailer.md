---
layout: page
title: Solar Bicycle Trailer
---

This is describing my efforts to attach a couple solar panels to my bike trailer and set them to charge my electric bicycle.

## Why Build this?

Prior to this project, I had converted my old [2013 GT Tachyon 3.0](http://www.gtbicycles.com/usa_en/2013/bikes/road/performance/tachyon-3-0) to carry a bafang bbs02 with a 52v nominal lipo battery. The default controller on the bbs02 is rated for up to 60v, which means that I can maximize the power output with a 52v battery (because it has a max voltage of 58.6v). This is enough power to get my lightweight going upwards of 30 mph. With the 11.5 amp-hour battery I have, I have about 500 watt-hours of usable energy (using only the middle 80% power of the battery, as is recommended for long battery life). In practice, this gets me anywhere between 5 and 30 watt-hours/mile, depending on how hilly the route I take, how fast I go, and how much I peddle. For purposes of this post, let's call it 15 watt-hours/mile, going 20 mph. Meaning that, on that full charge, I can go roughly 32 miles before I run out of charge. This is excellent range, and honestly, unless I plan on going bike touring, I will never need to exceed this.

Unfortunately, I would like to go bike touring with this, and I would like to actually camp during this time. Meaning that I want to be able to charge in the woods/during the ride.

## Donor Trailer

I bought a [burley cargo trailer](https://burley.com/product/nomad/) and am in the process of adapting it to better suit my needs.

## Panels

I bought 2 semi-flexible 50 watt (18v nominal) panels off Amazon. At the time, buying two of these was cheaper than buying a single 100 watt panel at about the same weight. While this wouldn't be enough power to allow me to continuously cycle, it is enough to fully charge my battery (and then some) while I camp.

I have built a rigid frame to mount the panels to, and have built a mount to attach the frame to the bike trailer that allows the panels to rotate. This allows me to lift the panels and have access to the inside of the trailer. I'm working on mounting linear actuators to this, which would allow me to flip a switch and lift up the panels.

![Panels on Frame on Trailer](/assets/solar_trailer_panels_mounted.jpg)

## Electronics

The panels are fed to a cheap MPPT I got off Amazon, which in turn will provide power to a separate 52v battery, as well as 12 volt rails (to power the linear actuators).

## Control/v1.5 work

As mentioned before, the linear actuator is controlled by a manual switch. I'd like to replace that with a bluetooth-enabled accessory that senses when I'm closeby and automatically lifts the panels to grant my access. Furthermore, I'd like to be able to get information on the state of the electronics - how much power I'm getting from the panels, the charge state of the battery, and so on.

## V2.0 work

For a version 2 solar trailer, I'm planning on building a trailer from scratch. This new trailer will also feature a 2-axis solar tracker (in addition to an MPPT charge controller), as well as 300 watts of solar. This trailer is still in the design phase, as I don't yet have the necessary skills to build it (for example, I don't yet know how to weld, nor do I really have a space to do so).
