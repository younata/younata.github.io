---
layout: post
title: Setting Up a macOS Worker with Concourse
date: 2016-11-08
tags: ios, concourse, ci
---

Setting up a macOS worker with Concourse is interesting. Because of licensing issues (as I understand it), you can't just provisioning a mac box on AWS to be a worker, you need to use your own hardware. For that, there does exist a process to configure your Concourse installation to accept external workers (which your mac would be).

I recommend purchasing a separate mac to be a worker (if you don't already have an extra mac to use). Given the [current state of the mac lineup](http://buyersguide.macrumors.com/#Mac) (as of November 2016), I would recommend buying secondhand macs. The point is to not use someone's workstation as your worker.

This assumes you already have a [Concourse installation w/ bosh setup]({% post_url 2016-11-08-concourse-aws %}).

## Configuring the Mac Worker

To configure a Mac worker with Concourse, there's a few steps we need to do.

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

### Houdini & Concourse Connection

Next, we need to install Houdini (a no-op Garden backend for macOS). Houdini executes jobs that Concourse hands it. Normally, Concourse jobs are executed in there own virtual machines (containers), which guarantees that an individual job is executed in a clean environment (without affecting the host system). These containers are started up from stemcells (preconfigured virtual machines). For various reasons (my understanding is licensing issues, but that may be wrong), there are no publicly available stemcells of macOS, and the workaround to this is Houdini, which runs a job without any virtualization. Alternatively, you could probably create stemcells for macOS and configure a worker to run jobs on them, but I have no idea how to do that. So, let's set up Houdini and connect it to your Concourse instance.

01. Make a clean directory for the worker's files:
    
    ```bash
    $ mkdir /usr/local/concourse_worker
    ```

02. Create an ssh key for the worker to talk with Concourse:

    ```bash
    $ ssh-keygen -t rsa -f /usr/local/concourse_worker/worker_id_rsa -N ''
    ```

03. Add the key to the TSA in your concourse Manifest (see the [oncourse/bosh documentation](https://concourse.ci/clusters-with-bosh.html#section_configuring-bosh-tsa) for more information):

    ```yml
    instance_groups:
    - name: web
      # rest of web config
      jobs:
      - name: atc
        # atc config
      - name: tsa
        # rest of tsa config
        - properties:
          host_key: # contents of tsa private key
          host_public_key: # contents of tsa public key
          authorized_keys:
            - # contents of worker public key
    ```

04. Redeploy your concourse:

    ```bash
    $ bosh deploy
    ```

05. [Download the latest Houdini](https://github.com/vito/houdini/releases/latest) and install it to `/usr/local/concourse_worker`:

    ```bash
    $ install ~/Downloads/houdini_darwin_amd64 /usr/local/concourse_worker/houdini
    ```
06. Create a worker file (in ~/concourse_worker/worker.json) to describe the new worker:

    ```bash
    $ echo '{ "name": "osxworker", "platform": "darwin" }' > /usr/local/concourse_worker/worker.json
    ```

07. Write a script to run houdini, place it in `/usr/local/concourse_worker/run-houdini.sh`:

    ```bash
    #!/bin/sh

    export PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin
    /usr/local/concourse_worker/houdini -depot=/usr/local/concourse_worker/containers
    ```

08. Write a launchctl plist to manage the ssh tunnel script, place it in `/usr/local/concourse_worker/com.example.concourse.houdini.plist` (replace com.example with your reverse domain name):

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
        <string>com.example.concourse.houdini</string>
        <key>Nice</key>
        <integer>0</integer>
        <key>ProgramArguments</key>
        <array>
        <string>/usr/local/concourse_worker/run-houdini.sh</string>
        </array>
        <key>RunAtLoad</key>
        <true/>
    </dict>
    </plist>
    ```

09. Write a script to run an ssh tunnel between the worker and your concourse installation, place it in `/usr/local/concourse_worker/ssh-tunnel.sh` (replace ci.example.com with your concourse host):

    ```bash
    #!/bin/sh

    ssh -p 2222 ci.example.com -i /usr/local/concourse_worker/worker_id_rsa -R 0.0.0.0:0:127.0.0.1:7777 forward-worker < /usr/local/concourse_worker/worker.json
    ```

10. Write a launchctl plist to manage the ssh tunnel script, place it in `/usr/local/concourse_worker/com.example.concourse.ssh-tunnel.plist`:

    ```xml
    <?xml version="1.0" encoding="UTF-8"?>
    <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
    <plist version="1.0">
    <dict>
        <key>KeepAlive</key>
        <true/>
        <key>Label</key>
        <string>com.example.concourse.ssh-tunnel</string>
        <key>Nice</key>
        <integer>0</integer>
        <key>ProgramArguments</key>
        <array>
            <string>/usr/local/concourse_worker/ssh-tunnel.sh</string>
        </array>
        <key>RunAtLoad</key>
        <true/>
    </dict>
    </plist>
    ```

11. Install the 3 launchctl scripts for the user:

    ```bash
    $ cp /usr/local/concourse_worker/*.plist ~/Library/LaunchAgents/
    ```

12. Open System Preferences and set the machine to automatically log in:

    ![AutoLoginImage](/assets/concourse_houdini_auto_login.png)

Now, if you reboot, you should be see that this machine is now a worker for your concourse instance.

To manually ensure that you correctly configured houdine, then simply run the `/usr/local/concourse_worker/run-houdini.sh` and the `/usr/local/concourse_worker/ssh-tunnel.sh` scripts in separate terminals. You should see output that indicates the worker is correctly configured.

Otherwise, to run houdini and connect it to your concourse installation, run

```bash
$ launchctl load ~/Library/LaunchAgents/com.example.concourse.houdini.plist
$ launchctl load ~/Library/LaunchAgents/com.example.concourse.ssh-tunnel.plist
```

Or, just reboot.

## Configuring jobs to use the Mac Worker

Now you should have a mac worker to run tasks for you. To configure a job to use your mac worker, just specify `darwin` as the platform in the task file. For example, see [this task file](https://github.com/younata/RSSClient/blob/master/concourse/tests.yml) from one of my iOS projects.