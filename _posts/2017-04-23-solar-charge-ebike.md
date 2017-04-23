---
layout: post
title: Charging my Electric Bike with Solar Power
date: 2017-04-23
tags: electric, bike, ebike, vehicle, ev, solar, power, charging, off, the, grid
---

Yesterday was Earth Day. I did not join the [#marchforscience](https://twitter.com/search?q=%23marchforscience). Instead, I was finishing the modifications to my bike trailer.

![Solar Trailer with me](/assets/solar_trailer/solar_trailer.jpg)

This is a Burley Nomad trailer with 2 50 watt solar panels mounted on top. This feeds into an MPPT charge controller, that charges a 52V LiPO battery.

![Charging Battery Demo](/assets/solar_trailer/solar_trailer_charging.jpg)

This is an image of the front of the trailer charging my bike battery. Normally, the battery would be undernearth the charge controller, but it's sitting on a bucket for imaging purposes.

The wiring is pretty simple - the solar panels are strung in series, then plugged into the charge controller, which directly plugs into the charging port of the battery. The charge controller then pulls power from the panels and upconverts it to the necessary voltage to properly charge the battery. It's set to stop charging when the battery is 80% full, to maximize the lifetime of the battery.

I'm going to later plug a buck converter (dc to dc, downshifter) into the battery so that I can interface with a standard 12V power inverter and charge other battery-powered devices (such as my computer!).

##### Economics

This is far from even close to economically worth it. Not including the bike battery, this cost approximately $700 ($200 for the panels, $300 for the overpriced trailer, another $200 for other electronics). At [residential rates in CA](https://www.pge.com/tariffs/Res_170101-170228.xls) \(Excel document\), it costs between $0.10 and $0.07 per charge for my particular bike battery (0.6 KWh battery). At best, it'll be 7000 charge cycles before I recoup the cost. At the rate I recharge my bike battery (roughly once a week), this'll take 134 years to break even. Which means it won't.

However, it has been (and continues to be) a really fun project, which is all I really wanted.

Next weekend, I have plans to go bike camping with this setup, to actually test it in the field.