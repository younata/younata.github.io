—
layout: post
title: Unit Testing UIKit - Part 1
date: 2020-06-28
tags: ios unit testing uikit view controller
—

Unit testing is a way to automate verification of code. It’s not the be-all end-all of program verification, but it’s a really good start. Unit testing goes a long way towards augmenting QA and manual verification to ensure that your code works.

I’ve been practicing test driven development for more than 5 years, and have been building iOS apps since iOS 4. I wanted to document the techniques I’ve learned and come up with for testing UIKit code.

The standard intro-to-testing examples are things like “verify that mathematical operations work as they should” and “convert arabic number to roman numeral” katas. I won’t do that. I’m going to assume you know the basics of unit testing, and I will be going in depth to using UIKit from a unit testing context.

# Implementation

Let’s start with the following swift code, which is a view controller for various boolean settings. The responsibility for this view controller is to allow the user to view and change settings on the device.

For the sake of inlining as much as possible, I’m going to programmatically lay out this view controller.

```swift
import UIKit

struct Setting: Hashable {
    let name: String
    var isEnabled: Bool
}

protocol SettingsManager {
    func settings() -> [Setting]
    func set(isEnabled: Bool, for setting: Setting)
}

class ToggleTableViewCell: UITableViewCell {
    let toggle = UISwitch()
    
    var onToggle: ((Bool) -> Void)?
    
    override func prepareForReuse() {
        onToggle = nil
        super.prepareForReuse()
    }
    
    @objc private func didToggleSwitch() {
        onToggle?(toggle.isOn)
    }
    
    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: nil)
        
        contentView.addSubview(toggle)
        toggle.translatesAutoresizingMaskIntoConstraints = false
        toggle.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16).isActive = true
        toggle.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 4).isActive = true
        toggle.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -4).isActive = true
        // It’s important that it look pretty.
        let spaceConstraint = toggle.leadingAnchor.constraint(equalTo: textLabel!.trailingAnchor, constant: 8)
        spaceConstraint.priority = .defaultHigh
        spaceConstraint.isActive = true
    }
    
    required init?(coder: NSCoder) {
        fatalError(“no”)
    }
}

class SettingsViewController: UIViewController {
    let settingsManager: SettingsManager
    let tableView = UITableView()
    lazy var dataSource: UITableViewDiffableDataSource<Int, Setting> = {
        return UITableViewDiffableDataSource<Int, Setting>(
            tableView: tableView,
            cellProvider: self.cell(tableView:indexPath:setting:)
        )
    }()
    
    init(settingsManager: SettingsManager) {
        self.settingsManager = settingsManager
        super.init(nibName: nil, bundle: nil)
    }
    
    required init?(coder: NSCoder) {
        fatalError(“no”)
    }
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        view.addSubview(tableView)
        // boilerplate for autolayout.
        tableView.translatesAutoresizingMaskIntoConstraints = false
        tableView.leadingAnchor.constraint(equalTo: view.leadingAnchor).isActive = true
        tableView.trailingAnchor.constraint(equalTo: view.trailingAnchor).isActive = true
        tableView.topAnchor.constraint(equalTo: view.topAnchor).isActive = true
        tableView.bottomAnchor.constraint(equalTo: view.bottomAnchor).isActive = true
        
        // setting up the tableview to display cells
        tableView.register(ToggleTableViewCell.self, forCellReuseIdentifier: “cell”)
        tableView.dataSource = dataSource // set it to use our diffable data source
        
        // load settings data.
        var snapshot = NSDiffableDataSourceSnapshot<Int, Setting>()
        snapshot.appendSections([0])
        snapshot.appendItems(settingsManager.settings())
        dataSource.apply(snapshot)
    }
    
    func cell(tableView: UITableView, indexPath: IndexPath, setting: Setting) -> UITableViewCell? { // 1
        guard let cell = tableView.dequeueReusableCell(withIdentifier: “cell”, for: indexPath) as? ToggleTableViewCell else { return nil }
        cell.textLabel?.text = setting.name
        cell.toggle.isOn = setting.isEnabled
        cell.onToggle = { [weak self] newValue in
            self?.settingsManager.set(isEnabled: newValue, for: setting)
        }
        return cell
    }
}
```

1. This is where I dequeue and confige a `ToggleTableViewCell` with the settings, as well as set the `onToggle` property to update the `SettingsManager`. `[weak self]` is used in the closure declaration to ensure that the cell doesn’t retain the view controller.

Testing this comes with it’s own set of concerns:

