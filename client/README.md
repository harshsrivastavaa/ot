Requirements

- Node.js 18.18 or newer
- npm
- The OT Hub API running locally, unless you configure a different API URL

Install dependencies

From this folder (`client`):

```bash
npm install
```

Configure the API URL

By default, the frontend sends API requests to `http://localhost:4000/api`. To use another API address, create `.env.local` in this folder:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

Restart the frontend after changing environment variables. The API must allow the frontend's origin through its `CLIENT_ORIGIN` setting; the local default is `http://localhost:3000`.

Run the app

Start the backend first. From the sibling `server` folder, configure `.env`, make sure MongoDB is running, and run:

```bash
npm run dev
```

Then, from this `client` folder, run:

```bash
npm run dev
```


Other commands

Create a production build:

```bash
npm run build
```

Run the production server after building:

```bash
npm start
```


Keep `.env.local` local and do not commit API secrets or other private values.
