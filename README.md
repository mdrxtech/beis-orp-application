# Open Regulation Platform (ORP) client application

The UK regulatory landscape is complex and difficult to navigate. As a result, businesses must spend a lot of resources identifying which regulations they are expected to comply with. This is before they start to understand what they have to do to comply. Estimates from BEIS’s Business Perception Survey 2020 suggest that businesses spend, on average, around eight staff days per month complying with regulations. Economic analysis suggests that the ORP could create benefits to the UK economy of up to £500m, largely through reducing information search costs. 

Currently, regulatory data is difficult to access, it doesn't exist in a centralised place or in a structured way. As a result, regulatory data does not provide the value and use it could to businesses and citizens. The Open Regulation Platform (ORP) is an enabling service that seeks to tackle thus challenge, by providing access to a centralised repository of enriched and machine-readable regulatory data. Allowing government, businesses and third parties to develop tools and products that will help others navigate and comply with regulation in smarter, less burdensome ways.


## Environment

The ORP service is hosted on cloud infrastructure using Amazon Web Services (AWS) and is deployed using Github actions. The service uses native AWS services (Lambdas, step functions, S3, etc) with multiple services communicating with each other through APIs. The is defined in Terraform in a separate repository - see beis-orp-infrastructure. 

## Monitoring
The health of the client application can be monitored using the CloudWatch dashboard and the alarms configured in CloudWatch. Alerts are set up to notify the team via email in case of any critical issues.

## Access 
Access to the system is restricted to authorized personnel only. The system is secured using AWS Identity and Access Management (IAM) 
Incident Management:

## Detection and Response
When an issue or incident is detected, the first step is to check the system's logs and metrics to understand the scope and severity of the issue. If the issue is critical, we escalate it to the service owner.

## Maintenance
Regular maintenance includes updating software dependencies, security patches, and backups. Maintenance activities are scheduled during off-peak hours to minimize downtime and impact on users.

## Release Management
New features and bug fixes are deployed using a CI/CD pipeline with automated testing and manual approvals

## Change Management
Changes to the system are documented and reviewed by the team before implementation. Changes that may impact users are communicated in advance to minimize any disruption.


## Installation

```bash
$ npm install
```

## Running the app

```bash
# the app stores sessions in redis docker-compose fires up a local version.
# .env values for this: REDIS_ADDRESS=localhost REDIS_PORT=6379 SESSION_SECRET=my-secret
$ docker-compose up -d

# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```
In order for the application to work you will need to set the environment variables. The easiest way to do this is to drop a .env file onto the root of the application. Speak to the dev team for these values.


## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Docker

The application can be run via docker. When building the BUILD_NUMBER and GIT_REF arguments are optional and will be returned by the /health endpoint
```bash
# build image
$ docker build -t orm --build-arg BUILD_NUMBER={buildNumber} --build-arg GIT_REF={gitref} .

# run container
$ docker run -dp 3000:3000 orm
```
Image will be accessible via `http://localhost:3000/`


## Deployment / GitHub Actions

The application will be automatically deployed on update. This means that:

1. On a new Pull Request, the tests will be run against the codebase by GitHub Actions using the `on:PullRequest` trigger
1. Once the PR is merged, GitHub Actions will create a new Release in GitHub. The versioning isn't great on this, as GHA doesn't natively support auto-increments and third-party actions don't seem suitable for our use case.  This is triggered by `on:PullRequest:Closed` on the `main` branch
1. Whenever a new Release is created in the repository, the GHA `on:Release:Created` from _any branch_ is triggered, and it will attempt to upload to ECR as the `latest` image. Please note that this means if you choose to create a Release from a feature or test branch, this _will_ result in a deployment to `dev`
1. You can confirm that the `latest` in ECR is what ECS is deploying by comparing the Digest SHA of the ECR Image with the deployed ECS Task