- The correct amount of cells should be shown
- Cells should be configured with the correct setting (the `textLabel`’s `text` property is set to the `Setting`’s `name` property, and the `toggle`’s `isOn` property is set to the `Setting`’s `isEnabled` property.
- Toggling a switch should call `set(isEnabled:setting:)` on the given `SettingsManager`

And we’ll handle each of these different behaviors in their own tests. This is done to show that each behavior is separate and that changes made during one test do not affect the results of a different test - also known as test pollution.

Before we write the tests, we need a small test helper. In more dynamic languages like Java or Objective-C, there exist libraries for creating stub or fake implementations of types on the fly. The closest thing in swift are scripts that will auto-generate fake implementations of protocols. Personally, I’d rather write my own fake implementation by hand.

```swift
class SimpleSettingsManager: SettingsManager {
    var _settings: [Setting] = []
    
    func settings() -> [Setting] { return _settings }
    
    func set(isEnabled: Bool, for setting: Setting) {
        guard let index = _settings.firstIndex(where: { $0.name == setting.name }) else { return }
        _settings[index].isEnabled = isEnabled
    }
}
```

# Testing
Now that that’s out of the way, let’s write some tests. I’m going to first use [`XCTest`](https://developer.apple.com/documentation/xctest) for this. Afterwards, I’ll show an example of how I’d write the same test in [`Quick`](https://github.com/quick/quick) and [`Nimble`](https://github.com/quick/nimble) - my preferred testing frameworks. I prefer Quick and Nimble because they allow me to better model asynchronous and interactive behavior.

## XCTest

```swift
import UIKit
import XCTest

class SettingsViewControllerTest: XCTestCase {
    private func subjectFactory(settings: [Setting]) -> (subject: SettingsViewController, settingsManager: SimpleSettingsManager) { // 1
        let manager = SimpleSettingsManager()
        manager._settings = settings
        let viewController = SettingsViewController(settingsManager: manager)
        viewController.view.bounds = CGRect(x: 0, y: 0, width: 375, height: 667)
        viewController.view.layoutIfNeeded() // 2
        return (viewController, manager)
    }
    func testShowsCorrectAmountOfCells() {
        let subject = subjectFactory(settings: [
            Setting(name: “Foo”, isEnabled: true),
            Setting(name: “Bar”, isEnabled: true),
            Setting(name: “Baz”, isEnabled: true),
        ]).subject
        
        XCTAssertEqual(subject.tableView.numberOfSections, 1)
        XCTAssertEqual(subject.tableView.numberOfRows(inSection: 0), 1) // 3
    }
    
    func testEachCellRepresentsASetting() throws {
        let subject = subjectFactory(settings: [
            Setting(name: “Foo”, isEnabled: true),
            Setting(name: “Bar”, isEnabled: false)
        ]).subject
        
        // 4
        let fooCell = try XCTUnwrap(subject.tableView.cellForRow(at: IndexPath(row: 0, section: 0)) as? ToggleTableViewCell) // 4.1, 4.2
        XCTAssertEqual(fooCell.textLabel?.text, “Foo”) // 4.3
        XCTAssertTrue(fooCell.toggle.isOn)
        
        // 4.4: Repeat for testing the other cell.
        let barCell = try XCTUnwrap(subject.tableView.cellForRow(at: IndexPath(row: 1, section: 0)) as? ToggleTableViewCell)
        XCTAssertEqual(barCell.textLabel?.text, “Bar”)
        XCTAssertFalse(barCell.toggle.isOn)
    }
    
    func testTogglingUpdatesTheSettingsManager() throws {
        let (subject, manager) = subjectFactory(settings: [
            Setting(name: “Foo”, isEnabled: true),
            Setting(name: “Bar”, isEnabled: false)
        ]) // 5
        
        let fooCell = try XCTUnwrap(subject.tableView.cellForRow(at: IndexPath(row: 0, section: 0) as? ToggleTableViewCell)
        
        fooCell.toggle.isOn = false
        fooCell.toggle.sendActions(forControlEvent: .valueChanged) // 5.1
        
        XCTAssertEqual(
            manager._settings,
            [
                Setting(name: “Foo”, isEnabled: false),
                Setting(name: “Bar”, isEnabled: false)
            ]
        ) // 5.2
        
        // 5.3: Do it again with a cell that starts in the On position.
        let barCell = try XCTUnwrap(subject.tableView.cellForRow(at: IndexPath(row: 1, section: 0) as? ToggleTableViewCell)

        fooCell.toggle.isOn = true
        barCell.toggle.sendActions(forControlEvent: .valueChanged)
        
        XCTAssertEqual(
            manager._settings,
            [
                Setting(name: “Foo”, isEnabled: false),
                Setting(name: “Bar”, isEnabled: true)
            ]
        )
    }
}
```

1. I use the subject factory paradigm here, instead of overriding and using `setup()`. This is mostly a style choice, but it does allow me to compose different subject factory functions depending on the needs of a test, while still overall sharing the setup code between each test.
2. Here I simulate a little bit of the view controller lifecycle. Specifically, I only need to cause the view to load, which is done by accessing the `view` property. The `bounds` of the view is then set so that the `tableView` will have a non-zero size. The bounds is set to the iPhone 6s point resolution for no reason. Once the bounds is set, a layout pass is forced, causes the `tableView` to pick up the size of the view as it’s size (per autolayout).
3. In `testShowsCorrectAmountOfCells`, I’m verifying the tableView shows the correct amount of cells. This is by first verifying that there’s only one section, and then verifying that there’s only as much cells in that section as there are settings objects. It’s important to use the actual value we expect to see. If the test was `XCTAssertEqual(subject.tableView.numberOfRows(inSection: 0), settings.count)`, then this is actually a weaker test because your test is not verifying the behavior you expect to see, but instead is duplicating the behavior. Put another way, it’s the difference between `assert(2 + 4 == 6)` and `assert(2 + 4 == 2 + 4)`.
4. In `testEachCellRepresentsASetting`, I’m now verifying the contents of the cells.
    1. First, I’m getting each cell by their respective `IndexPath`. Note that `UITableView`’s [`cellForRow(at:)`](https://developer.apple.com/documentation/uikit/uitableview) method returns nil both when the given `IndexPath` is outside of the `UITableView`’s range, and when the requested cell is not visible. In other words, [`cellForRow(at:)`](https://developer.apple.com/documentation/uikit/uitableview) will only work for cells that have already been loaded. If you want to request a cell not yet visible (not within the bounds of the `UITableView`), then you need to go directly to the underlying `UITableViewDataSource`, using the [`tableView(:cellForRowAt:)`](https://developer.apple.com/documentation/uikit/uitableviewdatasource/1614861-tableview) method. I use this as `let cell = tableView.dataSource?.tableView(tableView, cellForRowAt: IndexPath(row: 0, section: 0))`, which allows me to avoid publicly exposing whatever data source is used.
    2. Immediately after retrieving the cell, I use [`XCTUnwrap`](https://developer.apple.com/documentation/xctest/3380195-xctunwrap) to avoid force-casting. `XCTUnwrap` will throw an error if the received value is nil, thus causing a test failure instead of crashing the entire test suite. This is done because [`XCTAssertTrue`](https://developer.apple.com/documentation/xctest/1500984-xctasserttrue)/[`XCTAssertFalse`](https://developer.apple.com/documentation/xctest/1500932-xctassertfalse) do not work with optionals.
    3. Note that, like before, we assert that the cell’s `textLabel?.text` is equal to a static string instead of retrieving the appropriate `Setting` instance and comparing it to that instance’s `name` property. This is, again, done to avoid the mistake of [tautological testing](https://randycoulman.com/blog/2016/12/20/tautological-tests/) - your tests should not follow the same algorithm used to get the value you’re asserting on.
    4. It’s important to note that you should unroll loops inside of your tests as much as possible, to make it obvious when and where a test failure is. This is not to say that you shouldn’t have assertion helpers/reusable tests, but, as with most things, it depends. When in doubt, err in favor of duplicated assertions.
5. In `testTogglingUpdatesTheSettingsManager`, we’re verifying the interaction between the toggle switches and the settings manager. This is also the first test to actually use both objects returned in the tuple from the `subjectFactory` method, and that’s because it’s the first one where we’ll actually be examining the state of the `SettingsManager`. This is going to start out looking much the same as `testEachCellRepresentsASetting`, but instead we’re going to model what interacting with a switch should do.
    1. This is part of the step of modeling what happens when the user toggles a switch - first I toggle the `isOn` property, then I tell the switch to send the actions for the `valueChanged` `UIControl.Event` - as per the [`UISwitch` documentation](https://developer.apple.com/documentation/uikit/uiswitch). You’ll note that I do this instead of, say, calling the `onToggle` property of the given cell. This is because the particular mechanism used to notify the view controller/model that the UI changed is an implementation detail and is tested by using the `UISwitch`. In other words, by using `UISwitch.sendActions(for:)`, I’m indirectly asserting the `onToggle` mechanism, in addition to asserting that the `UISwitch` on the `ToggleTableViewCell` was correctly set up. This also has the additional benefit of making it easier to change how the toggle switch -> update SettingsManager in the future - I don’t need to update the tests and, done right, it’s a green-to-green refactor.  
       Sometimes, I create an extension on the more commonly used controls in my code base to consolidate the “update control state” and “send actions” calls.[^1]
    2. This assertion is doing two things: It’s verifying the behavior that the correct arguments are passed to the `SettingsManager`’s `set(isEnabled:setting:)` - which is the desired behavior to verify - and it’s also verifying that no other calls are made to the SettingsManager that would affect state (or at least, the other calls cancel each other out). I’ve also implemented fake implementations of properties such that they record the arguments and then I assert that the correct arguments are passed. With more complex protocols, or where the “Simple” implementation isn’t essentially an in-memory database, I will do that. But for something like this? It’s more of a style choice than anything else.
    3. As with earlier, we do this again, for the other cell.

## Quick
The implementation of these tests using Quick has slightly less repetition, and reads immensely better. The notes I write will be contrasting the Quick implementation of the test with the XCTest implementation, so read the above notes for any questions.

```swift
// I like to alphabetize my imports.
import Quick
import UIKit
import Nimble

class SettingsViewControllerSpec: QuickSpec {
    override func spec() {
        var subject: SettingsViewController!
        var settingsManager: SimpleSettingsManager!
        
        beforeEach {
            settingsManager = SimpleSettingsManager()
            settingsManager._settings = [
                Setting(name: “Foo”, isEnabled: true),
                Setting(name: “Bar”, isEnabled: false)
            ]
            
            subject = SettingsViewController(settingsManager: settingsManager)
            viewController.view.bounds = CGRect(x: 0, y: 0, width: 375, height: 667)
            viewController.view.layoutIfNeeded()
        }
       
        it(“has a row for each cell”) { // 1
            expect(subject.tableView.numberOfSections).to(equal(1))
            expect(subject.tableView.numberOfRows(inSection: 0)).to(equal(2))
            // 2
        }
        
        describe(“the first cell”) { // 3
            var cell: ToggleTableViewCell?
            beforeEach {
                cell = subject.tableView.cellForRow(at: IndexPath(row: 0, section: 0)) as? ToggleTableViewCell
            }
            
            it(“shows the first setting’s name”) {
                expect(cell?.textLabel?.text).to(equal(“Foo”))
            }
            
            it(“sets the toggle’s isOn to reflect the setting’s isEnabled”) {
                expect(cell?.toggle.isOn).to(beTrue())
            }
            
            context(“when toggled”) {
                beforeEach {
                    cell?.toggle.isOn = false
                    cell?.toggle.sendActions(for: .valueChanged)
                }
                
                it(“updates the settings manager with the new value”) {
                    expect(settingsManager._settings).to(equal([
                        Setting(name: “Foo”, isEnabled: false),
                        Setting(name: “Bar”, isEnabled: false)
                    ]))
                }
            }
        }
        
        describe(“the second cell”) {
            var cell: ToggleTableViewCell?
            beforeEach {
                cell = subject.tableView.cellForRow(at: IndexPath(row: 1, section: 0)) as? ToggleTableViewCell
            }
            
            it(“shows the second setting’s name”) {
                expect(cell?.textLabel?.text).to(equal(“Bar”))
            }
            
            it(“sets the toggle’s isOn to reflect the setting’s isEnabled”) {
                expect(cell?.toggle.isOn).to(beFalse())
            }
            
            context(“when toggled”) {
                beforeEach {
                    cell?.toggle.isOn = true
                    cell?.toggle.sendActions(for: .valueChanged)
                }
                
                it(“updates the settings manager with the new value”) {
                    expect(settingsManager._settings).to(equal([
                        Setting(name: “Foo”, isEnabled: true),
                        Setting(name: “Bar”, isEnabled: true)
                    ]))
                }
            }
        }
    }
}
```

This makes the same assertions that the XCTest version does, but the setups aren’t repeated, and the individual assertions are broken up and given their own `it` blocks. This also doesn’t group the toggling assertions in to a single test, and so the toggle interactions for each setting cell can be tested by themselves.

1. In Quick and other [rspec](http://rspec.info)-like frameworks[^2], the `it` blocks are tests, similar to `test*` functions in `XCTest`.
2. The `expect(...).to(equal(...))` syntax comes from Nimble. I like this because it makes it provides some nice syntax sugar to differentiate what you’re asserting on, and what you expect the value to be. The `equal`, `beTrue`, `beFalse` functions are called Matchers, and Nimble has a pretty good API for writing custom matchers. This provides a much more declarative way for verifying views.
3. Where `it` blocks declare tests, `describe` and `context` blocks declare groups of tests. You can even nest `describe` and `context` blocks (but not `it` blocks) as much as you’d like. This allows Quick to better match the event-driven asynchronous behavior.

I mentioned earlier that you should err on the side of duplicating tests, but this Quick spec demonstrates one of the areas where I would re-use assertions. I’d change the tests to look like this:

```swift
import Quick
import UIKit
import Nimble

class SettingsViewControllerSpec: QuickSpec {
    override func spec() {
        var subject: SettingsViewController!
        var settingsManager: SimpleSettingsManager!
        
        beforeEach {
            settingsManager = SimpleSettingsManager()
            settingsManager._settings = [
                Setting(name: “Foo”, isEnabled: true),
                Setting(name: “Bar”, isEnabled: false)
            ]
            
            subject = SettingsViewController(settingsManager: settingsManager)
            viewController.view.bounds = CGRect(x: 0, y: 0, width: 375, height: 667)
        viewController.view.layoutIfNeeded() // 2
        }
       
        it(“has a row for each cell”) {
            expect(subject.tableView.numberOfSections).to(equal(1))
            expect(subject.tableView.numberOfRows(inSection: 0)).to(equal(2))    
        }
        
        func itBehavesLikeACell(row: Int, name: String, isOn: Bool, updatedSettings: [Setting]) {
            var cell: ToggleTableViewCell?
            beforeEach {
                cell = subject.tableView.cellForRow(at: IndexPath(row: row, section: 0)) as? ToggleTableViewCell
            }
            
            it(“shows the first setting’s name”) {
                 expect(cell?.textLabel?.text).to(equal(name))
            }
            
            it(“sets the toggle’s isOn to reflect the setting’s isEnabled”) {
                expect(cell?.toggle.isOn).to(equal(isOn))
            }
            
            context(“when toggled”) {
                beforeEach {
                    guard let toggle = cell?.toggle else { return }
                    toggle.isOn = !toggle.isOn
                    toggle.sendActions(for: .valueChanged)
                }
                
                it(“updates the settings manager with the new value”) {
                    expect(settingsManager._settings).to(equal(updatedSettings))
                }
            }
        }
        
        describe(“the first cell”) {
            itBehavesLikeACell(
                row: 0,
                name: “Foo”,
                isOn: true,
                updatedSettings: [
                    Setting(name: “Foo”, isEnabled: false),
                    Setting(name: “Bar”, isEnabled: false)
                ]
            )
        }
        
        describe(“the second cell”) {
            itBehavesLikeACell(
                row: 1,
                name: “Bar”,
                isOn: false,
                updatedSettings: [
                    Setting(name: “Foo”, isEnabled: true),
                    Setting(name: “Bar”, isEnabled: true)
                ]
            )
        }
    }
}

```

This does make the tests much harder to update if, for example, you wanted to assert on different behavior for some specific case. It’s also slightly harder to read. But it’s very helpful to reduce clutter when verifying the shared behavior of different objects.

Instead of using a function, you can also use Quick’s [`sharedBehavior`](https://github.com/Quick/Quick/blob/master/Documentation/en-us/SharedExamples.md#shared-examples). You would pass in different arguments to the `sharedBehavior` tests as a dictionary that’s created for each test. This has some benefits, but they do not outweigh the benefit of type safety that using a function provides.

And that’s an introduction to writing unit tests against UIKit. Hopefully this is enough to get started with simple interactions between a view and a model. Later posts will deal with mimicking interactions with other `UIControl`s, interactions between `UIViewController`s, handling other kinds of asynchronous behavior, writing custom Nimble matchers, and more.

[^1]: For example, my test helper for `UISwitch` looks like:

```swift
import UIKit

extension UISwitch {
    func toggle() {
        isOn = !isOn
        sendActions(for: .valueChanged)
    }
}
```

Other `UIControl`’s are more complex, and, as such, I have more complex helpers for them.

[^2]: These are called rspec-like because rspec was the first framework (or at least, the first popular framework) with this style of branching syntax. They are also known as BDD frameworks.