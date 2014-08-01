---
layout: post
title: "HomeKit Basics"
date: 2014-07-31
tags: homekit
---

For the unitiated: [Homekit](https://developer.apple.com/homekit/) is Apple's framework for home automation, available in iOS 8.0.

I've been [playing](https://github.com/younata/Apartment/commit/bc818a5d66159492f3df43d873af4fba635ec17a) with HomeKit since it was announced. Currently, Apartment exists as a very rudimentary homekit client - you can create and view/configure homes, you can discover and add new accessories to a home, and you can view and edit the values for the characteristics in named services of all configured accessories in all configured rooms.

HomeKit is one of the better documented new frameworks for iOS, but it's still sparse and not up to date (... seriously). There's a [framework reference](https://developer.apple.com/library/prerelease/ios/documentation/HomeKit/Reference/HomeKit_Framework/index.html), and the [wwdc video](https://developer.apple.com/videos/wwdc/2014/?id=213). That's pretty much it.

Go watch the wwdc video, it's probably the single best reference for HomeKit at the moment.

Don't call homekit methods from the background
---

By the way, and this is mentioned in the video, but don't try to call homekit methods when your app is running in the background. The system will kill your app. I think this is dumb, because one of the things I want to do is tell my app "have a coffee ready by the time I get home", which would track my location to attempt to figure out when I'd get home, and when to start brewing that coffee. It would save so much battery power to not have to have the app in the foreground (screen on and sucking up that sweet, sweet power), but no... (I could add a local notification to open the app to execute the action, but that's a poor user experience).

Entitlements
---
This isn't documented at all.

In xcode 6 betas 1-3, you didn't need to have any special capabilities to use homekit. Beta 4 changed this. You need to have the homekit entitlement added to both your entitlements file and your app ID. (Just go to your target settings->Capabilities, and turn on  HomeKit).


Homes
---

[HMHome](https://developer.apple.com/library/prerelease/ios/documentation/HomeKit/Reference/HMHome_Class/index.html) is the main class in HomeKit, it manages the rooms, accessories, zones (groups of rooms), services (offered by an accessorie), and actions (... not actually defined, but a subclass, HMCharacteristicWriteAction is about changing a value in a characteristic (of a service)).

Rooms
---
[Rooms](https://developer.apple.com/library/prerelease/ios/documentation/HomeKit/Reference/HMRoom_Class/index.html) are logical arrangements of Accessories (e.g. kitchen, living room, foyer, etc.), they have a name and a list of accessories. You add accessories (move them to that room) via HMHome's assignAccessory:toRoom:completionHandler: method.

Zones
---
[Zones](https://developer.apple.com/library/prerelease/ios/documentation/HomeKit/Reference/HMZone_Class/index.html) are logical arrangements of Rooms (e.g. downstairs), they have a name and a list of rooms. You can add a room to a zone with HMZone's addRoom:completionHandler: method. Similarly, removeRoom:completionHandler: will remove a room from a zone. Room -> Zone is not 1:1 (that is, a Room can be in several zones at once).

Accessories
---
[Accessories](https://developer.apple.com/library/prerelease/ios/documentation/HomeKit/Reference/HMAccessory_Class/index.html) are objects representing physical devices which communicate with homekit, either directly or through another accessory acting as a bridge between homekit and the not-homekit accessory. I have no idea how this works, but I would love to get a Nest to work with homekit through clever usages of bridges.

Services
---
[Services](https://developer.apple.com/library/prerelease/ios/documentation/HomeKit/Reference/HMService_Class/index.html) are provided by accessories. For example, a coffee machine accessory, might provide a "coffee" service.

Services may or may not be named. For example, an update firmware service will not be named. Apple tells you not to present un-named services to the user.

In the homekit accessory simulator, there typically will be two services for an accessory - one for the actual functionality provided by the accessory, and another for manufacturer information (accessory name, manufacturer name, model, serial number, etc. this also tends to be where the "identify" characterestic resides).

Characteristics
---
[Characteristics](https://developer.apple.com/library/prerelease/ios/documentation/HomeKit/Reference/HMCharacteristic_Class/index.html) are individual parts of a Service. For example, the previously mentioned coffee machine "coffee" service might have a name characteristic, a manufacturer characteristic, model, etc. Less generically, it could also have a toggle-able power state service, a brewing state service (brewing, not brewing, how long has it been brewing, estimated time remaining), an estimate of the amount of coffee in the pot (and you could script this, for example, brew another pot when the amount gets below 25% full).

Characteristics can be read-only, read-write, write-only, and you can register to be notified of changes to certain readable characteristics (register to be notified when the pot is done brewing, for example). Write-only characteristics are things where, you don't care if it succeeds, you just want it to work (the canonical example is an "identify" characteristic, write to it to tell the accessory to "identify" itself somehow - blinking a light, or whatever, which is good for doing the initial setup when you have multiple accessories sharing the same name).

ServiceGroups
---
[ServiceGroups](https://developer.apple.com/library/prerelease/ios/documentation/HomeKit/Reference/HMServiceGroup_Class/index.html) are groups (surprise!) of services. Service Groups and Action Sets are both conveniances to group services and actions unders one object.

Actions
---
[There no public documentation for HMAction](https://developer.apple.com/library/prerelease/ios/documentation/HomeKit/Reference/HMAction_Class/index.html). It's a subclass of NSObject, with nothing else added.

No, seriously, look at the .h (accurate as of xcode 6, beta 4)

{% highlight objc %}
//  HMAction.h
//  HomeKit
//
//  Copyright (c) 2014 Apple Inc. All rights reserved.

#import <Foundation/Foundation.h>

/*!
 * @brief This class is used to represent a generic action.
 */
NS_CLASS_AVAILABLE_IOS(8_0)
@interface HMAction : NSObject

@end
{% endhighlight %}

This looks, to me, as if Apple was going to do something with HMAction, then decided to just do something with [HMCharacteristicWriteAction](https://developer.apple.com/library/prerelease/ios/documentation/HomeKit/Reference/HMCharacteristicWriteAction_Class/index.html), which seems to be actually useful (change the value of a characteristic to X whenever it's executed, the system supposedly figures out when it's valid whenever the characteristic value is !X, also if the characteristic is even writeable, though I would imagine it would error/return nil if you try to create one using an unwriteable characteristic).

Action Sets
---
[Action sets](https://developer.apple.com/library/prerelease/ios/documentation/HomeKit/Reference/HMActionSet_Class/index.html) are sets of actions. Unlike everything else in homekit, what they contain is represented as a set. Meaning unordered. Meaning if you want to display these in an ordered manner (like, say... a tableview, or literally anything because you don't want A and B to accidentally get switched when you reload that view). By the way, actions don't have a name property (HMCharacteristicWriteAction does), so... good luck have a meaningful comparison operation (You can compare based on their memory address, that's it).

Anyway, action sets use a set internally because they don't want you to accidentally think that they get executed in any order. It's a good technical decision, it's just a pain in the ass from a UI perspective.

By the way, there's absolutely no documentation for actually executing an action set. I ASSUME this is handled in HMTrigger, but there's no public documentation for telling a trigger "hey, this is valid to execute now".

Trigger
---
[Triggers](https://developer.apple.com/library/prerelease/ios/documentation/HomeKit/Reference/HMTrigger_Class/index.html) _should_ be automated things which trigger (hey!) an action or action set.

A trigger basically has a name and an array of actionsets. There's a subclass for triggering an actionset based on time (every day at 7 am, turn on the lights, coffee machine, etc.), but there's nothing for say... geofencing (turn off the lights, etc. whenever I leave the house), with no public documentation for how to do that. (By which I mean, there's no method on HMAction or HMActionSet to "execute when next able", which means that you can't really subclass HMTrigger to create your own trigger class)

[HMTimerTrigger](https://developer.apple.com/library/prerelease/ios/documentation/HomeKit/Reference/HMTimerTrigger_Class/index.html) is the more useful subclass, where you tell it to execute on a certain date, and to repeat at NSDateComponents interval, on a given calendar. You can even set/update the time zone to interpret a given time as (which is better than using the phone's time zone, because the phone and the home can be in different time zones. People do travel, after all :D)

---

I don't even __like__ coffee.