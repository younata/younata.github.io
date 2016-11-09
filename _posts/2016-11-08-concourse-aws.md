---
layout: post
title: Concourse on AWS (November 2016)
date: 2016-11-08
tags: concourse, ci, pivotal, aws, configure, set up
---

I just spent 4 days trying to deploy [Concourse](https://concourse.ci) on AWS. I finally got it set up by cheating and asking the Concourse dev team for help (One of the benefits of working at the company funding Concourse's development). I wanted to document how one should deploy Concourse to AWS, and some of the pitfalls I came across.

Note that because the tooling literally changes all the time (bosh bootloader is currently on the order of months old right now), this may be out of date by the time you read this.

## Deploying Bosh via Bosh Bootloader

Deploying Concourse to AWS means deploying via [bosh](https://bosh.io). The [Concourse Documentation](http://concourse.ci/clusters-with-bosh.html) recommends manually setting up a bosh director. Ain't nobody got time for that, so let's use a tool to set up our deployment tool so we can deploy our CI tool. I spent 3 days trying to manually set up a bosh director before a coworker pointed me to [bosh-bootloader](https://github.com/cloudfoundry/bosh-bootloader). First, because bosh-bootloader is a Go package, we need to install Go, so:

```bash
brew install go
export GOPATH=$HOME/go  # or, wherever. This is just what was recommended to me
export PATH=$GOPATH/bin:$PATH
# Put the above in your .profile
go get github.com/cloudfoundry/bosh-bootloader/bbl  # actually install bosh bootloader.
```

Next, we install the bosh cli: `sudo gem install bosh_cli -n/usr/local/bin`

Then, we install bosh-init by following [these instructions](http://bosh.io/docs/install-bosh-init.html).

Next, we need to set up an AWS IAM user (see [this bosh documentation for how](http://bosh.io/docs/aws-iam-users.html#create)), with the following policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ec2:*",
                "cloudformation:*",
                "elasticloadbalancing:*",
                "iam:*"
            ],
            "Resource": [
                "*"
            ]
        }
    ]
}
```

Set the IAM user's access key to the `$AWS_ACCESS_KEY_ID` environment variable, and the secret access key to `$AWS_SECRET_ACCESS_KEY` environment variable.

Now, to initialize the bosh director, invoke:

```bash
bbl up \
    --aws-access-key-id="${AWS_ACCESS_KEY_ID}" \
    --aws-secret-access-key="${AWS_SECRET_ACCESS_KEY}" \
    --aws-region=us-east-1 \
    deploy-bosh-on-aws-for-concourse
```

Then, we need to set up a load balancer for concourse, do that as:

```bash
bbl create-lbs \
    --aws-region=us-east-1 \
    --type=concourse
```

Now, we need to get the director address, username, and password and have the bosh cli target it:

```bash
bbl director-username  # username
bbl director-password  # password
bosh target "${bbl director-address}"
# Input username/password as prompted
```

Next, we need to upload the stemcells and concourse releases.

```bash
bosh upload stemcell https://bosh.io/d/stemcells/bosh-aws-xen-ubuntu-trusty-go_agent
bosh upload stemcell https://bosh.io/d/stemcells/bosh-aws-xen-hvm-ubuntu-trusty-go_agent
bosh upload release https://bosh.io/d/github.com/cloudfoundry-incubator/garden-runc-release
bosh upload release https://bosh.io/d/github.com/concourse/concourse
```

Okay. Bosh is configured, and latest concourse release is uploaded.

## Concourse Manifest

Next, we need to set up the concourse manifest. Start with the manifest described [in the concourse documentation](https://concourse.ci/clusters-with-bosh.html). For VM types, I'd start at the m3.medium and go up as desired/as needed.

For SSL, you can simply use a self-signed cert, which can be generated with `openssl req -x509 -newkey rsa:4096 -keyout concourse.key -out concourse.cert -days 365`. Once you have that, copy the contents of the key and cert to your deployment manifest.

For reference, a cleaned-up version of my config is [available at this gist](https://gist.github.com/younata/f975df6b5be7f1b99db6f1463fd38267).

If you have a domain you want your ci to point to (for example, I have [ci.younata.com](https://ci.younata.com)), then you need to configure it to be a CNAME to your load balancer (load balancer URL obtained from `bbl lbs`). Otherwise, you should just use the load balancer URL as the external url in your concourse manifest.

Once you have that, you need to deploy it.

```bash
bosh deployment concourse_deployment.yml  # Specifies the concourse manifest to be deployed
bosh deploy  # deploy the previously set manifest
```

If you can access your CI at the external URL you provided, then you're done setting things up. In my case, bosh bootloader incorrectly configured my load balancer and my concourse security group. This showed up as an infinite redirect to my external url.

### Load Balancer Infinite Redirect

First, your load balancer needs to be configured to forward TCP 443 to TCP 4443, without doing a certificate check (your web/atc instance will do that, this is why you specified the certificate in your concourse manifest). Next, the security group for concourse needs be configured to let in all traffic for port 443. This security group will have a description of "Concourse", and was otherwise configured to let everything from 80 and 2222 in.

## Configuring Fly

In theory, you should be able to access the concourse web ui now.

Now, you need to download fly (the concourse CLI tool), and have it target your concourse installation. Fly is downloaded from the concourse UI, and can be installed as just `install ~/Downloads/fly /usr/local/bin`.

Targeting your concourse instance is as simple as `fly -t main login -c CONCOURSE_EXTERNAL_URL -k`.

From here, follow the rest of the [Concourse documentation](https://concourse.ci/hello-world.html) for configuring pipelines and such.