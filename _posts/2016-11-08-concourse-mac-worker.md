---
layout: post
title: Setting Up a macOS Worker with Concourse
date: 2016-11-08
tags: ios, concourse, ci
---

Update 2019-05-11: Massively simplified this, now that running houdini directly is no longer needed.

Setting up a macOS worker with Concourse is much easier than it used to be. Now, it's more-or-less plugin and play with the concourse command itself.

I recommend purchasing a separate mac to be a worker, though if you have an extra mac laying around, this is also a good use for it.

This assumes you already have a Concourse installation setup.

## Configuring the Mac Worker

### Build Dependencies

First, ensure that the mac is correctly set up to build things, including:

01. Install latest Xcode
02. Install command line tools

    ```bash
    $ xcode-select --install
    ```

03. Accept the Xcode license:

    ```bash
    $ sudo xcodebuild -license
    ```

04. Enable developer mode:

    ```bash
    $ sudo DevToolsSecurity -enable
    ```

05. Do any other bits of manually provisioning that is needed to perform jobs for your pipeline (i.e. install provisioning profiles and signing identities).

Second, disable sleeping on the mac:

```bash
sudo systemsetup -setcomputersleep Never
```

### Setting up the Concourse Worker

On linux (and windows), concourse will create 

Next, we need to install the concourse command. Normally, Concourse jobs are executed in there own containers, which guarantees that an individual job is executed in a clean environment (without affecting the host system). The containerization technology doesn't exist for macOS, so we can only use the "folderization" technology - that is, run each job in a different folder and hope they clean up after themselves and don't interfere with the rest of the system..

1. Make a clean directory for the worker's files:
    
    ```bash
    $ mkdir -p /usr/local/concourse/work_dir
    $ mkdir -p /usr/local/concourse/keys
    ```

2. Create an ssh key for the worker to talk with Concourse:

    ```bash
    $ ssh-keygen -t rsa -f /usr/local/concourse/keys/worker_id_rsa -N ''
    ```

3. Add the (public!) key to your concourse host server's authorized keys.

4. Restart your concourse web instance

5. [Download the latest Concourse](https://github.com/concourse/concourse/releases/latest) and expand it in `/usr/local/concourse`:

    ```bash
    $ tar -xzf ~/Downloads/concourse-$VERSION-darwin.amd64.tgz /usr/local/concourse/
    ```

6. Write a script to run concourse, place it in `/usr/local/concourse/bin/run-worker.sh`:

    ```bash
    #!/bin/sh -l

    cd /usr/local/concourse
    /usr/local/concourse/bin/concourse worker \
        --work-dir /usr/local/concourse/work_dir \
        --tsa-host $CONCOURSE_HOST:2222 \
        --tsa-public-key /usr/local/concourse/keys/tsa_host_key.pub \
        --tsa-worker-private-key /usr/local/concourse/keys/worker_key
    ```

7. Write a launchctl plist to manage the worker script, place it in `~/Library/LaunchAgents/com.rachelbrindle.concourse.worker.plist`:

    ```xml
    <?xml version="1.0" encoding="UTF-8"?>
    <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
    <plist version="1.0">
    <dict>
        <key>AbandonProcessGroup</key>
        <true/>
        <key>KeepAlive</key>
        <true/>
        <key>Label</key>
        <string>com.rachelbrindle.concourse.worker</string>
        <key>Nice</key>
        <integer>0</integer>
        <key>ProgramArguments</key>
        <array>
        <string>/usr/local/concourse/bin/run_worker.sh</string>
        </array>
        <key>RunAtLoad</key>
        <true/>
    </dict>
    </plist>
    ```

8. Open System Preferences and set the machine to automatically log in:

    ![AutoLoginImage](/assets/concourse_houdini_auto_login.png)

Now, if you reboot, you should be see that this machine is now a worker for your concourse instance.

Otherwise, to run the worker and connect it to your concourse instance, run

```bash
$ launchctl load ~/Library/LaunchAgents/com.rachelbrindle.concourse.worker.plist
```

## Configuring jobs to use the Mac Worker

Now you should have a mac worker to run tasks for you. To configure a job to use your mac worker, just specify `darwin` as the platform in the task file. For example, see [this task file](https://github.com/younata/RSSClient/blob/master/concourse/tests.yml) from one of my iOS projects.
