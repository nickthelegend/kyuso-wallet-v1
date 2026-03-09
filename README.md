# Algo Intermezzo Express Project
Algo Custodial Wallet (Supabase + Express + Intermezzo)

## Setup

### Backend Setup
1. Open a terminal in the `algo-wallet` folder.
2. Install dependencies: `npm install`
3. Create `.env` and fill in credentials.
4. Run server: `node server/index.js` (Running on port 4000)

### Frontend Setup
1. Open a new terminal in the `algo-wallet/frontend` folder.
2. Install dependencies: `npm install`
3. Start the dev server: `npm run dev`
4. Access the app at `http://localhost:5173`

## API Endpoints

### Create or Get Wallet
- **URL**: `POST /wallet`
- **Auth**: Bearer SUPABASE_JWT
- **Response**: `{ "address": "ALGORAND_ADDRESS" }`

### Get Wallet Info
- **URL**: `GET /wallet`
- **Auth**: Bearer SUPABASE_JWT

## Supabase Table Structure
Run this SQL in Supabase:
```sql
create table wallets (
  id uuid primary key default uuid_generate_v4(),
  supabase_user_id text unique,
  algo_address text,
  created_at timestamp default now()
);
```
