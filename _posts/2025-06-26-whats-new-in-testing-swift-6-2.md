---
layout: post
title: What's new in Testing, 2025 Edition
date: 2025-06-26
tags: swift, tdd, testing, xctest, xcode
---

<div class="aside">
<b>Edit History</b>
<br />
2025-07-02: Removed request for ability to modify issues in XCTest before recording, as this can be done by overriding `XCTestCase.record(_:)`. This was a mentioned as an idea for how to handle runtime issues for keeping the default behavior, and allowing for dedicated tests to ensure that specific runtime issues have been resolved. Thanks to Stuart Montgomery for pointing this out.<br />
2025-06-30: Added notes on the new Runtime Issue Detection feature in Xcode. Which I had completely missed when I first wrote the talk this was based on. Thanks to Suzy Ratcliff for asking that I include notes on this.<br />
2025-06-30: Issue Handling Traits is now a proposal under active review. This happened prior to me publishing this post, though after the original talk was given.
</div>

<div class="aside">
<b>Note</b>
<br />
This post is the contents of a talk I gave at [One More Thing 2025](https://omt-conf.com/). I'll add a link to the talk once it's available. This post is an edited form of my speaker notes from it.
</div>

Today I want to ~~talk~~ write about What's New In Testing for Swift 6.2/Xcode 26.

First, I'll cover the new and upcoming things in Swift Testing. Then we'll move into XCTest and finally finishing with Automation Tests.

## What's Not New

Before we talk about what did change, I'll start with what didn't change:

6 years on, there is still no way to unit test code using SwiftUI. The official guidance remains use UI Automation Tests and SwiftUI Previews. Unsurprising, but extremely disappointing. I love that third party tools like [ViewInspector](https://github.com/nalexn/ViewInspector) exist - I even [gave a talk on using ViewInspector last year](https://rachelbrindle.com/2025/06/12/testing-swiftui-and-swiftconcurrency/) - but I really wish I didn’t have to use them.

Additionally, UI Automation tests still require you to use XCTest. Personally, this is less disappointing to me, but I do know some people are extremely excited about this.

I know that both of these are extremely common requests that the testing team receives, so... here's hoping for next year! However, I need to disclaim this by saying that I am not an apple employee, I have no knowledge of their internal roadmap, and I respect my friends at Apple way too much to ever ask them to comment on things I know they can't comment about. Instead, I’ll just influence their higher ups by talking about the things they should be doing.

Enough about what didn't change, let's move on.

## Swift Testing Recap

To recap, Swift Testing is extremely new - it was [publicly announced in September 2023](https://github.com/swiftlang/swift-testing/commit/a4c26e35cdc0ce2daaff411f47ea6295a5042ddc), and was included with Xcode 16 last year. Since then, it has evolved at a breakneck pace, and it continues to evolve. Especially for how small the core team is - [based on the public repo](https://github.com/swiftlang/swift-testing/graphs/contributors), there's only a handful of people working on it.

In March, the [Testing Workgroup](https://www.swift.org/testing-workgroup/) was formalized with our first meeting on March 10th.

The Testing workgroup was created to govern the [Swift Testing](https://github.com/swiftlang/swift-testing/) and [Corelibs XCTest](https://github.com/swiftlang/swift-corelibs-xctest) - the open source XCTest - projects, to improve the state of testing in Swift & related tools, and to send feedback to other groups within the swift community about unmet testing needs - like how swiftui should be testable.

The Testing Workgroup core team currently consists of Brandon Williams, Brian Croom, Jonathan Grynspan, Maarten Engels, Paul LeMarquand, Stuart Montgomery and me.

We meet every other Monday at 1 pm pacific time. If you're interested in attending, please send a message to [@testing-workgroup](https://forums.swift.org/new-message?groupname=testing-workgroup) on the Swift Forums.

The Testing library follows the Evolution process - proposals are hosted in the [Swift Evolution repository](https://github.com/swiftlang/swift-evolution), but in a [testing subdirectory](https://github.com/swiftlang/swift-evolution/tree/main/proposals/testing) of the proposals directory.

## What's New in Swift Testing

Between Swift 6.0 being released in September 2024 and June 12th, 2025 when I gave this talk, 6 new proposals were merged for Swift Testing:

- Ranged Confirmations
- Return errors from `#expect(throws:)`
- Test Scoping Traits
- Exit Tests
- Attachments
- Evaluate in ConditionTrait

The first 3 were included in Swift 6.1, releasing alongside xcode 16.3. The latter 3 are in Swift 6.2, and are currently included in the xcode 26.0 beta. Additionally, there are at least 3 pitches I'm aware of that are being actively discussed, though I only expect one of them to make it into the Swift 6.2 release.

Let's go over each of these, starting with Ranged Confirmations.

### Merged Proposals

#### Ranged Confirmations

[ST-0005](https://github.com/swiftlang/swift-evolution/blob/main/proposals/testing/0005-ranged-confirmations.md). Proposal author: Jonathan Grynspan.

The confirmation API is a way to monitor for asynchronous behavior that uses a callback-like api.

The basic API looks something like this:

```swift
await confirmation() { confirm in
    functionBeingTested() { confirm() }
}
```

You can even specify how many times you expect the `confirm` value to be called by using the expectedCount argument:

```swift
await confirmation(expectedCount: 2) { _ in
    ...
}
```

But what if you're testing a function that's a bit jittery? Maybe there's some random chance in there? Maybe it's akin to a ui test, where you're expecting a button to be tapped, but a human actually taps the button? As of Swift 6.1, you can handle this by passing in a range of expected counts:

```swift
await confirmation(expectedCount: 1...4)
```

In this case, we expect `confirm` to be called between 1 and 4 times.

This feature will perhaps not be used by everyone, but will be very handy for testing less-deterministic callbacks.

#### Returns errors from `#expect(throws:)`

[ST-0006](https://github.com/swiftlang/swift-evolution/blob/main/proposals/testing/0006-return-errors-from-expect-throws.md). Proposal author: Jonathan Grynspan.

Moving on, how about retrieving expected errors?

Originally, when using the `#expect(throws:)` and `#require(throws:)` macros, there was no way to process the error thrown after the macro ended. This is annoying because sometimes it's useful to do additional validation on an error after the `#expect(throws:)` ends.

As of Swift 6.1, the `#expect(throws:)` macros were changed to return the caught error as an optional.

Also, for `#require(throws:)`, it’ll only ever return the error thrown by the closure being ran, not the error that would be thrown by require to prevent further execution.

```swift
import Testing

struct MyError: Error {
    let value: Int
}

func myThrowingFunction() throws {
    throw MyError(value: 1)
}

@Test func ReturnErrorsFromExpectThrows() {
    let error = #expect(throws: MyError.self) {
        try myThrowingFunction()
    }

    #expect(error?.value == 1)
}

@Test func RequireErrorNotThrown() throws {
    let error = try #require(throws: MyError.self) {

    }
    fatalError("This code should never be reached")
}

```

This is also a small change, but very welcome to see. I'm really happy to have more options for further validating errors.

#### Test Scoping Traits

[ST-0007](https://github.com/swiftlang/swift-evolution/blob/main/proposals/testing/0007-test-scoping-traits.md). Proposal author: Stuart Montgomery.

Next up is Test Scoping Traits. These provide a way to run code before or after a test/suite/set of tests, allowing you to share the setup/teardown for code across suites & tests. This is extremely useful for overriding TaskLocals.

You can use this by creating a type that conforms to the `TestScoping` protocol, and implementing the `provideScope(for:testCase:performing:)` method:

```swift
import Testing

struct Container {
    @Test("wheee", MySharedBehavior(1)) func example() async throws {
        #expect(MyValue == 1)
    }

    @Test("wheee2", MySharedBehavior(2)) func example2() async throws {
        #expect(MyValue == 2)
    }
}

@TaskLocal var MyValue = 0

struct MySharedBehavior: TestTrait, TestScoping {
    let value: Int

    init(_ value: Int) {
        self.value = value
    }

    func provideScope(for test: Test, testCase: Test.Case?, performing function: () async throws -> Void) async throws {
        try await $MyValue.withValue(value) {
            try await function()
        }
    }
}

```

Note that `TestScoping` is a different protocol from `TestTrait` - your type conforming to `TestScoping` need not also conform to one of the Trait protocols. Though, there is an override doing the right thing in the extremely common case when your TestScoping type also conforms to `TestTrait`, which I took advantage of in the above code.

Right now, there's not too much extra stuff you can do here. You don't have access to the contents of the `Suite`, nor do you have any access to the internals of the test. So it's rather limited compared to what it could be. The proposal mentions future directions expanding this, which are being actively discussed in the testing workgroup. I'm unsure when or if these'll land: this is really hard to get working with the type & concurrency system, plus the testing team is swamped with all their other priorities - like hopefully working with the SwiftUI team to support unit testing swiftui; I will single-handedly will this into existence.

#### Exit Tests

[ST-0008](https://github.com/swiftlang/swift-evolution/blob/main/proposals/testing/0008-exit-tests.md). Proposal author: Jonathan Grynspan.

Let's move on to the stuff actually new in swift 6.2/xcode 26. First off is Exit Tests. I love this feature. As someone who primarily writes iOS, I don't expect to use it much. But I love the engineering here. It's simple. It's useful. It's elegant.

Exit tests allow you to check the failure cases in code, where you want it to crash, exit, or otherwise quit.

Until now, there's been no way to actually verify a crash using Swift tooling. XCTest hasn't supported it, and Swift Testing didn't. So, if you wanted to verify that a crash happens, you need to go way out there by writing a CLI tool to call the function, and then testing that CLI tool using something like [bats](https://github.com/bats-core/bats-core) so you can verify that it exits with a non-zero status. Which is extremely contrived something that even people like me who are obsessed with testing won't do it.

Now, though, you can do that, and it's a really nice API for doing that:

```swift
import Foundation
import Testing

func doTheThing(positiveValue: Int) {
    precondition(positiveValue > 0)
    // ...
}

@Test func verifyRequiresNonZero() async {
    await #expect(processExitsWith: .success) {
        doTheThing(positiveValue: 0)
    }
}

@Test func verifyRequiresNonNegative() async throws {
    let result = try await #require(
        processExitsWith: .failure,
        observing: [\.standardErrorContent]
    ) {
        doTheThing(positiveValue: 1)
    }
    #expect(String(bytes: result.standardErrorContent, encoding: .utf8)?.contains("Precondition failed") == true)
}
```

Note that `result.standardErrorContent` and `result.standardOutputContent` (not shown) are both `[UInt8]`. Which adds some additional work required to compare it to a string.

The way this works is fairly simple: It forks the test process, and runs the passed-in closure on the subprocess, optionally allowing you to retrieve standard output and standard error. When a signal is raised, or the subprocess otherwise exists, it finishes and examines the output per the `processExitsWith` argument. It takes a fairly simple approach, and wraps it in really nicely polished API based on swift concurrency.

This also brings me to the primary downside of exit tests:

They don't work on platforms that can't create and wait for subprocesses. Like that function just straight up won't compile if you try to build for iOS. So this means that it's currently limited to just macOS, Linux, FreeBSD, OpenBSD, and Windows. Supporting other platforms is something the Testing team is interested in and wants to do, but it's not a thing now because it would likely require a different approach or for other platforms to specifically support this. Which is fair. For iOS, the focus is on "never crashing the app", so I would expect iOS apps to actually throw an error or something instead of intentionally causing a crash.

#### Attachments

[ST-0009](https://github.com/swiftlang/swift-evolution/blob/main/proposals/testing/0009-attachments.md). Proposal author: Jonathan Grynspan.

Attachments have been a thing in XCTest for a while - they allow you to include extra data with tests to help diagnose issues. You know how in UI Tests, you can get a screenshot of the app when it failed? That's implemented using attachments.

Now, you can attach data to Swift Testing tests. Currently these are:

- `Array<UInt8>`, `ContiguousArray<UInt8>`, and `ArraySlice<UInt8>`
- `String` and `Substring`
- `Data` (if Foundation is also imported)
Anything conforming to both `Attachable` and either `Encodable` or `NSSecureCoding` (if Foundation is also imported)

The story of how the "if Foundation is also imported" parenthetical works is fascinating: In brief, Foundation (at least the [open source Foundation](https://github.com/swiftlang/swift-foundation/tree/main). No idea about the existing closed-source one) is using Swift Testing for their own tests. Therefore, having Swift Testing depend on Foundation would introduce a circular dependency. Instead, they use the not-fully-evolutioned "cross-import overlay" feature that was merged back in Swift 5.3 to interoperate with Foundation, without having a hard dependency on Foundation. Instead, there's basically a third module which is automatically imported when Swift Testing and Foundation are both imported. This third module is where the additional conformances for Data and Encodable/NSSecureCoding are found. I think this is great because it makes Attachments much more usable as a feature - being able to handle json or raw data is great.

Actually using this is as simple as calling `Attachment.record()` with the data to attach:

```swift
Attachment.record("Hello world!")
```

It's a great api, I love it.

#### `evaluate()` in `ConditionTrait`

[ST-0010](https://github.com/swiftlang/swift-evolution/blob/main/proposals/testing/0010-evaluate-condition.md). Proposal author: David Catmull.

Lastly for the testing proposals is this short & sweet change.

Originally, `ConditionTrait` had a single method: `prepare(for:)`. Which had this signature:

```swift
// Swift 6.1
public struct ConditionTrait: TestTrait, SuiteTrait {
    public func prepare(for test: Test) async throws
}
```

The problem is: How do you check a `ConditionTrait` without having an existing `Test` object? This is primarily of concern to third-party tools, who want to use these outside of the context of a Test. Most people actually writing tests need not be concerned with this.

Now, `ConditionTrait` now supports an `evaluate()` method, and the implementation of `prepare(for:)` has been changed to call `evaluate`. That's it. A nice, simple change.

```swift
// Swift 6.2
public struct ConditionTrait: TestTrait, SuiteTrait {
    public func evaluate() async throws -> Bool { ... }
    public func prepare(for test: Test) async throws {
        if !(try await evaluate()) {
            // ...
        }
    }
}
```

### Current Promising Pitches & Proposals

(This section will be updated as these pitches move through the Evolution process).

Ok, that was it for the "will be included in Swift 6.2" merged proposals, let's talk about the "might be included in Swift 6.2" pitches. As I said earlier, there are 3 such pitches I’m aware of:

- Test Issue Warnings
- Issue Handling Traits
- Polling Confirmations

I'm going to cover these fairly quickly, as they're still in the pitch phase and haven't finished going through the evolution process.

#### Test Issue Warnings

[Pitch](https://github.com/suzannaratcliff/swift-evolution/blob/suzannaratcliff/issue-severity-warnings/proposals/testing/XXXX-issue-severity-warning.md). Pitch author: Suzy Ratcliff.

Test Issue Warnings are ways to record & report issues that don't fail the test suite. These were also added to XCTest, so I'll cover them more later in this post. Assuming this gets adopted, you can use them by specifying an issue severity when you record it. This is the only active pitch I expect to make it into Swift 6.2, and I'll update this post if it does.

```swift
Issue.record("Maybe ok?", severity: .warning)
```

#### Issue Handling Traits

[ST-0011 Proposal](https://github.com/swiftlang/swift-evolution/blob/main/proposals/testing/0011-issue-handling-traits.md). Proposal author: Stuart Montgomery.

Issue Handling Traits are really powerful. As the name implies, these are traits that can be used to modify or filter issues before they’re reported - adding comments, adding attachments, normalizing non-deterministic inputs were just 3 of the examples named in the proposal.

I think these are going to be really useful, especially when combined with Test Issue Warnings. For example, by forcing warnings to be reported as errors:

```swift
@Test(.compactMapIssues { issue in
    var issue = issue
    issue.severity = .error
    return issue
}) func `does the thing`() {
    Issue.record("uh oh", severity: .warning)
    // Will actually be reported as an error
}
```

It seems like Issue Handling Traits may make it into Swift 6.2, but it's too early to tell at this point.

### Polling Confirmations

[Pitch](https://github.com/younata/swift-evolution/blob/younata/testing-polling-expectations/proposals/testing/NNNN-polling-confirmations.md). Pitch author: Rachel Brindle.

This last pitch is something I wrote, so I obviously think it's great and hope it becomes a thing.

Polling Confirmations is the first part of extending the confirmation api to support other kinds of event monitoring. Currently, you can only use the confirmation api to monitor changes exposed using a callback api. Polling confirmations allow you to monitor changes by repeatedly running a method or closure. Which is pretty basic, but immensely powerful. If you've ever used [Nimble](https://github.com/quick/Nimble)'s [Polling Expectations API](https://quick.github.io/Nimble/documentation/nimble/pollingexpectations), you're familiar with how powerful this is.

```swift
@Test func `Raising Dolphins takes a while`() {
    let subject = Aquarium()
    Task {
        await subject.raiseDolphins()
    }
    await confirmPassesEventually {
        subject.dolphins.count == 1
    }
}
```

I don't expect Polling Confirmations to make it into Swift 6.2.

## What's New in XCTest & Testing in Xcode

### Issue Warnings in XCTest

There's not too much new in raw XCTest. The only change I'm aware of is support for reporting non-failing issues.

As mentioned in the pitch for Swift Testing, these are essentially build warnings but for tests - things that indicate you might be doing something wrong, but aren't necessarily failures.

This is something much more of use to people writing testing tools, not so much for people writing tests. Think things like doing an image compare for snapshot tests - you might want to issue a warning if the images are slightly different, but still within your acceptance criteria.

```swift
import XCTest

final class MyTestCase: XCTestCase {
    func testDoesTheThing() {
        self.record(
            XCTIssue(
                type: .assertionFailure,
                compactDescription: "Example",
                severity: .warning
            )
        )
    }
}
```

### Runtime Issue Detection in Xcode

An additional change, which I had missed at first (Thanks to Suzy Ratcliff for reaching out and asking I include this!), is Runtime Issue Detection. This applies checks as surfaced by the Main Thread Checker, the Thread Performance Checker, or any other runtime issues reported by frameworks to tests, similar to if you click "run" in Xcode. By default, Runtime Issue Detection reports detected issues as warnings, the same as if you had used the new Issue Warnings feature in XCTest. You can disable these, or change them to report as test failures in the testplan editor in Xcode.

Reporting runtime issues as warnings by default is incredibly kind and pragmatic. This is a new feature, and while they want it to be used, they also don't want existing passing tests to fail just because you upgraded Xcode. I think it's a really good, pragmatic choice to default this to report them as warnings. This not only mirrors the experience with Runtime Issues outside of test, but also frameworks do change over time, a codepath which previously did not raise a runtime issue could change to raise one later on just by updating to a new version of a framework. It's a very bad experience to suddenly have your tests fail because you updated your dependencies. So I understand why this defaults to reporting these as warnings. I plan on changing this to cause test failures as soon as I can.

Another approach is to leave runtime issues as warnings, and set them to error for specific tests that verify the runtime issue has been resolved. For those tests, you can use either Issue Handling Traits in Swift Testing, or override [`XCTestCase.record(_:)`](https://developer.apple.com/documentation/xctest/xctestcase/record(_:)) to convert these to errors at runtime.

This is huge for helping narrow down and stopping these runtime issues from occurring. It's one thing to see these raised as you navigate the app - especially if they're only triggered in a handful of codepaths that you rarely manually check. It's another to have these consistently generating warnings or even test failures. I am very much looking forward to making full use of this.

## What's New In Automation Tests

### `XCTHitchMetric`

Last up is UI Automation tests. For code, the only change is this new [`XCTHitchMetric`](https://developer.apple.com/documentation/xctest/xcthitchmetric). This is another entry in the [`XCTMetric`](https://developer.apple.com/documentation/xctest/xctmetric) API, allowing you to measure the responsiveness and fluidity of your UI in a UI Test:

```swift
import XCTest

final class MyUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    @MainActor
    func testScrollingAnimationPerformance() throws {
        let measureOptions = XCTMeasureOptions()
        measureOptions.invocationOptions = .manuallyStop

        let app = XCUIApplication()

        app.launch()
        let scrollView = app.scrollViews.firstMatch

        measure(metrics: [XCTHitchMetric(application: app)], options: measureOptions) {
            scrollView.swipeUp(velocity: .fast)
            stopMeasuring()
            scrollView.swipeDown(velocity: .fast)
        }
    }
}
```

Which is pretty neat! Automation to confirm you have the "buttery smooth" scrolling experience that we all want.

However, as cool as it is to have this ability, I would still not run any tests using this in CI. That seems like a recipe for flaky tests. But I also haven’t tried it. Maybe it does the right thing when it realizes the UI is hitching because the machine itself is under heavy load.

### New UI Test Recording & Review Experience

Moving on, there's also a new ui test recording & review experience in Xcode 26.

The WWDC 2025 session [Record, Replay, and review: UI automation with Xcode](https://developer.apple.com/videos/play/wwdc2025/344) does a really good job of demoing this.

I have mixed feelings on the code suggestion for fixing failing ui tests: That normalizes the idea that when a test goes red, it's the test's fault. When really you should consider a failing test to first be a problem in the production code. On the other hand, most teams/engineers don't practice test driven development or even test first development, so I guess this is understandable, if unfortunate.

Still, this is a pretty neat new experience that's much better than what it was previously.

## Recap

So, in conclusion, there's a lot new in testing this year! For me, I'm most excited about Swift Testing, it's impressive to me how much Swift Testing continues to improve, and I can't wait to see what comes next, as well as to help guide and contribute to it.

If you want help out, please join us on the Swift Forums. If you'd like to participate in the Testing Workgroup and attend meetings, please reach out to [@testing-workgroup](https://forums.swift.org/new-message?groupname=testing-workgroup) on the Swift Forums!

Lastly, most importantly, I want to end with this: File feedback with the swiftui and testing teams to go add unit testing support for swiftui. Feel free to duplicate [this feedback](https://openradar.appspot.com/FB17834808).

That's all. Thank you!