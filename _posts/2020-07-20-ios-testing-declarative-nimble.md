---
layout: post
title: Unit Testing iOS - Declarative tests and custom Nimble matchers
date: 2020-07-20
tags: ios unit testing uikit nimble declarative testing
---

[Declarative programming](https://en.wikipedia.org/wiki/Declarative_programming) is quickly becoming the paradigm de jour. Especially with the rise of SwiftUI, it feels like hot new thing is to describe what your code does, and let the system figure out how to do it. This paradigm and mindset lends itself well to testing. For example, it's far easier to test that a sorting function correctly sorts than it is to test that the function sorts using a specific algorithm. Furthermore, declarative tests are also far easier to read, because they look more like documentation - describing what the system being tested does, without unnecessarily describing how it works.

The [last post](/2020/07/12/uikit-testing-controls/) introduced test helpers to let you test controls in declarative manner - instead of procedurally saying "set this value and then call the action handlers for the event", using those test helpers changes the interaction to a more declarative "behave as if the user had interacted with the control in this manner".

## Nimble Matchers

In addition to writing and using those declarative event emitters, you should also use declarative assertions or matchers. This can not only make the tests shorter, but also often reduce confusion. While you can write `XCTest`-based assertion helpers, I prefer to use [Nimble](https://github.com/quick/nimble) for all of my assertion helpers. Or, as Nimble calls them, matchers. I've found that the domain specific language Nimble provides not only reads better, but it also better separates what's being asserted on from what the expected value is, and it lends itself very well to writing your own matchers. A Nimble matcher is a function that allows you to describe the positive case (the values match), the negative case (they don't match), and any error cases all in one function. Matchers also allow you to provide structure for helpful error or failure messages for debugging why a test failed. This means that, not only can you write `expect(value).to(equal(sameValue))`, you can also reuse the same matcher for the negative case `expect(value).toNot(equal(otherValue))`.

## Checking that a View is Visible

To illustrate why declarative assertion handlers can be incredibly helpful, one of easiest ways to make a `UIView` invisible is to set the [`isHidden`](https://developer.apple.com/documentation/uikit/uiview) property to true. Then, when you want to verify under test that the view is now invisible, you'd write something akin to `XCTAssertTrue(view.isHidden)`. Similarly, for verifying that it's visible, you'd write `XCTAssertFalse(view.isHidden)`. This double negative would constantly trip me up. Eventually, I wrote a [Nimble](https://github.com/quick/nimble) matcher to fix that. [`beVisible(insideOf:)`](https://github.com/younata/UIKitNimbleMatchers/blob/master/Sources/UIKitMatchers/BeVisible.swift) originally took a `UIView` and verified whether the `isHidden` is set to the correct value. Here it is, re-implemented below.

```swift
import UIKit
import Nimble

func beVisible() -> Predicate<UIView> {
    // 1
    return Predicate.define("be visible") { (expression: Expression, msg: ExpectationMessage) -> PredicateResult in
        guard let received = try actualExpression.evaluate() else { // 2
            return PredicateResult(status: ExpectationStatus.fail, message: msg.appendedBeNilHint()) // 3
        }
        return PredicateResult(bool: received.isVisible == false, message: msg) // 4
    }
}
```

1. Nimble matchers return Predicates which are then called to determine if the matcher matched, didn't match, or fail. Nimble matchers have 3 states because of the way they are called: `expect(...).to(matcher())` passes when the matcher matches. `expect(...).toNot(matcher())` passes when the matcher does not match. The failure case will always fail regardless of using `to` or `toNot`. This case happn whenever some prerequisite fails (a common example, and also used here, is if the value being asserted on is nil).
    1. `Predicate.define` is a simple way to define a matcher with a default message. The matcher will fail if the value being asserted on is `nil` (which is also double-checked in (3)). Because of the fact that Nimble can call matchers repeatedly and asynchronously[^toEventually].
2. Because `expect()` in Nimble takes a throwable closure, the predicate closure can expect the expression to possibly throw upon being evaluated. This is useful when verifying that a particular API can throw, and is often used with the [`throwError`](https://github.com/Quick/Nimble/blob/c68b9987a28afde1287a770a2d0d97d9d709a5a5/Sources/Nimble/Matchers/ThrowError.swift#L46-L79) matcher, like so: `expect { throw someError }.to(throwError(someError))`
3. Predicate closures return a `PredicateResult`, which consists of an `ExpectationStatus` enum value and an `ExpectationMessage` enum value. Here, we're catching the state where the expression evaluated to nil, and adding a hint to the message that we detected nil, and to use a different matcher if the user actually expected the value to be nil.
4. `PredicateResult` also has a convenience initializer, which maps a `Bool` to a `PredicateStatus` where `true == PredicateStatus.matches` and `false == PredicateStatus.doesNotMatch`.

Later, I expanded on [`beVisible(insideOf:)`](https://github.com/younata/UIKitNimbleMatchers/blob/master/Sources/UIKitMatchers/BeVisible.swift) to check for other ways a view can be visible (or not) to the user. This was a massive win, as the confusing double negative was removed, the `beVisible(:)` matcher is shorter than `expect(view.isHidden).to(beTrue())`, and other ways a view can be hidden are also checked[^view-visibility].

## Not everything needs it's own matcher

Like all test helpers, your assertion helpers are additional code that must be maintained. You should err on the conservative side when adding them, and only add then when the benefits are outweighed by the costs. For example, you don't really need a custom matcher to verify a `UIView`'s frame. Using `expect(view.frame).to(equal(someFrame))` is just as useful as `expect(view).to(haveFrame(someFrame))`. My rule of thumb is only if the custom matcher improves comprehension or asserts on multiple different causes for the same behavior. Additionally, any Nimble matcher you write should make sense in both the positive and negative cases.

Additionally, your assertion helpers should have their own tests. This is a place where Nimble especially shines, as it provides the [`gatherExpectations(silently:closure:)`](https://github.com/Quick/Nimble/blob/c68b9987a28afde1287a770a2d0d97d9d709a5a5/Sources/Nimble/Adapters/AssertionRecorder.swift#L93-L107) function, which lets you verify what the result of a matcher is. I use this function pretty extensively [in the tests for my matchers](https://github.com/younata/UIKitNimbleMatchers/blob/master/Tests/UIKitMatchersTests/BeVisibleSpec.swift). As of this writing, I am unaware of a similar feature in XCTest.

Furthermore, writing your own matchers for declarative behavior is a leaky abstraction. For example, in the [`beVisible(insideOf:)`](https://github.com/younata/UIKitNimbleMatchers/blob/master/Sources/UIKitMatchers/BeVisible.swift) matcher I wrote of earlier, it's possible for the view you're asserting on to be occluded by another view. Additionally, it's possible for one of the views to be outside of a parent's bounds rect and said parent having [`clipsToBounds`](https://developer.apple.com/documentation/uikit/uiview/1622415-clipstobounds) set to true. Neither of these cases are accounted for, and there's likely other cases I'm not aware of that aren't accounted for. In another example, I wrote a matcher to verify that a pointer will change shape when hovered over a `UIView` or `UIButton` (see [Pointers (iPadOS) in the Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/ios/user-interaction/pointers/)). In writing this matcher, [`haveTheDefaultPointerInteraction()`](https://github.com/younata/UIKitNimbleMatchers/blob/master/Sources/UIKitMatchers/PointerInteractionMatchers.swift), I acknowledged that there's the possibility that you can give the view (or button) a [`UIPointerInteraction`](https://developer.apple.com/documentation/uikit/uipointerinteraction) with a [delegate](https://developer.apple.com/documentation/uikit/uipointerinteractiondelegate) that is implemented to behave like the default interaction (as if you had simply set `isPointerInteractionEnabled` on the button to `true` or given the view a `UIPointerInteraction` with no delegate). Instead of checking for that edge case, I decided not to cover it. Be aware of abstraction leaks and manually verify that your feature works.

Summing up, writing your tests in a declarative way makes the tests much easier to read and maintain. One very helpful way to do that is to write your own assertion helpers. Additionally, you should use Nimble to help write your assertions in an easy to read and declarative way. However, be wary of costs of writing your own assertion helpers. Your helpers should make your tests more clear without adding undue maintencance burden. If in doubt, test in the procedural way until you decide out if adding an assertion helper is worth the cost. Later posts will discuss other ways to write tests in an easy to read manner, specifically focusing on [Quick](https://github.com/quick/quick) and other BDD-style testing frameworks.

[^toEventually]: As I briefly mentioned in [testing animations](/2020/07/05/uikit-testing-animations/), Nimble also supports a polling-based asynchronous matcher. Effectively what happens is Nimble will spin the runloop for up to 1 second by default, pausing every 0.1 seconds (by default) to re-evaluating the matcher and see if it passes. Nimble will early exit if the matcher passes (not wait the entire second) before the total duration is up.

[^view-visibility]: Checking if the view is in an expected hierarchy, if the size is non-zero, and if the [`alpha`](https://developer.apple.com/documentation/uikit/uiview) property is non-zero.

