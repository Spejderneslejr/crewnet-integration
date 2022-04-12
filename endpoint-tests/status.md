# API test status

## APIS

The following sections documents the results of initial testing of the individual
CrewNet API endpoints.

If the test was successful it is marked with a ✅️ - if not it is marked with a ❌️
and a link documenting the details.

The test has been executed one-by-one by using the VS Code [Rest Client](https://github.com/Huachao/vscode-restclient).

The test did not cover load tests or any other real-life loads that would eg.
trigger a rate limit.

## Questions

* Will eg. `GET /v1/users` hold up when we have 4000 users?

### Events

✅️ `GET /v1/events`

### Workplaces

Get workplaces for a specific event

✅️ `GET /v1/workplaces?event_id={event_id}`

Create a new workplace

❌️ `POST /v1/workplaces` [Fails on create](#post-workplace)

Update Workplace

❌️ `PUT /v1/workplaces/{workplace_id}` [Fails on attempt to update](#put-workplace)

Delete Workplace

✅️ `DELETE /v1/workplaces/{workplace_id}`, method was `DELETE` not `DEL`

### Workplace events

Add a workplace to event

❌️ `POST /v1/{event_id}/workplaces`, used `POST` instead of the documented `ADD` - [Fails on POST](#post-workplace-events)

Remove a workplace from an event

❌️ `DELETE /v1/{event_id}/workplaces/{workplace_id}` - [Does not seem to remove from event](#delete-workplace-events)

### Groups

Get all groups added to a license

✅️ `GET /v1/Groups`

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

### Workplace users

✅️ `GET /v1/workplaces/{workplace_id}/users?event_id={event_id}`

✅️ `POST /v1/workplaces/{workplace_id}/users?event_id={ event_id}`

✅️ `DELETE /v1/workplaces/{workplace_id}/users/{userid}?event_id={event_id}`

### Workplace categories

Gets all workplace categories added to a license

✅️ `GET /v1/workplace_categories`

Create a new workplace category to a license

❌️ `POST /v1/workplace_categories`, [age is ignored](#post-workplace-categories)

Update information to an existing workplace

❌️ `PUT /v1/workplace_categories/{workplace_category_id}`, [age cannot be set](#put-workplace-categories)

Delete a workplace category

✅️ `DEL /v1/workplace_categories/{workplace_category_id}`


### Users

✅️ `GET /v1/users?event_id={event_id}`

✅️ `POST /v1/users`

✅️ `DEL /v1/users{user_id}`


### Workplans

✅️ `GET /v1/workplaces/{workplace_id}/workplans?event_id={event_id}`

## Issues

The following documents any issues encountered during tests

## General notes

1. When the documentation says to use a `DEL` method it is actually `DELETE`

### POST Workplace

Status:  Error, returns error on first attempt

```shell
$ curl --request POST \
  --url 'https://api.crewnet.dk/v1/workplaces?event_workplace=2' \
  --header 'authorization: Bearer ***' \
  --header 'content-type: application/json' \
  --data '{"name": "Test workplace 1"}'

{
  "error": "undefined local variable or method `event_workplace' for #\u003c#\u003cClass:0x00007fe2dfcdfec8\u003e:0x00007fe2df528090\u003e\nDid you mean?  event_url"
}
```

Second attempt seems to indicate that the workplace did get created.

```shell
$ curl --request POST \
  --url 'https://api.crewnet.dk/v1/workplaces?event_workplace=2' \
  --header 'authorization: Bearer ***' \
  --header 'content-type: application/json' \
  --data '{"name": "Test workplace 1"}'

{
  "error": "Validation failed: Name has already been taken"
}
```

### PUT Workplace

Status:  Error, returns error on first attempt

Sample request

```shell
$ curl --request PUT \
  --url https://api.crewnet.dk/v1/workplaces/22 \
  --header 'authorization: Bearer ***' \
  --header 'content-type: application/json' \
  --data '{"id": 22,"name": "Tilgængelighedstest","workplace_category_id": null,"age": 1,"allow_create_happening": false,"allow_comment": false,"helper_need": 1}'

{"error":"undefined local variable or method `event_workplace' for #\u003c#\u003cClass:0x00007fe2dfcdfec8\u003e:0x00005567141692b8\u003e\nDid you mean?  event_url"}
```

```json
{
  "error": "undefined local variable or method `event_workplace' for #\u003c#\u003cClass:0x00007fe2dfcdfec8\u003e:0x00007fe2df528090\u003e\nDid you mean?  event_url"
}
```

Second attempt seems to indicate that the workplace did get created.

```json
{
  "error": "Validation failed: Name has already been taken"
}
```

### POST Workplace events

Status: Fails, seems to be missing a workplace id

Sample request:

```shell
$ curl --request POST \
  --url https://api.crewnet.dk/v1/events/2/workplaces \
  --header 'authorization: Bearer ***' \
  --data '{"workplace_id": 36,"helper_need": 10}'

{"error":"Couldn't find Workplace without an ID"}
```

### DELETE Workplace events

Status: returns a `204 No Content` - subsequently the workplace is still associated with the event

Sample request:

```shell
$ curl --request DELETE \
  --url https://api.crewnet.dk/v1/events/2/workplaces/36 \
  --header 'authorization: Bearer ***'
```

### POST Workplace categories

Status: returns a `200 OK` and creates a category, but the age is set to 0 even though it was specified.

Sample request:

```shell
$ curl --request POST \
  --url https://api.crewnet.dk/v1/workplace_categories \
  --header 'authorization: Bearer ***' \
  --header 'content-type: application/json' \
  --data '{"name": "apitest full create test 1","age_limit": "18","description": "workplace categories description goes here","shift_info": "shift_info goes here"}'

{"id":14,"name":"apitest full create test 1","description":"workplace categories description goes here","shift_info":"shift_info goes here","age_limit":0}

```

Also, the documentation does not describe which parameters are optional, but it is possible to create a category with just a name.

### PUT Workplace categories

Status: Very similar to the POST test - age is specified in the update request, but is ignored.

Sample request:

```shell
$  curl --request PUT \
  --url https://api.crewnet.dk/v1/workplace_categories/14 \
  --header 'authorization: Bearer ***' \
  --header 'content-type: application/json' \
  --data '{"name": "apitest update category","age_limit": "18","description": "workplace categories description goes here","shift_info": "shift_info goes here"}'

{"id":14,"name":"apitest update category","description":"workplace categories description goes here","shift_info":"shift_info goes here","age_limit":0}
```
