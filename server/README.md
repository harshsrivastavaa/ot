 Requirements

- Node.js 18.18 or newer
- npm
- MongoDB running locally or a MongoDB Atlas connection string

Configure the backend

From this folder, install the backend dependencies:

```bash
npm install
```

Create a `.env` file in this folder. You can start from `.env.example` and replace the values:

```env
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/ot_hub
JWT_SECRET=replace-this-with-a-random-secret-at-least-32-characters-long
JWT_EXPIRES_IN=1h
CLIENT_ORIGIN=http://localhost:3000
SEED_PASSWORD=change-this-demo-password
```

`MONGODB_URI` and `JWT_SECRET` are required to start the API. `JWT_SECRET` must be at least 32 characters. `SEED_PASSWORD` is needed when running the seed script. The other settings are optional and shown with their default values.

Make sure MongoDB is running and the database in `MONGODB_URI` is reachable before starting the API.

## Seed the demo accounts

Set `SEED_PASSWORD` in the backend `.env` file to the password you want the demo accounts to use, then run this from the backend folder:

```bash
npm run seed
```

The script creates or updates these accounts:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@othub.com` | The value of `SEED_PASSWORD` |
| Manager | `manager@othub.com` | The value of `SEED_PASSWORD` |
| Employee | `employee@othub.com` | The value of `SEED_PASSWORD` |

To change the demo password, edit `SEED_PASSWORD` in `.env` and run `npm run seed` again. The script applies the new password to all three demo accounts. It hashes the password before saving it.

## Run the backend

From this folder:

```bash
npm run dev
```

This starts the API with nodemon at `http://localhost:4000`. To run without automatic restarts, use:

```bash
npm start
```

Check that the API is running at `http://localhost:4000/api/health`. It should return:

```json
{"data":{"status":"ok"}}
```

## Run the frontend

Open a second terminal and switch to the sibling frontend folder:

```bash
cd ../client
npm install
npm run dev
```

Open `http://localhost:3000`. The frontend uses `http://localhost:4000/api` by default. To use a different API address, create `client/.env.local` and set:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

If the frontend is served from a different origin, set `CLIENT_ORIGIN` in the backend `.env` to that origin and restart the API.

## Run both locally

1. Start MongoDB.
2. In a terminal at the backend folder, run `npm run seed` once to create the demo accounts.
3. In that terminal, run `npm run dev`.
4. In a second terminal, run `cd ../client`, then `npm run dev`.
5. Open `http://localhost:3000` and sign in with one of the demo emails and the `SEED_PASSWORD` value.

## Tests and formatting

Run the backend tests:

```bash
npm test
```

