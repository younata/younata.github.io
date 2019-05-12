---
layout: post
title: Concourse on Linode (May 2019)
date: 2019-05-12
tags: concourse, ci, linode, configure, set up
---

In November of 2016, I wrote about running [Concourse on AWS]({% post_url 2016-11-08-concourse-aws %}). I ran that for about a month before I realized that the setup I used was cost prohibitive. I got a $500 AWS bill for that month, for something that definitely wasn’t providing me with $500/month of value. I moved to self-host my concourse instance on a mac mini (the same one that’s used as a worker) in my apartment. This was much more affordable, but incredibly finicky. Recently, I got fed up with issues specifically related to running a virtualized linux worker on the machine and decided to migrate the entire thing to run on a linode VPS. This is how I setup a linode VPS to run a concourse web host and a linux worker.

Part of why I delayed moving to linode was because I also spent this time debating buying a NUC to run concourse on, but I ultimately decided that, for my usages, I’ll run into hardware lifetime issues before I break even on the cost (at $400 for a NUC, it’ll take over 3 years at the 2 GB linode plan before it would be cheaper to have bought a NUC. Chances are likely I’ll have ran into some kind of hardware issue by that time).

For reproducibility reasons, the server configuration exists inside of an ansible[^ansible] playbook. This allows me to reuse components of the playbook (e.g. a common setup for adding letsencrypt in front of the technology). This also forced me to document what I did to originally set up the server, which should make upgrading and maintaining this long term much easier than it otherwise would be.

## Creating the Linode

I don’t yet have good automation for creating linode servers, so still going to use the linode web interface for creating this. Go into your linode management, and select create a new linode.
- Select a distribution (I used Ubuntu 19.04, though Debian 9 should also be fine for the later apt-based automation)
- Select a region (I selected Fremont, which is geographically closest to where I live)
- Select the plan. You can probably get by on the Nanode 1 GB plan (as of this writing, the cheap $5/month plan), but I found the 25 GB storage + 1 GB ram to be very limiting. I found that jobs went much faster on the Linode 2 GB plan (The $10/month plan).
- Name the linode
- Pick the root password
- Select Create.
- Wait for the linode to be created, then find the IPv4 address.
- Optional: Go into your domain registrar and set an A record pointing to that address. Also set an AAA record pointing to the IPv6 address too.

That’s about it for the graphical part. Next we’re going to set up a non-root user on the user, so that Ansible isn’t running as root when you execute it.

## Configuring for Ansible

The following script will create a non-root user, give it sudo, lock the root user account, set the hostname of the machine, copy your ssh key over to the remote system and force python3. Python3 is required for ansible, and honestly, there’s less than a year until python2 is EOL’d anyway.

```bash
#!/bin/bash

remote_host=$1
remote_user=$2
remote_hostname=$3

read -s -p “Remote Password: “ remote_pass
echo “”

ssh root@“${remote_host}” “useradd -m -p \`mkpasswd -m sha-512 ${remote_pass}\` ${remote_user} && usermode -a -G sudo ${remote_user} && hostname ${remote_hostname} && passwd -l root && ln -s /usr/bin/python3 /usr/bin/python”

ssh-copy-id -i ~/.ssh/id_rsa.pub “${remote_user}”@“${remote_host}”
```

This is meant to be invoked as `./setup_linode.sh 123.45.67.89 some_user ci_box`, and it’ll prompt you for the desired user password in a secure-ish manner prior to making changes.

## Using Ansible

So now we have a non-root user, with sudo privileges, and the remote machine is otherwise setup to be used by ansible.

This playbook will:

- Install and configure nginx to act as a reverse-proxy for the concourse web interface.
- Install and configure letsencrypt to work with nginx
- Install and configure postgresql to be the database for concourse
- Pull down the latest version of concourse, and install/configure[^janky] it as both the web host, and a linux worker.
- Install and configure docker, as required for the linux worker.

[TODO: Clean up and share the playbook].

## Conclusion

This isn’t perfect, but it’s much better (and cheaper) than either self-hosting on a mac mini or running on AWS (of course, I’m still using that mini as a worker for concourse, in addition to other things like running plex). I’m going to continue to iterate on what I have, and eventually get this to a place that I like. I also want to eventually have concourse be able to redeploy itself as needed.


[^ansible]: [Ansible](https://www.ansible.com) is a technology that allows you to write declarative server configurations.
[^janky]: The way this playbook determines which concourse binary to download relies on the assumption that the correct binary is the 3rd listing under the `assets` list in the response response json returned from `https://api.github.com/repos/concourse/concourse/releases/latest`. A better way would be to loop over the items in `assets` list to get the first browser_download_url that mentions linux, but doesn’t mention “fly” (the cli interface).