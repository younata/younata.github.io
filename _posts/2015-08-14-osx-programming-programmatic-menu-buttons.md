---
layout: post
title: OS X Programming - Programmatic Menu Buttons
date: 2015-08-14
tags: swift, cocoa, appkit, osx, NSMenu, NSMenuItem, menubar, menuitem, programmatic
---

This is the second in a series on OS X programming without nibs.

Menus are used throughout AppKit. In addition to the global menubar, they're also used in the StatusBar (on the right side of the menubar), secondary clicking (right-click or two-finger click) on a view, and secondary clicking on an app's icon in the dock.

####Secondary Clicking a View

The [default implementation of `-rightMouseDown:`](https://developer.apple.com/library/mac/documentation/Cocoa/Reference/ApplicationKit/Classes/NSView_Class/index.html#//apple_ref/occ/instm/NSView/rightMouseDown:) calls [`-menuForEvent:`](https://developer.apple.com/library/mac/documentation/Cocoa/Reference/ApplicationKit/Classes/NSView_Class/index.html#//apple_ref/occ/instm/NSView/menuForEvent:) to display a menu.

A sample implementation to display a menu upon secondary clicking looks like:

```swift
class MyView: NSView {
    override func menuForEvent(event: NSEvent) -> NSMenu? {
        let menu = NSMenu(title: "")
        let menuItem = NSMenuItem(title: "hello", action: "didSelectMenuItem:", keyEquivalent: "")
        menuItem.target = self
        menu.addItem(menuItem)

        return menu
    }

    func didSelectMenuItem(menuItem: NSMenuItem) {
        print("Selected menu item \(menuItem)")
    }
}
```

In addition to creating an [`NSMenuItem`](https://developer.apple.com/library/mac/documentation/Cocoa/Reference/ApplicationKit/Classes/NSMenuItem_Class/index.html#//apple_ref/doc/c_ref/NSMenuItem) through [`-initWithTitle:action:keyEquivalent:`](https://developer.apple.com/library/mac/documentation/Cocoa/Reference/ApplicationKit/Classes/NSMenuItem_Class/index.html#//apple_ref/occ/instm/NSMenuItem/initWithTitle:action:keyEquivalent:), you can also use [`NSMenu's`](https://developer.apple.com/library/mac/documentation/Cocoa/Reference/ApplicationKit/Classes/NSMenu_Class/index.html#//apple_ref/doc/c_ref/NSMenu) [`-addItemWithTitle:action:keyEquivalent:`](https://developer.apple.com/library/mac/documentation/Cocoa/Reference/ApplicationKit/Classes/NSMenu_Class/index.html#//apple_ref/occ/instm/NSMenu/insertItemWithTitle:action:keyEquivalent:atIndex:), which returns an `NSMenuItem` (meaning, all you have to do is set the menuItem's `target` property).

####The Dock Menu

Similar to creating a menu in response to secondary clicking a view, the AppDelegate will get called if you secondary click on the dock icon. The particular message that gets sent is [`-applicationDockMenu:`](https://developer.apple.com/library/mac/documentation/Cocoa/Reference/NSApplicationDelegate_Protocol/index.html). A sample implementation would look like:

```swift
import Cocoa
@NSApplicationMain
public class AppDelegate: NSObject, NSApplicationDelegate {
    func applicationDockMenu(sender: NSApplication) -> NSMenu? {
        let menu = NSMenu(title: "")
        let clickMe = menu.addItemWithTitle("ClickMe", action: "didSelectClickMe", keyEquivalent: "C")
        clickMe.target = self

        return menu
    }

    func didSelectClickMe() {
        print("didSelectClickMe")
    }
}
```

####The Global Menu

The Global Menu is accessed through [`NSApplication's`](https://developer.apple.com/library/mac/documentation/Cocoa/Reference/ApplicationKit/Classes/NSApplication_Class/index.html) `mainMenu` property, which returns an optional `NSMenu`. You can use this to add your own custom menu.

There are quite a few gotcha's to adding things to the global menu. First is that every `NSMenuItem` and `NSMenu` you add needs to have the `title` property set, otherwise they won't be visible. Second, all the parent MenuItems of a given `NSMenuItem` need to be enabled in order for that MenuItem to be enabled. This means that every `NSMenuItem` you add needs to have an action selector that, either the MenuItem's target responds to (if it has a target), or an object in the responder chain responds to (if the MenuItem does not have a target).

This basically means you can't just use a blank or nil selector even for a MenuItem that serves as a section (e.g. the `File` section in the menu).

Some sample code that adds a section to the Main Menu bar:

```swift
import Cocoa
@NSApplicationMain
public class AppDelegate: NSObject, NSApplicationDelegate {
    func applicationDidFinishLaunching(aNotification: NSNotification) {
        guard let menu = NSApp.mainMenu else {
            return
        }
        let menuItem = menu.addItemWithTitle("MySection", action: "didSelectMySection", keyEquivalent: "")
        menuItem.target = self
        let submenu = NSMenu(title: "MySection")
        menuItem.submenu = submenu

        let clickMe = submenu.addItemWithTitle("ClickMe", action: "didSelectClickMe", keyEquivalent: "C")
        clickMe.target = self
    }

    func didSelectMySection() {
        print("this will never be called")
    }

    func didSelectClickMe() {
        print("didSelectClickMe")
    }
}
```

####Status Bar

[`NSStatusBar`](https://developer.apple.com/library/mac/documentation/Cocoa/Reference/ApplicationKit/Classes/NSStatusBar_Class/index.html) is used to represent the list of icons you see at the top-right on the global menu (spotlight, bluetooth, calendar, etc.). You get an `NSStatusBar` instance by sending [`+systemStatusBar`](https://developer.apple.com/library/mac/documentation/Cocoa/Reference/ApplicationKit/Classes/NSStatusBar_Class/index.html#//apple_ref/occ/clm/NSStatusBar/systemStatusBar) to `NSStatusBar`. You can get an [`NSStatusItem`](https://developer.apple.com/library/mac/documentation/Cocoa/Reference/ApplicationKit/Classes/NSStatusItem_Class/index.html#//apple_ref/doc/c_ref/NSStatusItem) (which represents your own little icon in that list) by sending [`-statusItemWithLength:`](https://developer.apple.com/library/mac/documentation/Cocoa/Reference/ApplicationKit/Classes/NSStatusBar_Class/index.html#//apple_ref/occ/instm/NSStatusBar/statusItemWithLength:), and passing in a `CGFloat`. As of OSX 10.10, everything but the `length`, `statusBar`, and `menu` properties are deprecated, so use an `NSMenu` object to configure your statusItem.

Some sample code that configures an `NSStatusBar` with a single menu item:

```swift
import Cocoa
@NSApplicationMain
public class AppDelegate: NSObject, NSApplicationDelegate {
    func applicationDidFinishLaunching(aNotification: NSNotification) {
        let statusItem = NSStatusBar.systemStatusBar().statusItemWithLength(40)

        let menu = NSMenu(title: "Hi")
        statusItem.menu = menu

        let clickMe = menu.addItemWithTitle("ClickMe", action: "didSelectClickMe", keyEquivalent: "C")
        clickMe.target = self        
    }

    func didSelectClickMe() {
        print("didSelectClickMe")
    }
}
```

This is useful for creating an app that lives in the menu bar, but you'll still have the app icon living in the dock. To change that, you need to set the `LSUIElement` key to `true` in your `info.plist` file.

---

####Separators

You can get a separator (greyed-out solid line in the menu) by sending [`+separatorItem`](https://developer.apple.com/library/mac/documentation/Cocoa/Reference/ApplicationKit/Classes/NSMenuItem_Class/index.html#//apple_ref/occ/clm/NSMenuItem/separatorItem) to `NSMenuItem`, and treat this like any other MenuItem. You cannot add submenus to this item (it's disabled, nothing will ever show, so there's no point).

####Key Equivalents/Shortcuts

[`NSMenuItems`](https://developer.apple.com/library/mac/documentation/Cocoa/Reference/ApplicationKit/Classes/NSMenuItem_Class/index.html#//apple_ref/doc/c_ref/NSMenuItem) have a [`keyEquivalent`](https://developer.apple.com/library/mac/documentation/Cocoa/Reference/ApplicationKit/Classes/NSMenuItem_Class/index.html#//apple_ref/occ/instm/NSMenuItem/setKeyEquivalent:) property, which is used for keyboard shortcuts. Setting this allows the user to use cmd+(key) as a shortcut to perform that action. For example, setting `D` as a keyEquivalent means I have to hit `cmd+shift+d` to use that. You can also set the [`keyEquivalentMask`](https://developer.apple.com/library/mac/documentation/Cocoa/Reference/ApplicationKit/Classes/NSMenuItem_Class/index.html#//apple_ref/occ/instm/NSMenuItem/setKeyEquivalentModifierMask:) property to allow more modifiers (e.g. opt, or to unset cmd)

####Conditionally Disabling a MenuItem

Sometimes, you want to conditionally disable a Menuitem. For example, if you have an action to go to next item in a list, then it makes no sense to have that enabled if you're already at the end of the list. Thankfully, there's an informal protocol that you can conform to in order to lazily disable a menuitem. [`NSMenuValidation`](https://developer.apple.com/library/mac/documentation/Cocoa/Reference/ApplicationKit/Protocols/NSMenuValidation_Protocol/index.html) is the informal protocol that MenuItem's target (doesn't search the responder chain) can conform to in order to lazily disable a menuItem. Implement [`-validateMenuItem:`](https://developer.apple.com/library/mac/documentation/Cocoa/Reference/ApplicationKit/Protocols/NSMenuValidation_Protocol/index.html#//apple_ref/occ/instm/NSObject/validateMenuItem:) and return true if you want the item to be enabled, and false to disable it. This is only called when a menu is about to be displayed.

---

####Reference
- [NSMenu](https://developer.apple.com/library/mac/documentation/Cocoa/Reference/ApplicationKit/Classes/NSMenu_Class/index.html#//apple_ref/doc/c_ref/NSMenu)
- [NSMenuItem](https://developer.apple.com/library/mac/documentation/Cocoa/Reference/ApplicationKit/Classes/NSMenuItem_Class/index.html#//apple_ref/doc/c_ref/NSMenuItem)
- [NSView](https://developer.apple.com/library/mac/documentation/Cocoa/Reference/ApplicationKit/Classes/NSView_Class/index.html#//apple_ref/occ/instm/NSView)
- [NSStatusBar](https://developer.apple.com/library/mac/documentation/Cocoa/Reference/ApplicationKit/Classes/NSStatusBar_Class/index.html)
- [NSStatusItem](https://developer.apple.com/library/mac/documentation/Cocoa/Reference/ApplicationKit/Classes/NSStatusItem_Class/index.html#//apple_ref/doc/c_ref/NSStatusItem)
- [NSMenuValidation](https://developer.apple.com/library/mac/documentation/Cocoa/Reference/ApplicationKit/Protocols/NSMenuValidation_Protocol/index.html)

####Other posts in this series
1. [Programmatically creating a scrolling TableView](/2015/08/08/osx-programming-programmatic-scrolling-tableview/)
