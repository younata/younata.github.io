---
layout: post
title: Unit Testing UIKit - Animations and Transitions
date: 2020-07-05
tags: ios unit testing uikit view controller
---

[Earlier](/2020/06/28/uikit-testing-views/) I covered simple interactions between `UIView`s and a model. Today, I want to cover standard `UIViewController` transitions - presenting, pushing, popovers and the like. Testing custom transitions will be a separate article. I'm also going to cover `UIView` animations. I'm going to first show you how to directly test the results of these animations and transitions. Then I'm going to show some of the downsides to that, and how to get around them and the tradeoffs of indirectly animating or transitioning views or view controllers.

# Animations

Without resulting to swizzling, there is no way to directly have tests control when, how, and how long each animation takes. By which I mean, if I have the following code:

```swift
UIView.animate(withDuration: 0.2) {
    myView.frame = newFrame
} completion: { didComplete in
    myView.frame = differentFrame
}
```

There's no real way for me to verify that `myView`'s `frame` was changed to `newFrame`. Then, once the animation ended, that `myView.frame` was changed to `differentFrame`. The best you can do is assert that `myView.frame` is eventually equal to `differentFrame`. When directly testing animations, there's really only one way to do that: Spin the runloop until the expected value has been set. To do that, you might end up writing a test like the following for the above code:

```swift
func testAnimatesToFrame() {
    let subject = MyObject()
    subject.performAnimation()
    
    let start = Date()
    let maximumTime: TimeInterval = 5 // seconds
    let pollPeriod: TimeInterval = 0.01 // seconds
    while subject.myView.frame != differentFrame {
        guard Date.timeIntervalSince(start) < maximumTime else {
            XCTFail("Expected \(subject.myView.frame) to eventually equal \(differentFrame)")
            return
        }
        RunLoop.main.run(until: Date(timeIntervalSinceNow: pollPeriod))
    }
    
}
```

