---
layout: post
title: OS X Programming - Setting up Core Animation
date: 2015-08-21
tags: swift, cocoa, appkit, osx, core, animation
---

[`NSViews`](https://developer.apple.com/library/mac/documentation/Cocoa/Reference/ApplicationKit/Classes/NSView_Class/index.html#//apple_ref/occ/cl/NSView), unless [`UIViews`](https://developer.apple.com/library/ios/documentation/UIKit/Reference/UIView_Class/index.html#//apple_ref/occ/cl/UIView), are not always backed by [`Core Animation layers`](https://developer.apple.com/library/mac/documentation/GraphicsImaging/Reference/CALayer_class/index.html). In fact, by default, they don't have anything to do with CALayers. You can optionally choose to make an NSView a layer-backed view, a layer-hosting view, or have nothing to do with them.

Other than that, CoreAnimation on OSX is the same as CoreAnimation on iOS. You don't even need to flip your coordinate system (as CoreAnimation on iOS uses bottom-left as the origin - which OSX uses by default).

Note that actually using Core Animation will be a future, more generic, article, this is just how to set it up with AppKit.

#### Layer-Backed

A layer-backed view means that the view delegates all the drawing to a `CALayer` that it manages. Setting one view to be layer-backed automatically sets all of it's subviews (and onwards) to be layer-backed. Additionally, if you want to directly do stuff to the layer, you need to set the [`wantsUpdateLayer`](https://developer.apple.com/library/mac/documentation/Cocoa/Reference/ApplicationKit/Classes/NSView_Class/index.html#//apple_ref/occ/instp/NSView/wantsUpdateLayer) property to `true`. `UIViews` behave like this by default.

Layer-Backed views are always more performant than views w/o layers. But, in general, you don't need to make all views layer-backed, only if you're feeling pain on that.

To set a view as layer-backed, you need to set the [`wantsLayer`](https://developer.apple.com/library/mac/documentation/Cocoa/Reference/ApplicationKit/Classes/NSView_Class/index.html#//apple_ref/occ/instp/NSView/wantsLayer) property to `true`, and not set the [`layer`](https://developer.apple.com/library/mac/documentation/Cocoa/Reference/ApplicationKit/Classes/NSView_Class/index.html#//apple_ref/occ/instp/NSView/layer) property.

In code:

```swift
let view = NSView()
view.wantsLayer = true // makes it layer-backed
view.wantsUpdateLayer = true // allows you to safely directly access the layer
assert(view.layer != nil, "this should always pass")
view.layer?.cornerRadius = 5
```

#### Layer-Hosting

The difference between a layer-backed view and a layer-hosting view is that the system manages the layer in a layer-backed view, whereas you must manage the layer for a layer-hosting view.

To create a layer-hosting view, set the `layer` property to a `CALayer`, then set the `wantsLayer` to `true`. In that order.

You would want to use the Layer-Hosting technique when you just want one view in a hierarchy to have a layer, but not all of them.

In code:

```swift
let view = NSView(frame: CGRectMake(0, 0, 10, 10)
let layer = CALayer()
view.layer = layer
view.wantsLayer = true

layer.bounds = view.bounds
layer.cornerRadius = 5
```


#### Reference
- [NSView](https://developer.apple.com/library/mac/documentation/Cocoa/Reference/ApplicationKit/Classes/NSView_Class/index.html#//apple_ref/occ/cl/NSView)
    - [wantsUpdateLayer](https://developer.apple.com/library/mac/documentation/Cocoa/Reference/ApplicationKit/Classes/NSView_Class/index.html#//apple_ref/occ/instp/NSView/wantsUpdateLayer) (property)
    - [wantsLayer](https://developer.apple.com/library/mac/documentation/Cocoa/Reference/ApplicationKit/Classes/NSView_Class/index.html#//apple_ref/occ/instp/NSView/wantsLayer)  (property)
    - [layer](https://developer.apple.com/library/mac/documentation/Cocoa/Reference/ApplicationKit/Classes/NSView_Class/index.html#//apple_ref/occ/instp/NSView/layer) (property)
- [UIView](https://developer.apple.com/library/ios/documentation/UIKit/Reference/UIView_Class/index.html#//apple_ref/occ/cl/UIView)
- [CALayer](https://developer.apple.com/library/mac/documentation/GraphicsImaging/Reference/CALayer_class/index.html)

#### Other posts in this series
1. [Programmatic Menu Buttons](/2015/08/14/osx-programming-programmatic-menu-buttons/)
2. [Programmatically creating a scrolling TableView](/2015/08/08/osx-programming-programmatic-scrolling-tableview/)
