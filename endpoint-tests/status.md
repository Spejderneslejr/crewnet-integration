# API test status

## APIS

The following sections documents the results of testing the individual API endpoints. If the test was successful it is marked with a ✅️ - if not it is marked with a ❌️ and a link documenting the details.

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

Get Workplace members

✅️ `GET /v1/workplaces/{workplace_id}/users?event_id={event_id}`

Add workplace member

✅️ `POST /v1/workplaces/{workplace_id}/users?event_id={event_id}`

Remove Workplace Member

✅️ `DELETE /v1/workplaces/{workplace_id}/users/{user_id}?event_id={event_id}`

### Workplace events

❌️ `POST /v1/{event_id}/workplaces`, used `POST` instead of the documented `ADD` - [Fails on POST](#post-workplace-events)

❓️ `DELETE /v1/{event_id}/workplaces/{workplace_id}` - [Does not seem to remove from event](#delete-workplace-events)


### Groups

❓️ `GET /v1/Groups`

❓️ `POST /v1/groups`

❓️ `PUT /v1/groups/{group_id}`

❓️ `DEL /v1/groups/{group_id}`

❓️ `GET /v1/groups/{group_id}/users`

❓️ `POST /v1/groups/{group_id}/users`

❓️ `DEL /v1/groups/{group_id}/users/{user_id}`



### Workplace users

❓️ `POST /v1/workplaces/{workplace_id}/users?event_id={ event_id}`

❓️ `GET /v1/workplaces/{99}/users?event_id={99}`

❓️ `DEL /v1/workplaces/{workplace_id}/users/{userid}?event_id={event_id}`


### Workplace categories

❓️ `GET /v1/workplace_categories`

❓️ `POST /v1/workplace_categories`

❓️ `PUT /v1/workplace_categories/{workplace_category_id}`

❓️ `DEL /v1/workplace_categories/{workplace_category_id}`


### Users

❓️ `GET /v1/users?event_id={event_id}`

❓️ `POST /v1/users`

❓️ `DEL /v1/users{user_id}`


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