You might even abstract that polling checker to a shared helper function. Or, you could replace that and use [Nimble's](https://github.com/quick/nimble/)'s [`toEventually`](https://github.com/quick/nimble/#asynchronous-expectations) connector to get something better. Which is just one of the many benefits Nimble provides. Using Nimble, this behavior would be tested as:

```swift
func testAnimatesToFrame() {
    // setup
    expect(subject.myView.frame).toEventually(equal(differentFrame))
}
```

Again, this does nothing to verify the intermediate steps. For that, you'd have to swizzle `UIView.animate(withDuration:animation:completion:)` in a way that lets you call the `animation` and `completion` blocks on your own. That's a topic for a future post. We can also indirectly animate view, and then we can test all parts of that. This'll be shown later in this post. But, at least we can verify that the object ends up in the correct state.

This brings us to the next part, verifying showing a View Controller.

# View Controller Transitions

With all that we've covered so far, it's not that much of a stretch to assume the following test would pass:

```swift
func testPresentsAViewController() {
    let subject = UIViewController()
    let other = UIViewController()

    subject.show(other, sender: nil)
    expect(subject.presentedViewController).toEventually(equal(other))
}
```

After all, it's just an animation that automatically sets a property after the fact. Unfortunately, that's not the case. UIKit doesn't perform view controller transitions when they're not in a key window. Which means that you have to place the root view controller of the hierarchy in a window:

```swift
func testPresentsAViewController() {
    let subject = UIViewController()
    let other = UIViewController()

    let window = UIWindow(frame: UIScreen.main.bounds)

    window.rootViewController = subject
    window.makeKeyAndVisible()

    subject.show(other, sender: nil)
    expect(subject.presentedViewController).toEventually(equal(other))
}
```

Which is enough to get `testPresentsAViewController` to work. This strategy will also work for more than just modally presented views.

## Navigation hierarchies

This is how you might verify that a View Controller (`other`) is pushed on top of the navigation stack.

```swift
func testNavigationHierarchy() {
    let subject = UIViewController()
    let other = UIViewController()
    let navigationController = UINavigationController(rootViewController: subject)

    let window = UIWindow(frame: UIScreen.main.bounds)

    window.rootViewController = navigationController
    window.makeKeyAndVisible()

    subject.show(other, sender: nil)
    expect(navigationController.topViewController).toEventually(equal(other))
}
```

## Split Views

This is how you might verify that a View Controller (`other`) is shown as the secondary view controller in a two-column `UISplitViewController`.

```swift
func testSplitViews() {
    let subject = UIViewController()
    let other = UIViewController()
    let splitView = UISplitViewController()
    splitView.viewControllers = [subject]

    let window = UIWindow(frame: UIScreen.main.bounds)

    window.rootViewController = splitView
    window.makeKeyAndVisible()

    subject.showDetailViewController(other, sender: nil)
    expect(splitView.viewControllers).toEventually(equal([subject, other]))
}
```

# Avoiding the Test Duration Penalty

One of the downsides of this approach is that it will massively increase the time it takes for your tests to run. Instead of taking a few milliseconds to verify that a property was set, now the tests has to wait the quarter second or so for the animation or transition to complete. If this transition is at the beginning of a branch of tests, then each test has to wait for that transition to complete before it can verify the other behaviors it's intended to check. When I write code, I stay in a very tight "write test, run test, fix test" loop. Any increase in the time it takes to run tests will dramatically reduce my productivity. On the other hand, without resorting to swizzling out a lot of UIKit, there's no way to directly make these animations and transitions run instantly.

The key to resolve that is to indirectly transition the view controllers. Instead of directly calling `myViewController.show`, you use an intermediary to do so. This intermediary can then behave differently under test vs. in production in a way that you can control.

The way to do this is to inject a "`ControllerPresenter`" instance. This is a protocol that provides methods for presenting view controllers, and the default implementation just calls the correct methods on `UIViewController`. For example:

```swift
protocol ControllerPresenter {
    func present(detail: UIViewController, from: UIViewController)
    func present(popover: UIViewController, from: UIViewController, configure: (UIPopoverPresentationController) -> Void)
    func present(navigation: UIViewController, from: UIViewController)
    func present(default: UIViewController, from: UIViewController)
}

struct UIKitControllerPresenter: ControllerPresenter {
    func present(detail: UIViewController, from: UIViewController) {
        from.showDetailViewController(detail, sender: nil)
    }

    func present(popover: UIViewController, from: UIViewController, configure: (UIPopoverPresentationController) -> Void) {
        popover.modalPresentationStyle = .popover
        if let popoverController = popover.popoverPresentationController {
            configure(popoverController)
        }
        from.show(popover, sender: nil)
    }

    func present(navigation: UIViewController, from: UIViewController) {
        guard from.navigationController != nil else { return }
        from.show(navigation, sender: nil)
    }

    func present(default: UIViewController, from: UIViewController) {
        from.show(navigation, sender: nil) // Does whatever is the default
    }
}
```

A `ControllerPresenter` would then be injected in to your `UIViewController` (or whatever will be doing the presenting), and will be used to present a view controller. Like so:

```swift
class MyViewController: UIViewController {
    let presenter: ControllerPresenter

    init(presenter: ControllerPresenter) {
        self.presenter = presenter
        // rest of init
    }

    func showTheDetail(viewController: UIViewController) {
        presenter.present(detail: viewController, from: self) // a very contrived example.
    }
}
```

And in test, you'd pass in and use a `FakeControllerPresenter, which might look like so:

```swift
class FakeControllerPresenter: ControllerPresenter {
    private(set) var presentDetailCalls: [(detail: UIViewController, from: UIViewController)] = []
    func present(detail: UIViewController, from: UIViewController) {
        presentDetailCalls.append((detail, from))
    }

    // rest of the implementation follows this pattern of recording the arguments and doing not much else.
}
```

And thus your test would examine the state of `FakeControllerPresenter` afterwards:

```swift
func testDetailPresentation() {
    let presenter = FakeControllerPresenter()
    let subject = MyViewController(presenter: presenter)

    let other = UIViewController()
    subject.showTheDetail(viewController: other)
    expect(presenter.presentDetailCalls).to(haveCount(1))
    expect(presenter.presentDetailCalls.detail).to(equal(other))
    expect(presenter.presentDetailCalls.from).to(equal(subject))
}
```

Again, this works, is super fast and robust (doesn't wait for transitions, because they're not happening). However, the downside is that your implementation can no longer trust the properties that are set after/before view controller transitions. On the plus side, you do end up with a much more declarative way to perform view controller transitions.

This pattern of wrapping hard-to-test behavior behind a protocol is a common pattern and I will use it again whenever Apple's frameworks prove difficult to work with.

It's also important to note that, if you do write a `ControllerPresenter`, you should make sure that the actual implementation (in this example, the `UIKitControllerPresenter`) works as expected. This should use the direct methods. It's acceptable for this to be slow because you're walling away the slow behavior in one place. Ideally, you won't add more than a few seconds to the total runtime of your tests, and in doing so, you're likely to save minutes off of having your tests directly invoke view controller transitions.

# Wrapping up

I've covered how to test animations, how to test view controller transitions, and how to write your code in such a way that you avoid the penalties for directly calling the view controller transition methods. Hopefully this is a good starting point for how to architect and test larger interactions between your app. Please let me know if you have any thoughts, I'd love to hear if other people are applying this approach!

