# CrewNet integration

The following document describes which parts of the CrewNet API is used by the camp, and which manual and automated processes that has been put in place to support the creation, update and synchronization of workplans.

We have the following integrations

* User creation (initial + continuous)
* User availability synchronization
* Oauth based SSO login

## User creation

CampOS performs a non-updating one-way synchronization of CrewNet users. When a user reaches a state in CampOS that allows it access to Crewnet, CampOS reaches out and creates the user. We currently do not have a flow for deleting users. This flow has to complete for a user before the user can log on.

We first create all outstanding users, and from that point forward all newly created users are created.

### CrewNet API used

* GET /v1/users
* POST /v1/users

### Initial user creation

```mermaid
sequenceDiagram
    participant campos as CampOS
    participant crewnet as CrewNet

campos ->> campos: A user is created
campos ->> crewnet: Query for users: GET /v1/users
crewnet -->> campos: Users
campos ->> campos: Filter users to create based on user status
par Per missing user
campos ->> crewnet: Create user if missing: POST /v1/users
campos ->> crewnet: Get availability for user: GET /v1/users/(userid)/availabilities
crewnet -->> campos: availabilities
campos ->> crewnet: Update availability for user: POST/PUT/DELETE /v1/users/(userid)/availabilities
# later

end
```

### Continuous user creation

As new users becomes available in CampOS they are created in CrewNet as well.

```mermaid
sequenceDiagram
    participant campos as CampOS
    participant crewnet as CrewNet

campos ->> campos: A user reaches is created
campos ->> crewnet: Query for users: GET /v1/users
crewnet -->> campos: Users
campos ->> crewnet: Create user if missing: POST /v1/users
campos ->> crewnet: Trigger availability synchronization for user

```

## Availability synchronization

CampOS continuously synchronizes users availability

### CrewNet API used

* GET /v1/users/(userid)/availabilities
* POST /v1/users/(userid)/availabilities
* DELETE /v1/users/(userid)/availabilities/(id)

### User creation flow

```mermaid
sequenceDiagram
    participant campos as CampOS
    participant crewnet as CrewNet

campos ->> campos: Triggered by user creation or update
campos ->> crewnet: Get availability for user: GET /v1/users/(userid)/availabilities
crewnet -->> campos: availabilities
loop Every availabillity out of sync
	campos ->> crewnet: Create/Update/Delete via POST/PUT/DELETE: /v1/users/(userid)/availabilities
end
note over campos, crewnet: alternative
campos ->> crewnet: Delete all availabillities: DELETE /v1/users/(userid)/availabilities(id) (multiple)
campos ->> crewnet: Create availabillities: POST /v1/users/(userid)/availabilities (multiple)

```

## Single Sign on

CrewNet uses CampOS as a Oauth provider to authenticate users. We have no authorization so all users are authorized as equal (non-admins). Users are assumed to exist prior to login

### APIs

* No CrewNet API endpoints are used

### Oauth flow

Simplified oauth flow:

```mermaid
sequenceDiagram
    participant user as Volunteer
    participant crewnet as CrewNet
    participant campos as CampOS

user ->> crewnet: Click "Login with crewnet"
crewnet -->> user: Redirect to CampOS
user ->> campos: Perform login
campos -->> user: Redirect to CrewNet with authentication data and token
user ->> crewnet: Pass on CampOS auth data
crewnet ->> crewnet: Verify data
crewnet ->> campos: Fetch user data using tokens
campos -->> crewnet: Data
crewnet -->> user: accept login
user ->> crewnet: Starts using CrewNet
```
