---
layout: post
title: Automating Mobile Releases
date: 2016-11-02
tags: mobile, releases, automated, ci, fastlane
---

This is based on a talk I gave at Uber Mobility on November 1st, 2016 (yesterday).

Automating your deploys means using Continuous Integration (CI) to deploy. CI is a machine (or set of machines) that exists to run scripts on your code in response to commits getting pushed.

## Process

First, process, because my process is not your process (and that's ok!), but we need a shared basis to start from.

This post assumes an agile process, specifically extreme programming. This also focuses on a developer's perspective.

When doing the initial development, write tests. I practice TDD, and I work for a company that practices TDD (Pivotal), but even without it, the point is comprehensive (and good) test coverage. No code should be written without an accompanying (valid!) test. Writing good tests is it's own post, and this will be long enough as is.

Next, after the feature is done, it’s committed and pushed to some git repository. This git repository interacts with a CI system whenever a new commit is pushed - either by being polled by the CI, or by notifying the CI system. The CI will check out the git repository at that commit and run all the tests. Most high profile open source projects have a similar setup, where commits are checked by a third-party CI system to ensure that tests pass in a clean environment.

At Pivotal, we rarely do feature flagging, we commit directly to master, and by virtue of TDD, we usually are able to keep master green.

Every once in a while, ideally after a build passes CI, but more than likely just once or twice a day, someone or something will take the repo and perform steps to deliver a build; a build is uploaded to a staging environment so that a product manager can accept the new features/bug fixes/whatever was changed.

Even less often, maybe once a week, a release will be cut, and another build based on an accepted build will be uploaded to production.

## Why should you automate your deployments

First, it frees up the human who otherwise would have done the deployment to do other things, including taking a break.

Second, it ensures that your deployments are much more consistent as it's followed by a computer that is much less likely to screw up than a human.

Third, this helps shorten the build-test-release cycle - because deployments take time and essentially prevent whoever is doing the deployment from doing something else, you're much more inclined to only do the deployment once a day or even less often. However, if you have some automated system do your deployment, you can do a deployment as often as whenever a commit is pushed.

Last, automating deployments ensures that your deployments are reproducible. Your deploy script becomes the source of truth for how to deploy, and it's not siloed in one single person.

That said, it’s a lot of work. Backend and web folks have it easy - thanks to PaaSs like Cloud Foundry and Heroku, deploying is trivially automatable. Mobile devs have it much harder - having a containerized server automatically generate blessed builds is a really tough problem, it turns out, one I'll go over in detail later.

## Deployment

The standard manual deployment process looks something like:

- Make sure tests pass (Because we're software engineers, right?)
- Create a build for release.
- Gather metadata
  - Release Notes
  - Screenshots
  - Other
- Use your browser to upload the build and metadata to the desired environment.

This is a very slow, time-consuming and error-prone process. It's very tempting to shortcut the process - "eh, tests probably pass, so I'll skip them", "Did I remember to build turn on optimizations? Oh well", "the UI hasn't changed THAT much, so even with the new changes, I'll not add screenshots", "'Bug fixes and performance improvements' is totally an acceptable release note", and finally "Oh shoot, I didn't sign it with the proper credentials, now I have to redo it".

In contrast, a fully automated deploy is just "well, we finished that feature. Let's push and do another feature." Because your deploy script is scripted, you don't even have the option to skip tests. It always builds for release. You can write a script to autogenerate screenshots for you. Your staging environment can use your git log as your release notes. You should still, however, have an actual human write your release notes for production. Just store them in a place that your deploy script can retrieve from.

### Tests
Testing is a hallmark of good software engineering. However, it's outside the scope of this, so I'll just assume that you know how to test your app, and that you have tests.

Automating these tests are the next thing. It's a super useful thing to be able to invoke `./tests.sh` and go on your way. Usually if you have tests you also have this sort of script existing. If not, I'll direct you to [scan](https://github.com/fastlane/fastlane/blob/master/scan/README.md) from fastlane for a way to automatically run your iOS tests. Android users should have a gradle task set up that runs tests.

### Build Project

Now, let's build the project. Android utilizes gradle, and iOS has xcodebuild. Both are the underlying tools used to build the project, and they're both accessible from the command line.

#### Blessing an iOS build

Building for release also involves blessing the build with the correct code signing identity and provisioning profiles. As anyone who has ever had to debug this can tell you, it is a source of hours of fun (for sarcastic values of fun). There are a few ways to approach this:

1. Only build on pre-blessed machines.
2. Commit your blessing materials to your (private) repository
3. Host your blessing materials in some other (private) repository.

Let's go over each of these approaches:

##### Pre-Blessed machines

These are machines that have been set up to be blessed, and ideally manually confirmed to produce 'blessed' builds. If you use Jenkins, then this is the approach you are likely taking.  
This has issues in that it makes it harder to scale your build process, it makes your CI boxes into special snowcases, and at smaller scales, it raises your operating costs (need to buy those dedicated CI boxes, after all).
It is, however, incredibly convenient because you only have to bless a machine once and that's it. However, if you use a hosted CI solution (i.e. Circle, Travis), then you can't do this.

##### Commit Code Signing Material to Code Repository

If you want to use a CI as a Service (CIaaS) solution (which I recommend for all sorts of reasons), then you need to have some way to re-bless the CI machine each time it runs. This is because all the CIaaS solutions use containerization to ensure that you get a clean machine each time CI runs.

One way to ensure that the container that runs your build is properly blessed is to directly commit your blessing material (code signing keys, provisioning profiles, etc.) directly to your code repository. Once the build starts up, you take the blessing material and correctly insert them to be picked up by the build script.

This does have issues. If you have an open source project, then you can't do this. There are ways to get around that. You can, for example, encrypt your signing materials before you commit them, and decrypt them on the CI box. All CIaaS have ways to load secret environment variables, so just store the encryption/decryption key there. Even if you have a closed source project, you should still encrypt your code signing information as that reduces the damage done if your code gets leaked somehow (don't want random people to be able to sign their code as you).

See [this article on objc.io](https://www.objc.io/issues/6-build-tools/travis-ci/#app-signing) for an example of how to encrypt your code signing materials before uploading them (utilizing Travis CI, Circle CI didn't support iOS at the time the article was published).

##### Host Blessing Material Elsewhere

Another approach that still allows you to use CIaaS is to store your code signing materials in some other repository that's not your code. This is the approach that [Fastlane's match](https://github.com/fastlane/fastlane/tree/master/match#readme) utilizes.

The basic idea is that you have your code blessing material stored in some repository not your code repository, and your CI scripts know how to correctly interface with that repository. This works because it means you don't have to store your code signing identies in every repository you have, and makes it much easier to update all your apps in the event that the code signing identity has to change. This is the approach I take for my personal apps (utilizing [Fastlane's match](https://github.com/fastlane/fastlane/tree/master/match#readme)).

### Gathering Metadata

In my apps, the only metadata that I care to change between app store deployments are the screenshots and the release notes.

The only reason I change the screenshots is because I have that process automated, and for the longest time, I had my release notes be an edited version of the git log.

#### Screenshots

Thankfully, screenshots are a thing you really only have to worry about for production.

Creating Screenshots manually is time consuming and error prone. Even if you do it perfectly, generating screenshots for all your device sizes and localizations takes forever. Let's change that and automate it. You can (ab)use the UI Testing frameworks provided by both platforms to automatically generate screenshots for various screen sizes and localizations.

For Android, I would recommend looking at [Fastlane's screengrab](https://github.com/fastlane/fastlane/tree/master/screengrab) as a tool for utilizing Android's UI Testing to autogenerate screenshots.

For iOS, I have used [Fastlane's snapshot](https://github.com/fastlane/fastlane/tree/master/snapshot) to autogenerate screenshots.

#### Release Notes

Release notes should be human generated, but uploaded to a consistent place. Nowadays, I prefer it when the PM (or whoever writes the release notes) attaches the screenshots to the "release" story in the project tracker. This even works for internationalized versions - english notes are attached as "release\_notes.en.txt", german would be "release\_notes.de.txt", and a script can take those and place them in the appropriate place for [deliver](https://github.com/fastlane/fastlane/blob/master/deliver/README.md) to find.

#### Versioning

This is both the build number and the version string. The build number can easily be automatically generated from a number of ways - I prefer the number of commits in the git history. The version string can also be generated in an automated way - I prefer the output of `git describe --tags`, which works both for tagged commits and untagged commits!

### Upload

Once we have the build and the associated metadata, we need to gather these up and upload them to the desired environment.

Deciding between environments is relatively easy to automate. Personally, I just tag a commit intended for production as "v[major].[minor].[bugfix]" - standard semantic versioning. Anytime a tag of that format is pushed, I have CI build for release.

As for actually uploading, that depends on what environment you're uploading to. Most environments should have a simple RESTful API to upload things. For places like Google Play, the App Store, and Testflight, I'm going to once again point to fastlane for [supply](https://github.com/fastlane/fastlane/blob/master/supply/README.md), [deliver](https://github.com/fastlane/fastlane/blob/master/deliver/README.md), and [pilot](https://github.com/fastlane/fastlane/blob/master/pilot/README.md) respectively. Hopefully your Enterprise MDM has a RESTful API to automate this, otherwise submit a feature request and talk about how much hours are wasted each day doing manual deployments?

## Automated Deployment

Once you have all of these automated, this is a decent stopping-point for semi-automated deployment, especially for small teams. Just run the deploy script from a workstation and go take a break.

But, to me, this isn't far enough. I don't want my workstation to be tied up while the deploy happens. Maybe I just came back from a break and don't feel like taking another one.

Well, why not have CI do your deploy? CI is a clean environment that operates on your code. Typically, it just runs the tests to make sure the build is "green". You can also tell your CI to do your deploys. That way, you don't even have to modify your standard workflow, deploys just happen as a result of a push.

### Which CI?

Because of my job as a consultant, I am in the unique position of getting to try out a new CI solution multiple times a year. In my two years at Pivotal (thus far), I've used 4 different CI systems: [Xcode Server](https://developer.apple.com/library/content/documentation/IDEs/Conceptual/xcode_guide-continuous_integration/), [Travis CI](https://travis-ci.com), [Circle CI](https://circleci.com), and [Concourse](https://concourse.ci).

Xcode Server was used entirely because it was easier to set up than Jenkins. The lead for this project spent 2 days trying to set up Jenkins before giving up. I suggested Xcode Server (because at the time Concourse wasn't usable for iOS CI), and spent half a day to set up. Maintaining Xcode Server was a pain in the ass (multiple times it lost our entire build history, properly blessing it was annoying because it runs as \_xcsbuildd) Xcode Server could be great, but it's obvious that Apple doesn't dogfood it.

Travis CI and Circle CI are my go-to for CIaaS. Of late, I've been recommending Circle over Travis (Circle doesn't require a command line tool to set secret environment variables), but they're essentially the same. They're relatively cheap, and they scale reasonably well. For every client project I've been on except the one where I learned how fun Xcode Server is, we've used either Travis or Circle.

Concourse is a new CI solution sponsored by Pivotal, created to address the unique problems Cloud Foundry ran into in CI. CI is broken up into jobs that run on their own containerized workers. Jobs can depend on the success (or failure) of other jobs. Meaning that Concourse has built-in support for pipelines. Concourse itself pretty much just manages workers and delegates jobs out to them, which makes it scale up really well. However, Concourse is painful to first set up if you're not familiar with any of the technologies it utilizes (once you learn BOSH, you're good. I didn't know BOSH when I first tried to use Concourse). Additionally, once Concourse is set up, you still need to configure mac workers to talk to it. Overall, I don't use Concourse for client iOS projects, but for internal projects and personal projects, it's my first choice.

## Advanced Things

These are bits of advanced things that I didn't feel the need to go into during the actual talk, but I figured I should talk talk about otherwise.

### Reusing Binaries

The idea behind reusing binaries is that you make a build and send it through staging. Then, QA or whoever signs off on it and you deploy that binary to production, without having to rebuild from source. Not only does this save you the time spent recompiling from source, but (more importantly) it allows you to verify that you are deploying to production the actual build that QA signed off on (because dependencies and such might have slightly changed on you - or you upgraded compilers between your staging deploy and your production deploy and that might have introduced bugs).

Personally, I do not have the discipline to do this for my personal projects, and in my professional career I've yet to run into issues that this would have solved. For my uses, binary reuse is an optimization step more than anything else.

So, you've decided to do this... how? First, you need to save off the raw build artifact. In iOS, if you use Testflight as your staging environment and the app store as your deploy environment, then you can save the .ipa you send to Apple. Otherwise, you need to save the unsigned and unprovisioned build to, say, s3, then sign and provision that build before uploading to your staging environment.

When you do decide to deploy to production, your deploy task needs to take that build from s3 (or wherever you stored it), sign and provision it, then upload to prod.

As I understand it, this is much easier to do on Android.

### Deploying Only Signed Commits/Tags

I'm not going to go into why [you should cryptographically sign your commits/tags](http://programmers.stackexchange.com/questions/212192/what-are-the-advantages-and-disadvantages-of-cryptographically-signing-commits-a), but assuming you decide to do this, you'll want to only deploy commits that are actually from members of your dev team.

To do this, you need to upload your teams GPG public keys to your CI server. Depending on your CI system, you running into a trust problem - for example, as of right now, neither Circle or travis has no way to upload your GPG keys independent of the circle.yml or .travis.yml file. Which means that you need to trust that a malicious committer didn't think to add a false gpg key to the ci configuration file. On the other hand, Concourse, by virtue of not being a hosted CI platform, allows you to add GPG keys entirely independent of your repository. Concourse has gpg-checking [built in to the git resource](https://github.com/concourse/git-resource#gpg-signature-verification), which won't allow any builds to happen if specified.

## Go Forth and Deploy

Automating your deployments can be a very frustrating experience with a high up-front time-cost. However, once it works, it pays for itself immensely just by not having to think about your deployments. And if something does go wrong, CI will go red, alerting you to the issue. Staging deployments are as easy as `git push`, and production deployments are as simple as `git tag $VERSION_NUMBER; git push origin $VERSION_NUMBER`. 

Stop worrying and let CI deploy for you.
