---
layout: post
title: Unit Testing UIKit - Controls
date: 2020-07-12
tags: ios unit testing uikit view control uicontrol
---

[In a previous post](/2020/06/28/uikit-testing-views/), I covered receiving input from [`UISwitch`](https://developer.apple.com/documentation/uikit/uiswitch)s. In this post, I will cover the other built-in [`UIControl`](https://developer.apple.com/documentation/uikit/uicontrol)s:

- [`UIButton`](https://developer.apple.com/documentation/uikit/uibutton)
- [`UIColorWell`](https://developer.apple.com/documentation/uikit/uicolorwell).
- [`UIDatePicker`](https://developer.apple.com/documentation/uikit/uidatepicker)
- [`UIPageControl`](https://developer.apple.com/documentation/uikit/uipagecontrol)
- [`UISegmentedControl`](https://developer.apple.com/documentation/uikit/uisegmentedcontrol)
- [`UISlider`](https://developer.apple.com/documentation/uikit/uislider)
- [`UIStepper`](https://developer.apple.com/documentation/uikit/uistepper)
- [`UISwitch`](https://developer.apple.com/documentation/uikit/uiswitch)
- [`UITextView`](https://developer.apple.com/documentation/uikit/uitextview)

For the most part, these are fairly simple: set the appropriate property, then call [`sendActions(for:)`](https://developer.apple.com/documentation/uikit/uicontrol/1618211-sendactions) with the appropriate event. While you can use [`UIControl.Event.primaryActionTriggered`](https://developer.apple.com/documentation/uikit/uicontrol/event/1618222-primaryactiontriggered), it'll only actually send the event if you had registered the target-action callback with `.primaryActionTriggered`. On the other hand, if you register your target-action callback with `.primaryActionTriggered` and call `sendActions(for:)` with proper event, then your callback will be called.

This post will cover the different helper methods I've written to help with this. The contents are also available in the github repository [UITestHelperKit](https://github.com/younata/UITestHelperKit/main/controls.swift). That repository also has a number of verifications to ensure that the user would actually be able to interact with the UI. For example, it doesn't make sense for a user to be able to interact with an invisible control, or a disabled control. Furthermore, when these verifications fail, a direct test failure is caused, with the specific reason: e.g. "Unable to tap button - disabled".

I've found these helpers incredibly useful as they allow me to cover not just the behavior of an event happening, but also that the target-action callback is properly hooked up. Additionally, it's easier to group up other concerns, to verify that it actually makes sense for the user to interact with the control in that manner. A minor, but very important additional benefit is that they're simply more concise than setting the value and calling `sendActions(for:)`.

# UIButton

There are a number of states that `UIButton` handles, but the "tap occured" event is `UIControl.Event.touchUpInside`.

```swift
extension UIButton {
    func tap() {
        self.sendActions(for: .touchUpInside)
    }
}
```

# UIColorWell

As with most new APIs, the event to send is undocumented. However, in my testing, `.valueChanged` is the correct event to send.

```swift
extension UIColorWell {
    func select(color: UIColor) {
        self.selectedColor = color
        self.sendActions(for: .valueChanged)
    }
}
```

# UIDatePicker

Per the [documentation](https://developer.apple.com/documentation/uikit/uidatepicker#2281465), `UIDatePicker` notifies for the `.valueChanged` event when the date is updated. This helper also no-ops if you try to select a date beyond the minimum or maximum date. You could have it clamp to those dates. Additionally, you could have it clamp or ignore at the `minuteInterval` value.

```swift
extension UIDatePicker {
    func select(date: Date) {
        if let maximumDate = self.maximumDate, date > maximumDate {
            return
        }
        if let minimumDate = self.minimumDate, date < minimumDate {
            return
        }
        self.date = date
        self.sendActions(for: .valueChanged)
    }
}
```

# UIPageControl

`UIPageControl` notifies upon the `.valueChanged` event. This helper also guards that you don't select a negative value  or beyond the `numberOfPages`.h

```swift
extension UIPageControl {
    func select(page: Int) {
        guard page >= 0 && page < self.numberOfPages else { return }
        self.currentPage = page
        self.sendActions(for: .valueChanged)
    }
}
```

# UISegmentedControl

This helper is similar to the helper for `UIPageControl`, which makes sense as both `UIPageControl` and `UISegmentedControl` behave like radio buttons in a way.

```swift
extension UISegmentedControl {
    func select(segmentIndex: Int) {
        guard segmentIndex >= 0 && segmentIndex < self.numberOfSegments else { return }
        self.selectedSegmentIndex = segmentIndex
        self.sendActions(for: .valueChanged)
    }
}
```

# UISlider

This doesn't handle smoothly sliding when `isContinuous` is true. I feel like you don't get too much value from testing that, and that simply verifying that `isContinuous` is true is good enough.

```swift
extension UISlider {
    func slide(to value: Float) {
        guard value >= self.minimumValue && value <= self.maximumValue else { return }
        self.value = value
        self.sendActions(for: .valueChanged)
    }
}
```

# UIStepper

As with the helper for UISlider, the UIStepper `step(to:)` helper won't handle `isContinous`, `autorepeat` nor `wraps`.

```swift
extension UIStepper {
    func step(to value: Double) {
        guard value >= self.minimumValue && value <= self.maximumValue else { return }
        guard (value - self.minimumValue).remainder(dividingBy: self.stepValue) == 0 else { return }
        self.value = value
        self.sendActions(for: .valueChanged)
    }
}
```

# UISwitch

As I [showed in a previous post](/2020/06/28/uikit-testing-views/), this is a simple helper to toggle the value of a `UISwitch`

```swift
extension UISwitch {
    func toggle() {
        self.isOn = !self.isOn
        self.sendActions(for: .valueChanged)
    }
}
```

# UITextField

Unlike most of the previous controls. There's behavior associated with both the delegate before we send the event. We should emulate that behavior as much as possible. From my testing, this emulates the behavior when a user actually types in a `UITextField`. Note that, unlike most of the other controls, `UITextField` does not notify when the `.valueChanged` event occurs. But rather, on the `.editingChanged`.

There are many ways to write helpers for `UITextField`. This example acts as if the user had selected the text in the textField and then pastes in to it.

```swift
extension UITextField {
    func replace(text: String) {
        let range = NSRange(location: 0, length: self.text?.count ?? 0)
        if self.delegate?.textField?(self, shouldChangeCharactersIn: range, replacementString: text) != false {
            self.text = text 
            self.sendActions(for: .editingChanged)
        }
    }
}
```

# Wrapping Up

This should cover the default controls in UIKit. Other input methods - accessibility actions, gesture recognizers, cursor, key commands, raw touch input - will be covered later. Please check out [UITestHelperKit on github](https://github.com/younata/UITestHelperKit/main/controls.swift), and let me know what you think of that and this post. I'd love to see more people interested in unit testing their apps.
