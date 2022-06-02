# Becomes CMS client library

This library was written to enable easy connectivity with [Becomes CMS](https://github.com/becomesco/cms).

[![CircleCI](https://circleci.com/gh/becomesco/cms-client/tree/master.svg?style=svg)](https://circleci.com/gh/becomesco/cms-client/tree/master)

[![npm](https://nodei.co/npm/@becomes/cms-client.png)](https://www.npmjs.com/package/@becomes/cms-client)

## How to use

1. Install package from NPM: `npm i --save @becomes/cms-client`
2. Create new Client instance and make a request to CMS:

```ts
// Import Client class.
import { BCMSClient } from '@becomes/cms-client';

async function main() {
  // Create new instance of a Client.
  const client = BCMSClient({
    cmsOrigin: process.env.API_ORIGIN,
    key: {
      id: process.env.API_KEY,
      secret: process.env.API_SECRET,
    },
  });
  // Get all Entries in specified Template.
  const query = await client.entry.getAll('__TEMPLATE_ID__');
  // Print query result
  console.log(query);
}
```

## API

> Get Template

```ts
const query = await client.template.get('__TEMPLATE_ID__');
```

> Get Entry

```ts
const query = await client.entry.get({
  templateId: '__TEMPLATE_ID__',
  entryId: '__ENTRY_ID__',
});
```

> Get all Entries

```ts
const query = await client.entry.getAll('__TEMPLATE_ID__');
```

> Get all Media

```ts
const query = await client.media.getAll();
```

> Get Media

```ts
const query = await client.media.get('__MEDIA_ID__');
```

> Get Media binary data

```ts
const query = await client.media.get('__MEDIA_ID__');
const bin = await query.bin();
```
