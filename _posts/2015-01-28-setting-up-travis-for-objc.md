---
layout: post
title: "Setting up Travis-CI for Objective-C/Swift"
date: 2015-01-28
tags: travis, objc, swift, setup
---

I have done this way too many times.

####Create a Rakefile to run your tests
Create a Rakefile to run your tests. [Here's](https://github.com/younata/Ra/blob/master/Rakefile) an implementation from my [Ra](https://github.com/younata/Ra) project.

####Set up .travis.yml

Create a .travis.yml file in your root directory with the following contents:

    language: objective-c

    before_install: git submodule update --init --recursive
    script: "rake"

If you're using cocoapods, great, travis will automatically run pod init/pod update for you. If you have submodules, you want to add `before_install: git submodule update --init --recursive
` to the file.

####Make your schemes shared.
Go to Product->Scheme->Edit Schemes and mark the schemes you want tested as shared. (In the example of [Ra](https://github.com/younata/Ra), this is `Ra` and `Ra-iOS`).

Don't forget to add them to your git repo (they're in `$project.xcodeproj/xcshareddata/xcschemes/*.xcscheme`).

Additionally, don't forget to add the Rakefile and the .travis.yml when you commit (should be at least 3 files: `Rakefile`, `.travis.yml`, and `$project.xcodeproj/xcshareddata/xcschemes/*.xcscheme`).
