import { gql, GraphQLClient } from 'graphql-request'

const drupalHost = 'https://gqlc.lndo.site';
const endpoint = `${drupalHost}/graphql`

/**
 * GraphQL client instance
 * @type GraphQLClient
 */
let client;

const testContentUuids = [
  'ccc6baa9-1545-4332-ac48-daedb146dd6a', // Anonymous
  '372a7633-5cb3-454c-8497-3948452cc4e0', // admin
  '807b3992-625a-48ff-92ba-63260b557c97' // admin
];

beforeAll(async () => {
  const response = await fetch(`${drupalHost}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      username: 'admin',
      password: 'admin',
      client_id: 'default_consumer',
      grant_type: 'password',
    }),
  })

  const json = await response.json();

  client = new GraphQLClient(endpoint, {
    headers: {
      authorization: `Bearer ${json.access_token}`,
    },
  });
});

test('get the schema info', async () => {
  const query = gql`
  {
    info {
      version
    }
  }`

  const response = await client.request(query)

  expect(response).toEqual({ info: { version: '1' } })
});

test('authenticate and get user', async () => {
  const query = gql`
  {
    viewer {
      name
    }
  }`

  const response = await client.request(query)

  expect(response.viewer.name).toEqual('admin')
});

test('get node author', async () => {
  const query = gql`
    query ($uuid: ID!) {
      node(id: $uuid) {
        ... on NodePage {
          author {
            name
          }
        }
      }
    }
  `

  const variables = {
    uuid: testContentUuids[1]
  }

  const response = await client.request(query, variables)

  expect(response.node.author.name).toEqual('admin')
});

test('batched requests', async () => {
  const query = gql`
    query ($uuid: ID!) {
      node(id: $uuid) {
        ... on NodePage {
          author {
            name
          }
        }
      }
    }
  `

  const queries = [];
  testContentUuids.map(uuid => {
    queries.push({ document: query, variables: { uuid } });
  })

  const response = await client.batchRequests(queries)

  response.forEach((item) => {
    expect(['admin', 'Anonymous']).toContain(item.data.node.author.name);
  });
});