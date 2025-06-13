---
layout: post
title: Advanced Swift Testing - SwiftUI & Swift Concurrency
date: 2025-06-12
tags: swift, tdd, testing, swiftui, swift concurrency, async, await, swift fakes, fakes, quick, nimble
---

<div class="aside">
<b>Note</b>
<br />
This post is the contents of a talk I gave at [One More Thing 2024](https://omt-conf.com/wwdc24/). While that talk was recorded, the video has not been edited. This post is essentially an edited form of my speaker notes. This talk was written after Swift Testing was announced, but before it was integrated with xcode. At the time, Swift Testing was still very new, a bit difficult to use outside of a swift package, and I wasn't familiar with it at all - which is why it's not mentioned at all.
</div>

~~Today~~ In this post, I broadly want to cover 3 things:

First, I’ll go over some testing theory. I’ll cover practices and techniques to make writing tests easier, which we’ll be using throughout this post.

Second, I’ll focus on writing tests for APIs using Swift Concurrency. How to work with dependencies that use swift concurrency, some of the potential pitfalls and how to avoid them.

Lastly, I’ll cover writing tests for SwiftUI views. Specifically, I’ll go over 2 complementary ways to write fast, meaningful tests for a View.

## Assumed Knowledge

Before we go into the theory, let’s cover some basic assumptions I’ve made for what you know.

First, is that you have a basic familiarity with XCTest and how to write tests with it. This is a talk about testing, after all. Apple has some great documents for how to get started.

- [Defining Test Cases and Test Methods - XCTest - Apple](https://developer.apple.com/documentation/xctest/defining_test_cases_and_test_methods)

Second is that you are familiar with Swift Concurrency - the async/await feature in Swift. You don’t need to be an expert, but you will get a lot more out of this talk if you’re familiar with Swift Concurrency and some of the differences between using Swift Concurrency and other asynchronous mechanisms like callbacks or combine Futures. At the very least, go check out Meet async/await in Swift from WWDC 2021. You’ll also get a lot out of Swift concurrency: Behind the scenes also from WWDC 2021. Those will give you the basics, but go check out the talks from WWDC 2024 and later for safely using Swift Concurrency.

- [Meet async/await in Swift - WWDC21](https://developer.apple.com/videos/play/wwdc2021/10132/)
- [Swift concurrency: Behind the scenes - WWDC21](https://developer.apple.com/videos/play/wwdc2021/10254)
- [Migrate your app to Swift 6 - WWDC24](https://developer.apple.com/videos/play/wwdc2024/10169/)
- [Embracing Swift concurrency - WWDC25](https://developer.apple.com/videos/play/wwdc2025/268/)

Third, is that you are familiar with SwiftUI. You’ve created a few Views, and understand a little about managing state in SwiftUI. It’ll also be helpful if you are familiar with the [Observation](https://developer.apple.com/documentation/Observation) framework introduced in 2023. If you need a refresher, go check out your favorite apple developer blogger. Linked here is Paul Hudson's page.

- [SwiftUI by Example - Hacking with Swift](https://www.hackingwithswift.com/quick-start/swiftui)

## Basic Testing Theory

With assumed knowledge covered, let's cover some theory about testing.

I don't want this talk to be a doctoral thesis on writing tests, but there are 4 bits of theory I want to cover:

- The general properties of a good test.
- Dependency Injection and its use in test.
- Test doubles, such as fakes, mocks, and spies.
- testing asynchronous behavior in general.

Let’s start with the properties of a good test.

### Properties of a good test

<div class="two-column">
<div style="flex-grow: 2">
- Be Short
- Be Simple
- Test one thing
- Check one behavior
- Run as quickly as possible
</div>
<div style="flex-grow: 3">
```swift
func testSimpleAdder() {
    // Arrange
    let subject = Adder()
        
    // Act
    let result = subject.add(2, 3)
        
    // Assert
    expect(result).to(equal(5))
}
```
</div>
</div>

First, you want it to be obvious what’s going on with a test, so keep it short and simple. Perform the setup, call the method being tested, and assert on the result.

You want only a single subject, or thing being tested, at once. In unit tests, this is a single object. Higher level integration tests will use a system of objects to check their interactions. You want to minimize the production code paths to just those being tested.

Similar to only checking one thing at a time, in order to keep the test as simple as possible, you also want to only check one behavior at a time. A behavior is a unit of result like the return value, or that a callback was called, or some side effect.

These 4 are all because you write tests for other developers, including your future self. Tests serve as a executable documentation of what the code should be doing.

Lastly, a test should run as quickly as possible. This is important, so let’s expand on that.

#### Run as quickly as possible

- Run as quickly as possible
  - Fast test suites provide more value
  - Like build time reduction, test runtime reduction pays off dramatically

For example, if it takes multiple seconds to spin up each test, then it's only natural to want to combine multiple tests into one. Which impairs readability and makes it unclear what exactly is being tested. In general, the longer your test suite takes to run, the less value it provides. I would imagine almost all of us only regularly run the entire test suite in CI, which is a shame because that means you’re not finding out if you broke the other parts in the app until the last possible moment before merging it in, possibly forcing you to have to rewrite a bunch of code.

Many of us complain about build times. Test runtime is similarly important and reducing it pays off dramatically.

Ok, that’s a little on what a test should look like. Let’s talk about one way to help with to that. Let’s talk about Dependency Injection.

### Dependency Injection

Providing Dependencies to an Object

<div class="two-column">
<div style="flex-grow: 2">
```swift
struct NoInjectedDependencies {
    let a = DependencyA()
    let b = DependencyB.shared
}
```
</div>
<div style="flex-grow: 2">
```swift
struct HasInjectedDependencies {
    init(
        a: DependencyA,
        b: DependencyB
    ) {
        // ...
    }
}
```
</div>
</div>

Dependency injection is the idea of providing dependencies to an object.

For example, the `NoInjectedDependencies` struct is not using dependency injection. It is directly creating a dependency or accessing a global singleton.

In contrast, the `HasInjectedDependencies` struct is using dependency injection, it’s being provided with dependencies during init.

This provides a number of benefits in terms of improving your app design, such as decoupling your object graph, encouraging you to make your objects smaller, and so on. It also vastly simplifies testing because it allows you to provide fake instances to objects, allowing you to control how much production code is running in a given test.

There are a number of patterns for doing dependency injection. I'll be using direct argument injection, as seen here on the right. where dependencies are provided either to the method itself, or to the object's initializer. That's the simplest, easiest, and in my opinion best way to do dependency injection in swift.

Understanding and using dependency inversion is a key concept for testing code in general, and is basically required to reliably test code that makes async calls.

### Test Doubles

Test doubles are anything used to replace production code for the purpose of testing. Like as stunt double is in the film industry.

There are many kinds of test doubles, such as mock, spy, stub, or fake. All of these are widely conflated nowadays, usually by calling everything a “Mock” or maybe a “Fake”. I’m going to be pedantic here and use the actual terms for these, but I won’t judge you for that ingrained habit.

That said, strictly speaking, a Mock is a kind of test double that’s meant to be a stand-in for a method call. It asserts on arguments at call time. So, you’d configure it with what you expect the arguments to be, and, if the mock is called, then it’ll pass or fail the test right then and there.

A Spy is also a test double to replace a method call. Spies record the arguments, allowing you to assert on them later. Despite the term not being as well known, spies are used much more because recording the arguments and asserting on them after the fact makes for simpler tests that are much easier to read.

Lastly a Fake is a test double that represents an object or implementation of a protocol. Most fakes that I write consist entirely of Spies - that is, all the fake’s methods do is record the arguments for later - but another classic example of a Fake is an in-memory database. They’re not at all useful for a real app, but perfect for a test.

### Testing Asynchronous Behavior

Ok, last up for theory are some brief notes about testing asynchronous behavior.

When you make an asynchronous call, there are 2 states you have to test: What the code does while it's waiting for that call to resolve, and what it does after the call resolves.

For example, let’s look at the case of a button that, when tapped, initiates a network call. The in-progress state is what happens between tapping the button, and the network call finishes. During this, we’ll replace the button with a progress spinner. Once the network call finishes, then we enter the finished state and actually show the loaded data.

Ok, we made it through the theory. Let's move on and talk about Swift Concurrency.

## Testing Swift Concurrency

Let’s move on and talk about testing swift concurrency.

```swift
struct OMTJsonService: OMTService {
    let client: HTTPClient

    func omtDemo() async throws -> [String] {
        let url = URL(
            string: "https://demos.rachelbrindle.com/omt2024.json"
        )!
        let (data, _) = try await client.data(
            for: URLRequest(url: url)
        )
        return try JSONDecoder().decode(
            [String].self,
            from: data
        )
    }
}
```

In this section, I want to talk about this code. It’s an example of the Service Layer Pattern. All this does is make a network call to a specific URL, and attempts to decode it as a list of strings. And it’ll simply re-throw any errors it encounters. Nothing fancy. No authentication to worry about. No query params, just this.

While this isn’t doing anything particularly fancy, there’s still a lot that can go wrong. In fact I count 4 things that can go wrong, which makes for 4 separate tests to write:

```swift
struct OMTJsonService: OMTService {
    let client: HTTPClient

    func omtDemo() async throws -> [String] {
        let url = URL(
            string: "https://demos.rachelbrindle.com/omt2024.json"
        )!
        // Network call could throw an error.
        let (data, _) = try await client.data(
            for: URLRequest(url: url) // This might not be the correct url request.
        )
        // json decoding could fail, or the network could return invalid json.
        return try JSONDecoder().decode(
            [String].self, // The assumption that data returned actually is an array of strings.
            from: data
        )
    }
}
```

You might consider the error cases to be the same, but any source of error is a separate behavior worthy of testing. After all, instead of just rethrowing the error, maybe we want to do some processing on the errors.

But how do you actually write these tests?

When it comes down to it, the problem is `let (data, _) = try await client.data(for: URLRequest(url: url))`. For testing the JSON, we can just use a real json decoder. But actually making a network call in test is a bad idea. Not only is it hard to set up, but it’s also slow and unreliable. Plus you won’t be able to reliably test the failure conditions, which are just as important, if not more important, as the happy path.

No, a better way is to inject a test double. Let’s talk about writing those for Swift Concurrency.

### Swift Concurrency Test Doubles

Like Swift in general, Swift Concurrency has opinions. One of those opinions is “all async calls must be resolved”. And if you violate that, then you end up with flaky tests at best, and deadlocks & crashes at worst.

So, when writing test doubles for Swift Concurrency, you need to take extra precaution to make sure that you don’t forget to resolve the call. Which is especially jarring if you’re used to the spying on Callbacks, where you didn’t need to think about that at all.

The naive and most obvious way to make sure you always resolved async calls is to immediately resolve it with a value. Basically, treating them like they’re synchronous methods.

But then you can’t check the in-progress state.

After a lot of thought, I eventually released a solution.

#### Swift Fakes - Test Doubles for Swift

A few months ago, I published [Swift Fakes](https://github.com/quick/swift-fakes/). Swift Fakes provides infrastructure for writing test doubles. Currently, it offers 2 types: `Pendable` and `Spy`.

`Pendable` is a way to provide a stand-in for the return value of an asynchronous function. It lets you resolve it pretty much whenever you want in a way that’s actually compatible with Swift Concurrency & won't cause deadlocks.

`Spy`, on the other hand, is a stand-in for a function as a whole.

For now, let’s focus on `Pendable`.

##### `Pendable<Value>`

`Pendable` lets you resolve an async result on domain. You can resolve it before or after the actual call has been made, and a single resolve with resolve every waiting call.

Crucially, though, is that `Pendable` requires you to configure a fallback value. There are some default fallbacks provided. Like if your `Pendable` represents a `Void` or an `Optional`, then it defaults to returning `Void` or `nil` respectively. Also, if your `Pendable` represents a `Result<..., any Error>`, then it will default to use an error as the fallback. But, for anything else: an `int`, a `string`, some custom type, even a `Result` with a specific error type, and you have to provide a fallback value.

This fallback value is only used if you forget to resolve the `Pendable`. From the first time the `Pendable` is called, you have by default 2 seconds to manually resolve it, and if you don’t manually resolve it, then it’ll return the fallback. If you manually resolve it, then it’ll immediately resolve all current and future calls with that provided value.

Of course, you’ll rarely use `Pendable` by itself. It’s meant to be used with `Spy`, configured as the return value.

##### `Spy<Arguments, Returning>`

`Spy` provides a type-safe and thread-safe way to record function arguments and return a value. You can see how one is used here, as the body of a method in a fake:

```swift
let processSpy = Spy<
    (first: String, second: String),
    Int
>(1)
func process(
    first: String,
    second: String
) -> Int {
    processSpy((first, second))
}
```

Thread safety is something generally ignored in test infrastructure, which is a mistake that leads to annoying-to-debug test crashes. Thread safety in test infrastructure is becoming increasingly important, with how easy Swift Concurrency makes it to run code in parallel. At one of my previous roles, I dramatically lowered unit test flakiness just by making the test doubles threadsafe.

The base form of `Spy` has 2 generic arguments: The first represents the arguments to the function, and the second represents the return value. If the return type is not a `Void`, `Optional`, or a `Result<..., any Error>`, then you also have to provide a stubbed value at init time.

By composing `Spy` with `Result` and `Pendable` these, you can represent almost any method signature in Swift.

#### Async Test Subjects

Ok, so, you can use `Pendable` and `Spy` to represent async methods, but how should we call the methods being tested?

Well, if the test isn’t checking the in-progress state, then you can just await on the call. Keep in mind to pre-resolve the Pendables, else your test will take a while before those Pendables resolve with their fallbacks:

```swift
func testHandlesCorrectData() async throws {
    // Arrange
    let httpClient = FakeHTTPClient()
    // pre-resolve httpClient
    let subject = Service(client: httpClient)

    // Act
    let value = try await subject.omtDemo()

    // Assert
    expect(value).to(equal(["hello", "omt"]))
}
```

If you are checking the in-progress state, you can use tasks or async lets. Async lets are nice, because they’ll auto-cancel at the end of the test. However, because most test assertion functions like the XCTAssert and [Nimble](https://github.com/quick/Nimble)’s expect take in autoclosures, which means that you cannot pass async let values in to them. So you’ll have to await that value prior to asserting on it.

Tasks, however, are not auto-cancelled. But they do have the benefit of being able to be passed in to all assertion functions.

Personally, I use async lets when the test isn’t checking the result the call, and Tasks when it is.

### Checking Background Behavior

Ok, we’ve seen what to use for building test doubles, we know how to call the method, but what about observing behavior? How do we check behavior that happens in a background thread?

One way is to use callbacks. XCTest provides the excellent [`expectation`](https://developer.apple.com/documentation/xctest/xctestcase/expectation(description:)) family of methods on XCTest for blocking your test until a callback is made. (Update June 2025): In Swift Testing, you can use the [`confirmation` api](https://developer.apple.com/documentation/testing/confirmation(_:expectedcount:isolation:sourcelocation:_:)-5mqz2).

But what if the behavior you want to observe is that a property is updated without the boilerplate of a callback? That’s where [Nimble](https://github.com/quick/Nimble) comes in handy. Nimble offers a feature called polling expectations. If you’ve used Nimble before, you might think of these as the toEventually family of methods. These work by continuously re-running the assertion code until it passes, or stops passing, in the case of toNever and toAlways.

It’s a very powerful and easy to use way to check to check code that updates in the background, without having to wait on a callback.

Update June 2025: I have pitched this same feature for Swift Testing, where I call them [Polling Confirmations](https://forums.swift.org/t/pitch-polling-expectations/79866).

### Demo

So, that was a lot. Let’s dive in to a demo showing how to use all this!

<iframe width="560" height="315" src="https://www.youtube.com/embed/MWu-E2yPuBA?si=eCXQ1TSGj0r3W1ns" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

## Testing SwiftUI

Now let’s move on and talk about testing SwiftUI.

For this section, we’ll be talking about this view. It has a button that, when pressed, changes to show a progress view, calls some provided closure to refresh, and, when that’s done, goes back to showing the button:

```swift
@MainActor
struct Refresher: View {
    let action: () async -> Void

    @State var isRefreshing = false

    var body: some View {
        if isRefreshing {
            ProgressView()
        } else {
            Button("Refresh") {
                isRefreshing = true
                Task {
                    await action()
                    isRefreshing = false
                }
            }
        }
    }
}
```

There’s a lot going on here. This view is interactive, with 2 separate states, it kicks off an async task, and it calls an async callback. There’s a lot to get **wrong** here.

I count 4 behaviors to test.

1. The Refresher starts in the right state, showing the button.
2. When the button is pressed, that it switches to showing a progress view.
3. When the button is pressed, that the action callback is called.
4. When the button is pressed and the action callback finishes, that it switches back to showing a button.

### How to test views

With views in particular, there are a few ways to test them.

If you ask Apple, their advice has been to make use of SwiftUI Previews, and to use UI tests.

I’ve always found this to be unsatisfactory. Don’t get me wrong, SwiftUI Previews are great when you’re first creating the view. But for maintenance? Do you really want to go through every single preview and make sure it’s doing the right thing? No thanks, I want something automated.

As for UI Tests, they’re great for checking the app system as a whole, or flows within an app. But they’re not great for checking an individual view. They’re also incredibly slow. To me, a test is slow if it takes more than a hundredth of a second. UI Tests take seconds just to start up.

Ok, so Previews aren’t automated, and XCUI Tests are too broad and slow. We want something fast, targeted, and automated.

What I want is something that’ll let me directly inspect and manipulate the view, so that I can do things like simulate a button tap, see that we’re actually showing a progress view, and so on.

Doing this, as it turns out, is a bit involved. Thankfully, there’s a third-party tool called [ViewInspector](https://github.com/nalexn/ViewInspector) that provides a pretty decent interface for examining SwiftUI Views.

```swift
func testTappingButtonCallsCallback() throws {
    // Arrange
    let actionSpy = PendableSpy<Void, Void>()
    let subject = Refresher {
        await actionSpy().call()
    }
    // Act
    try subject.inspect().find(button: "Refresh").tap()
    // Assert
    expect(actionSpy).toEventually(beCalled())
}
```

### Demo

Let’s go to a demo so I can show you how I would use ViewInspector to test this Refresher!

<iframe width="560" height="315" src="https://www.youtube.com/embed/TaYusXcAvQ0?si=XegIpbPk6aqsXJpS" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

## Snapshot Testing

Directly manipulating views isn’t the only way to test a SwiftUI view. Let’s talk about snapshot testing, which complements the direct manipulation quite well.

Snapshot testing is exactly what it sounds like: You take a snapshot of the view, and compare it to a known-good one. If it matches, then the test is marked as passed. If it doesn’t match, then the test is failed. It’s a simple image compare, though more advanced libraries will do fuzzy-matching if you set that. Both of these are rather fast and very reliable.

Snapshots tests are great for catching visual regressions, though they are vulnerable to changes as the system design changes over time. You can imagine how this might have looked going from iOS 6 to iOS 7 (Update June 2025: or from iOS 18 to iOS 26). But even minor changes year-over-year cause snapshot tests to break.

Snapshot tests also do not handle animations well. Your best bet is to either pause animations, or try to set it up so that they either haven’t started or have ended when you snapshot the view.

The libraries I’m familiar with for doing snapshot tests are [ios-snapshot-test-case](https://github.com/uber/ios-snapshot-test-case) and [Nimble-Snapshots](https://github.com/ashfurrow/Nimble-Snapshots), which uses ios-snapshot-test-case under the hood.

One last warning: SwiftUI Views need to be in a window in order to render. Otherwise, you just get a blank image.

### Demo

Let’s go back to that demo, and I’ll show you setting up and using snapshot tests.

<iframe width="560" height="315" src="https://www.youtube.com/embed/TRBOtPafj6Q?si=6NN1Mh66FshlASb4" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

## Recap

Ok, let’s go with a recap.

First, we started with some basic theory. We talked about the properties of a test, and how all of that goes to contribute to the value you can get out of your tests. The easier it is to reason about a test, more value you get out of it. The faster it runs, the more likely you are to run it more often. And so on.  
I talked about dependency injection and how it helps improve not only your app design by decoupling your code, but it’s also fundamental to writing simple, fast, targeted tests.  
I discussed Test Doubles, what they are, and what some of the different types of test doubles are.  
I even covered a little bit about the 2 states of asynchronous behavior: in progress and finished. And how it’s important to check both of them.

Then, I covered some of the main points in testing swift concurrency. I introduced Swift Fakes, which provides infrastructure for writing test doubles with the Spy class, as well as infrastructure specifically for doubling async calls with Pendable. I talked how to invoke an async function in test, when to use await, when to use an async let, and when to use a Task. And I talked about observing background behavior using [Nimble](https://github.com/quick/Nimble)’s polling Expectations.

Finally, we talked briefly about testing SwiftUI Views.

I covered using ViewInspector to examine the view hierarchy and call actions in it.  
I covered using Snapshot Testing to ensure that your view actually looks the way it should.  
And, in general, remember that these are complementary. You should use the logic-based view hierarchy checking, as well as snapshot tests.

And that’s all I got. I’m Rachel Brindle. You can find me on mastodon, I’m [@younata@hachyderm.io](https://hachyderm.io/@younata/). I also maintain [Quick](https://github.com/quick/Quick), [Nimble](https://github.com/quick/Nimble), and [Swift-Fakes](https://github.com/quick/swift-fakes). (Update June 2025: I'm also a member of the [Swift Testing Workgroup](https://www.swift.org/testing-workgroup/), and I now contribute to Swift Testing).

Thank you for your time, I hope you take this and use it to improve your own tests!
