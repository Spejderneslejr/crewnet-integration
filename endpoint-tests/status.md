# API test status

## APIS

The following sections documents the results of initial testing of the individual
CrewNet API endpoints.

If the test was successful it is marked with a ✅️ - if not it is marked with a ❌️
and a link documenting the details. ⚠️  is used when a problem has been found but
it does not seam breaking.

The test has been executed one-by-one by using the VS Code [Rest Client](https://github.com/Huachao/vscode-restclient).

The test did not cover load tests or any other real-life loads that would eg.
trigger a rate limit.

## Questions

1. Will eg. `GET /v1/users` hold up when we have 4000 users?

## General

⚠️ the documentation uses a `DEL` HTTP method, but it is in fact `DELETE` that should be used.

### 2 - Events

✅️ `GET /v1/events`

### 3 - Workplaces

⚠️  `helper_needed`  is referenced in all workplaces endpoints, but is not actually present.
it should probably be removed altogether from the workplaces documentation as it
seems to be a property that only makes sense for workplace events.

Create a new workplace

✅️ `POST /v1/workplaces`

Update Workplace

✅️ `PUT /v1/workplaces/{workplace_id}`

Delete Workplace

✅️ `DELETE /v1/workplaces/{workplace_id}`

### 4 - Workplace categories

Gets all workplace categories added to a license

✅️ `GET /v1/workplace_categories`

Create a new workplace category to a license

✅️ `POST /v1/workplace_categories`

Gets user in a workplace category

✅️ `GET /v1/workplace_categories/workplace_category_id}/users`

Update information to an existing workplace

✅️ `PUT /v1/workplace_categories/{workplace_category_id}`

Delete a workplace category

✅️ `DEL /v1/workplace_categories/{workplace_category_id}`

### 5 - Event workplaces

Get a list of all workplaces for an event:

✅️ `GET /v1/events/{event_id}/workplaces`

Add a workplace to event:

❌️ `POST /v1/{event_id}/workplaces`, [Duplicates entries and requires an optional argument](#post-workplace-events)

Remove a workplace from an event:

⚠️ `DELETE /v1/{event_id}/workplaces/{workplace_id}` - Only deletes the first association
even though multiple can currently exist due to the bug above. It is assumed that
multiple associations is an invalid state though so not a critical error as such.

### 6 - Workplace users/members

✅️ `GET /v1/workplaces/{workplace_id}/users?event_id={event_id}`

✅️ `POST /v1/workplaces/{workplace_id}/users?event_id={ event_id}`

✅️ `DELETE /v1/workplaces/{workplace_id}/users/{userid}?event_id={event_id}`

### 7 - Workplace applications

✅️ `POST /v1/users/{user_id}/workplace_categories?event_id{event_id}`

✅️/⚠️ `DELETE /v1/users/{user_id}/workplace_categories?event_id{event_id}` - the
documentation leaves out a category-id in the path. If we add it in the test
passes.

### 8 - Groups

Get all groups added to a license

✅️ `GET /v1/groups`

Create a new group to a license

✅️ `POST /v1/groups`

Update information on a specific group

✅️ `PUT /v1/groups/{group_id}`

Delete a group

✅️ `DELETE /v1/groups/{group_id}`

Get all group members

✅️ `GET /v1/groups/{group_id}/users`

Add new members to a group

✅️ `POST /v1/groups/{group_id}/users`

Remove member from a group

✅️ `DELETE /v1/groups/{group_id}/users/{user_id}`

### 09 - Users

✅️ `GET /v1/users?event_id={event_id}`

✅️ `POST /v1/users`

✅️ `DEL /v1/users{user_id}`


### 10 - Workplans

✅️ `GET /v1/workplaces/{workplace_id}/workplans?event_id={event_id}`

### 11 - Availabilities

Get availabilities for user:

✅️ `GET /v1/users/{user_id}/availabilities`

Create availabilities for a specific user:

✅️/⚠️ `POST /v1/users/{user_id}/availabilities` - the endpoint can be called multiple times with the same input resulting in new availabilities to be created with identical date/time fields but unique ids.

Update Availabilities for a specific user:

✅️ `PUT /v1/users/{user_id}/availabilities/{availabilities_id}`

Delete a users availability:

✅️ `DELETE /v1/users/{user_id}/availabilities/{availabilities_id}`


## Issues

The following documents any issues encountered during tests

## General notes

1. When the documentation says to use a `DEL` method it is actually `DELETE`

### POST Workplace Events

Status: 200 OK

1. An association is created each time the endpoint is invoked, which results in
duplicated entries in the event workplace list in the Crewnet UI. Calling `GET /v1/events/{event_id}/workplaces`
also show the extra associations that may have different `helper_need` values.
Subsequent attempts at deleting or updating event workplaces only affects one of
the entries.

```shell
$ curl --request POST \
  --url https://api.crewnet.dk/v1/events/2/workplaces \
  --header 'content-type: application/json' \
  --data '{"workplace_id": 36,"helper_need": 20}'
```

2. `helper_need` is documented as optional but if left out an error is returned

```shell
$ curl --request POST \
  --url https://api.crewnet.dk/v1/events/2/workplaces \
  --header 'content-type: application/json' \
  --data '{"workplace_id": 36}'

{"error":"Validation failed: Helper need must be greater than 0"}
```
