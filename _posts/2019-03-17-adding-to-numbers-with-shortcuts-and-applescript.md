---
layout: post
title: Adding to a Numbers Spreadsheet from Shortcuts using Applescript
date: 2019-03-17
tags: numbers add append shortcuts applescript mac ios automation
---

I'm currently a student pilot, training to get my private pilot's license so I can putter around in the sky, bypass traffic, and have fun. I wanted to keep track of how much I'm spending on this endeavor in the form of a numbers spreadsheet[^1]. After months of manually entering in all this information post-flight, I felt the urge to make this 2-minute task slightly easier - automatically add today's date, automatically add a new row, note if I was PIC[^2], etc. I channeled my inner [@viticci](https://twitter.com/viticci) and spent the next few days figuring out how to automate this data entry.

What kept me from doing this earlier was the simple fact that as of this writing there's no way to script the iOS version of Numbers. As it turns out, the Mac version of Numbers is very scriptable, and has been for ages. I never considered having a Mac do the work until I saw [Federico's piece on using a Mac from iOS](https://www.macstories.net/ipad-diaries/ipad-diaries-using-a-mac-from-ios-part-1-finder-folders-siri-shortcuts-and-app-windows-with-keyboard-maestro/).

<video controls>
    <source src="https://cdn.buttify.io/append_to_spreadsheet/log_flight.mp4" type="video/mp4">
    <a href="https://cdn.buttify.io/append_to_spreadsheet/log_flight.mp4">log_flight.mp4</a>
</video>

# Log Flight Shortcut

The shortcut itself is fairly straight forward:

- Ask for number of hours flown
- Ask for number of hours of ground instruction received (default 0)
- Ask for the FBO[^3] you flew out of
  - If it's not one of the stored FBOs:
    - Ask for the combined flying rate (i.e. rental rate for the plane + any instructor rates)
    - Ask for rate of ground (but only if ground hours is above 0)
    - Ask if you were PIC.
  - Otherwise, it uses data stored in an all_fbos dictionary, which has the rates for the FBO I use (both solo and when I receive instruction).
- Ask for any notes
- Run the log_flight.applescript script on my always-on reachable-from-everywhere mac mini.

# log_flight.applescript

I spent the bulk of my time on this researching how to actually use AppleScript, and then how to use it to append to a spreadsheet.

The current source for [log_flight.applescript is on my github](https://github.com/younata/applescripts/blob/master/log_flight.applescript), we'll be analyzing it now and how it came to it's current form.

## Opening a Spreadsheet stored in iCloud Drive

The first thing I wanted to know was "how do I tell numbers to open to a document stored in icloud drive that may or may not be open?". After much longer than I care to admit, I had the following:

```applescript
tell application "Numbers"
    activate
    
    set icloudDrive to (path to home folder as text) & "Library:Mobile Documents:"
    set numbersSheets to icloudDrive & "com~apple~Numbers:Documents:"

    open numbersSheets & "Aviation Costs.numbers"
end tell
```

Which runs fine ONLY when you run it from ScriptEditor.app. Once you try to run it from the command line `osascript` command, Numbers pops up with an "Unable to open file" error [^4].

![](/assets/append_to_spreadsheet/unable_to_open.png)

So, this one thing left me with two problems:

1. How do I reliably open an icloud drive document from the CLI?
2. How do I verify that the correct spreadsheet is open before I do anything to it?

Solving the first turned out to be relatively easy: Instead of opening the spreadsheet with Numbers, use Finder to open the document, then do the rest of the work in Numbers.

```applescript
tell application "Finder"
    activate

    open (path to home folder as text) & "Library:Mobile Documents:com~apple~Numbers:Documents:Aviation Costs.numbers"
end tell

tell application "Numbers"
    -- [...]
end tell
```

I'll cover the verification problem in the Verification section.

## Parsing CLI Arguments

Now that I could reliably open a spreadsheet, the next problem I wanted to tackle was the CLI arguments. This was a fairly easy task, as each argument maps more-or-less 1 to 1 with a cell I want to append to the table.

I ended up with this:

```applescript
on run argv
    set flight_time to (item 1 of argv) as number
	set ground_time to (item 2 of argv) as number
	set is_pic to item 3 of argv
	set flight_cost to (item 4 of argv) as number
	set ground_cost to (item 5 of argv) as number
	if (count of argv) = 6 then
		set notes to item 6 of argv
	else
		set notes to ""
	end if
end run
```

## Appending Data to a Spreadsheet

Now that I can get arbitrary data from the CLI, and I can open the correct spreadsheet, I want to insert that data into the spreadsheet. This took the form of appending a row to the end of the first spreadsheet. Then finally adding all the relevant data (and doing some formatting) to that new row.

```applescript
tell application "Numbers"
    tell front document
        tell active sheet
            set the selectedTable to the first table
        end tell
        
        tell selectedTable
            add row below last row
            tell last row
                set value of first cell to date_string
                set format of first cell to date and time
                set value of second cell to flight_time
                set value of third cell to ground_time
                set value of fourth cell to total_cost
                set format of fourth cell to currency
                set value of fifth cell to is_pic
                set value of sixth cell to notes
            end tell
        end tell
    end tell
end tell
```

By the way, the accepted cell formats are `{automatic, checkbox, currency, date and time, fraction, number, percent, pop up menu, scientific, slider, stepper, text, duration, rating, numeral system}`

## Today's Date as ISO 8601 String

In addition to all of the CLI inputs, I also wanted to include the current date in the added data.

As it turns out, getting only the year/month/day part of the current date as a string is surprisingly hard. To say that AppleScript is bad at string manipulation would be an understatement.

[Fortunately, other people have figured this out](https://apple.stackexchange.com/questions/106350/how-do-i-save-a-screenshot-with-the-iso-8601-date-format-with-applescript#106378).

The relevant part, if you're curious how it looks:

```applescript
on date_to_iso(dt)
    set {year:y, month:m, day:d} to dt
    set y to text 2 through -1 of ((y + 10000) as text)
    set m to text 2 through -1 of ((m + 100) as text)
    set d to text 2 through -1 of ((d + 100) as text)
    return y & "-" & m & "-" & d
end date_to_iso
```

## Verification

Despite the fact that this program will only ever be called by another program, I still need to do some verification that garbage data isn't being passed in. Or, more importantly, that I'm writing to the spreadsheet I think I'm writing to.

### CLI

This is relatively simple - ensure the correct number of arguments are passed, ensure arguments that should be numbers are numbers, ensure arguments that should be bools are bools[^5], ensure that things work with the optional "notes" argument, and most importantly, output useful error messages.

This is what I ended up with. First, we check the number of arguments, then we try to coerce numeric arguments, then we try to do boolean check/enforcement.

```applescript
on run argv
    try
        set arg_count to (count of argv)
        if arg_count = 0 then
            error "Must be called from command line"
        end if
        if arg_count < 5 then
            error "Too few arguments (expected at least 5, have " & arg_count & ")"
        end if
        if arg_count > 6 then
            error "Too many arguments (expected at most 6, have " & arg_count & ")"
        end if

        set flight_time to (item 1 of argv) as number
        set ground_time to (item 2 of argv) as number
        set is_pic to item 3 of argv
        set flight_cost to (item 4 of argv) as number
        set ground_cost to (item 5 of argv) as number
        if arg_count = 6 then
            set notes to item 6 of argv
        else
            set notes to ""
        end if
		
        if is_pic = "y" then set is_pic to "Y"
        if is_pic = "n" then set is_pic to "N"
		
        if is_pic ­ "Y" and is_pic ­ "N" then
            error "is_pic (third argument) must be either 'y' or 'n'"
        end if
    on error errorMessage
        log errorMessage
        set usage to "Usage: ./add_flight [...]"
        set usage_message to "Error: " & errorMessage & return & usage
        error usage_message
    end try
    -- [...]
end run
```

This tries to give a useful error message, and also prints the usage in the error message.

### Correct Numbers Document is Open

This is a two-step process: First we want to assert there is at least one spreadsheet open, then we want to verify that it's the expected one:

```applescript
tell application "Numbers"
    if not (exists document 1) then error "No document open"
    tell front document
        set doc_name to get name as string
        if doc_name ­ "Aviation Costs" then
            error "Front document is not 'Aviation Costs' (got " & doc_name & ")"
        end if
        -- [...]
    end tell
end tell
```

This uses the fact that the name property of a document is the name of the file without the extension [^6].

And that's that! I hope you learned more about Applescript than you ever wanted to, and I really hope that we get the ability to append rows to spreadsheets directly from Shortcuts soon.

---

[^1]: I want to eventually turn this into an electronic logbook, but for now, a paper logbook works fine.

[^2]: Pilot in Command. For a student pilot, this is the same as stating that the flight was a solo flight (no flight instructor).

[^3]: Fixed Base Operator. A business at an airport that provides services for pilots and aircraft (aircraft rentals, flying lessons, fuel, parking, etc.)

[^4]: This pop-up is only shown to the user, and doesn't raise an error in AppleScript. This means that if you had some other spreadsheet open in numbers, your script will write to that spreadsheet.

[^5]: or rather, are Y/N, and convert "yes", "y", "no", "n" to the correct option.

[^6]: For example, if the file name is "My Spreadsheet.numbers", then the document name is "My Spreadsheet".