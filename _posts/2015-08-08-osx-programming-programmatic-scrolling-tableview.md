---
layout: post
title: OS X Programming - Programmatic scrolling tableviews
date: 2015-08-08
tags: swift, cocoa, appkit, osx, NSTableView, NSScrollView
---

This is the first in a series on OS X/AppKit programming for iOS devs. AppKit does not do as much for us out-of-the-box as UIKit does, to the point where, it seems to me, Interface Builder exists to hide a lot of AppKit's cruft. As someone who dislikes nibs/generated code on principle, I've been looking into how to use it programmatically.

These examples all use swift, though the objective-c version of the code isn't all that different.

For the tl;dr; version of this, just drop down to end for a complete code snippet.

There are two kinds of [TableViews](https://developer.apple.com/library/mac/documentation/Cocoa/Reference/ApplicationKit/Classes/NSTableView_Class/index.html) in AppKit - Cell-based, and View-Based. View-based tableviews are the new hotness, they're far more configurable and easier to use than Cell-based. However, View-Based tableViews are only available in OSX 10.7 or later, which makes Cell-Based the default. Telling AppKit to use the view-based mode is fairly non-intuitive (there is no property you have to set), but easy - you implement a specific delegate method (`-tableView:viewForTableColumn:row:`).

Additionally, there are (at least) two ways to provide data to an NSTableView: through delegate/datasource, and through cocoa bindings. This article is going to focus on delegate/datasource.

In UIKit, you can just `-new` up a tableView, set the delegate and datasource, implement those, and be on your way to a nice, scrolling, single-column tableview. In AppKit, if you do that, then your delegate will never get called - because the tableView doesn't have any columns. You need to first add an [NSTableColumn](https://developer.apple.com/library/mac/documentation/Cocoa/Reference/ApplicationKit/Classes/NSTableColumn_Class/index.html#//apple_ref/occ/cl/NSTableColumn) to the tableView. This is because, unlike iOS, NSTableViews can have more than one column.

So, something like:

```swift
let tableView = NSTableView()
tableView.addTableColumn(NSTableColumn())
tableView.setDelegate(self)
tableView.setDataSource(self)
```

For the delegate/datasource, there's two methods (one in each) you need to implement: [`-tableView:viewForTableColumn:row:`](https://developer.apple.com/library/mac/documentation/Cocoa/Reference/NSTableViewDelegate_Protocol/index.html#//apple_ref/occ/intfm/NSTableViewDelegate/tableView:viewForTableColumn:row:) in the [delegate](https://developer.apple.com/library/mac/documentation/Cocoa/Reference/NSTableViewDelegate_Protocol/index.html), and [`-numberOfRowsInTableView:`](https://developer.apple.com/library/mac/documentation/Cocoa/Reference/ApplicationKit/Protocols/NSTableDataSource_Protocol/index.html#//apple_ref/occ/intfm/NSTableViewDataSource/numberOfRowsInTableView:) in the [datasource](https://developer.apple.com/library/mac/documentation/Cocoa/Reference/ApplicationKit/Protocols/NSTableDataSource_Protocol/index.html). The first returns an `NSView?`, the second returns an `Int`.

```swift
// datasource
func numberOfRowsInTableView(tableView: NSTableView) -> Int {
    return data.count
}

// delegate
func tableView(tableView: NSTableView, viewForTableColumn tableColumn: NSTableColumn?, row: Int) -> NSView? {
    let textView = NSTextView()
    textView.string = data[row]
    return textView
}
```

###Scrolling

Now we have something! Just add it to an NSView and... it doesn't scroll. That's annoying.  
NSTableView, unlike UITableView, does not inherit from a ScrollView. You do not get scrolling behavior out of the box. Instead, what we must do, is place our tableView inside an [NSScrollView](https://developer.apple.com/library/mac/documentation/Cocoa/Reference/ApplicationKit/Classes/NSScrollView_Class/index.html#//apple_ref/occ/cl/NSScrollView), which is simple enough. Be sure to not call `-addSubview:` to add the tableView to the scrollView.

```swift
let scrollView = NSScrollView()
scrollView.hasVerticalScroller = true
scrollView.documentView = self.tableView
```
Then just add the scrollView to that NSView.

At this point, we're basically done. We have a scrolling view-based tableView. There is, however, one more thing we should do: reusing previously created views. This is essentially the same as the pre-iOS 6 [`-dequeueReusableCellWithIdentifier:`](https://developer.apple.com/library/ios/documentation/UIKit/Reference/UITableView_Class/index.html#//apple_ref/occ/instm/UITableView/dequeueReusableCellWithIdentifier:) method, without any class registration. Instead, what we want to call is [`-makeViewWithIdentifier:owner:`](https://developer.apple.com/library/mac/documentation/Cocoa/Reference/ApplicationKit/Classes/NSTableView_Class/index.html#//apple_ref/occ/instm/NSTableView/makeViewWithIdentifier:owner:) on the tableView, and, when it returns nil, create our own and return that.

So, modify `-tableView:viewForTableColumn:row:` to use this behavior:

```swift
func tableView(tableView: NSTableView, viewForTableColumn tableColumn: NSTableColumn?, row: Int) -> NSView? {
    var textView = tableView.makeViewWithIdentifier("textView", owner: self) as? NSTextView
    if textView == nil {
        textView = NSTextView()
        textView?.identifier = "textView"
    }
    textView?.string = self.data[text]
    return textView
}
```

Finally, if you're using autolayout (which you should), be sure to not enable autolayout for the tableView (though, please, use it for the scrollView).

###Recap

Note that I'm using the excellent [PureLayout](https://github.com/smileyborg/purelayout) library to help with autolayout.

```swift
import PureLayout_Mac

class TableController: NSObject {
    private var data = Array<String>()

    func configureView(view: NSView, data: [String]) {
        self.data = data
        let tableView = NSTableView()
        tableView.addTableColumn(NSTableColumn(identifier: "column"))
        tableView.setDelegate(self)
        tableView.setDataSource(self)

        let scrollView = NSScrollView(forAutoLayout: ())
        scrollView.hasVerticalScroller = true
        scrollView.documentView = self.tableView

        view.addSubview(scrollView)
        scrollView.autoPinEdgesToSuperviewEdges(NSEdgeInsetZero)
    }
}

extension TableController: NSTableViewDataSource {
    public func numberOfRowsInTableView(tableView: NSTableView) -> Int {
        return data.count
    }
}

extension TableController: NSTableViewDelegate {
    func tableView(tableView: NSTableView, viewForTableColumn tableColumn: NSTableColumn?, row: Int) -> NSView? {
        var textView = tableView.makeViewWithIdentifier("textView", owner: self) as? NSTextView
        if textView == nil {
            textView = NSTextView()
            textView?.identifier = "textView"
        }
        textView?.string = self.data[text]
        return textView
    }
}

```

####Reference:

- [NSTableView](https://developer.apple.com/library/mac/documentation/Cocoa/Reference/ApplicationKit/Classes/NSTableView_Class/index.html)
- [NSTableColumn](https://developer.apple.com/library/mac/documentation/Cocoa/Reference/ApplicationKit/Classes/NSTableColumn_Class/index.html#//apple_ref/occ/cl/NSTableColumn)
- [NSTableViewDelegate](https://developer.apple.com/library/mac/documentation/Cocoa/Reference/NSTableViewDelegate_Protocol/index.html)
- [NSTableViewDataSource](https://developer.apple.com/library/mac/documentation/Cocoa/Reference/ApplicationKit/Protocols/NSTableDataSource_Protocol/index.html)
- [NSScrollView](https://developer.apple.com/library/mac/documentation/Cocoa/Reference/ApplicationKit/Classes/NSScrollView_Class/index.html#//apple_ref/occ/cl/NSScrollView)

- [PureLayout](https://github.com/smileyborg/purelayout) (AutoLayout helper - works in OSX and iOS)

####Other posts in this series
1. [Programmatic Menu Buttons]({% post_url 2015-08-14-osx-programming-programmatic-menu-buttons %})
2. [Intro to Core Animation on OSX]({% post_url 2015-08-21-osx-programming-set-up-core-animation %})
