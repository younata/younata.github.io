---
layout: post
title: Muon - RSS/Atom Parser in Swift
date: 2015-07-21
tags: ios, swift, rss, atom, muon
---

[Muon](https://github.com/younata/muon) is an RSS/Atom parser I wrote for use in [rNews](https://github.com/younata/rssclient). It came about out of frustration with [mwfeedparser](https://github.com/mwaterfall/mwfeedparser), which, prior to Muon, was the only open source feed parser I could find for ios/osx. Muon is entirely test-driven (I have a couple examples of standards-complient rss 1.0, rss 2.0, and atom feeds, as well as a couple feeds that I knew mwfeedparser choked on - such as the feed for Apple's [ResearchKit](https://github.com/researchkit/researchkit) - which, despite claiming that it's an atom feed in the metadata, is actually an rss 2.0 feed).

Muon is written as an NSOperation subclass, which fit my usecase in rNews of parsing feeds entirely in the background (keeps the app from locking up when you have to parse several 100 item feeds). You simply give it a string representation of the feed to parse, and stick it in an operation queue, or simply call `main()` on it.

So, a sample usecase looks like:

```swift
let feedParser = Muon.FeedParser(string: feedAsString)
feedParser.success {feed: Muon.Feed in print("Feed: \(feed)")}
feedParser.error {error: NSError in print("Error: \(error)")}
// to asynchronously parse:
operationQueue.addOperation(feedParser)
// to synchronously parse:
feedParser.main()
```

Muon can be installed with Carthage (`github "younata/Muon"`) or Cocoapods (though it's not yet in the main trunk). I prefer Carthage to Cocoapods.
