# Torn API Usage & Migration Map

Reference for every Torn API call made by the app (`src/services/torn-api.ts`, screens) and the Supabase edge functions (`supabase/functions/*`), plus the v2 endpoints planned features should use.

- **Source of truth:** official OpenAPI spec `https://www.torn.com/swagger/openapi.json` (spec version **6.13.6**, checked 2026-09-26). Fetch it with a custom `User-Agent` header, since Cloudflare blocks default agents.
- **Rate limit:** 100 requests/minute **per API key**. Every call below costs one request against the user's key, so cache where you can.

## Status summary

| Topic | Status |
|---|---|
| API v1 end-of-life | **None announced** in the spec. v1 endpoints still respond normally. |
| v2 + v1 mixing | v2 selections that aren't migrated fall back to v1 responses. `legacy=<selection>` on a v2 URL forces the v1 response shape, which is useful for migrating one selection at a time. |
| Networth | **Keep v1.** v2 `/user/networth` only returns `money / items / assets / points / total`. The per-category breakdown used by the Networth, Assets and Bank screens only exists in v1 `user/?selections=networth`. |

## Verified against live responses (2026-09-26)

- **v2 `money.city_bank` is an object:** `{amount, profit, duration (days), interest_rate (base APR %), invested_at, until}`. Read the balance with `getCityBankAmount()`; `Number(city_bank)` is `NaN`. `profit` is the exact interest at maturity. `fetchUserDataWithNetworth` merges v1 `time_left` into this object and no longer replaces it.
- **Merit bank bonus multiplies the rate.** It is not added. "+50% bank interest" on a 36.94% base gives `profit ≈ amount × 36.94% × 1.5 × 7/365`, so the effective APR is `rate × (1 + bonus)`.
- **v2 `property`:** `modifications` and `staff[].type` are display strings (`"Airstrip"`, `"Maid"`). A rented property includes `cost`, `cost_per_day`, `rental_period`, `rental_period_remaining`, `rented_by`, and `owner` is the landlord.
- **v1 networth:** `loan` and `unpaidfees` are negative numbers.
- **v2 `cooldowns`** has no `jail` field.

## Upcoming removals (from the spec)

| Date | What | Affects this app? |
|---|---|---|
| 2026-06-01 (passed) | `position_id` / `number` in organized-crime slots → `position_info` | No |
| 2027-01-01 | `/torn/items`: `value.buy_price`, `value.sell_price`, `value.vendor` removed → use `value.shops[]` (`{country, shop, buy_price, sell_price}`) and `value.market_price` | **Only when `sync-items` / `fetchItemDetails` move to v2.** Both parse the flat v1 `torn/?selections=items` fields today. |
| 2027-01-01 | `/torn/{ids}/itemdetails` object → array | No |
| 2027-01-01 | `/faction/warfare` removed → `warfareranked`, `warfarechains`, `warfareraids`, `warfareterritory`, `dirtybombs` | No, but **do not build `war-watcher` on it** |
| — | `UserTrade.timestamp` → `completed_at` | No |

## Current calls

### App (`src/services/torn-api.ts` and screens)

| Function / screen | Endpoint | Ver | v2 equivalent | Note |
|---|---|---|---|---|
| `app/(modals)/api-key.tsx` | `user/?selections=profile` | v1 | `/v2/user/profile` | Reads v1 fields `player_id`, `faction.faction_id`; keep v1 or map fields when migrating |
| `fetchUserDataWithNetworth`, `fetchUserData` | `user?selections=profile,bars,cooldowns,education,travel,money,property` | v2 | — | Already v2 |
| `fetchUserDataWithNetworth`, `fetchNetworth` | `user/?selections=networth,money`, `user/?selections=networth` | v1 | — | **Keep v1** (see status) |
| `fetchUserBars` | `user?selections=bars&timestamp=…` | v2 | — | `timestamp` is sent as `Date.now()` (ms); Torn timestamps are seconds, but here it only busts the cache |
| `fetchCityBankDetails` | `user/?selections=money` | v1 | `/v2/user/money` | v1 gives `city_bank {amount, time_left}` |
| `fetchPerks` (cached 10 min; also used by `fetchBankInterestModifier`) | `user/?selections=perks` | v1 | `/v2/user/perks` | |
| `fetchGymModifier` (currently unused) | `user/?selections=perks` | v1 | `/v2/user/perks` | Dead code; could reuse `fetchPerks` |
| `fetchGymDataCombined`, `fetchActiveGym` | `user/?selections=gym,perks`, `user/?selections=gym` | v1 | `/v2/user/gym`, `/v2/user/perks` | |
| `fetchBattleStats`, `fetchGymDataCombined` | `user/battlestats` | v2 | — | |
| `fetchDrugStats` | `user/{id}/personalstats?cat=drugs` | v2 | — | |
| `fetchWeeklyXanaxUsage` | `user/?selections=personalstats&stat=xantaken` | v1 | `/v2/user/personalstats?stat=xantaken` | `xantaken` is in the v2 stat enum |
| `fetchBankRates` | `torn/?selections=bank` | v1 | `/v2/torn/bank` (`days`, `rate`) | Response shape differs |
| `fetchEducationCourses` | `torn?selections=education` | v2 | — | |
| `fetchItemDetails` | `torn/?selections=items` | v1 | `/v2/torn/items` | Migrate with the 2027-01-01 field change in mind |
| `fetchSingleItemMarketPrice` | `market/{id}/itemmarket` | v2 | — | Reads `itemmarket.listings[].price`, which matches the spec |
| `fetchFactionBasic`, `fetchFactionDataCombined`, `fetchFactionDataParallel` | `faction/?selections=basic` | v1 | `/v2/faction/basic`, `/v2/faction/{id}/members` | |
| `fetchRankedWars`, `fetchFactionData*` | `faction/rankedwars?limit=20&sort=DESC` | v2 | — | |
| `fetchFactionDataCombined` | `user?selections=profile,bars` | v2 | — | |

### Edge functions (`supabase/functions`)

| Function | Endpoint | Ver | v2 equivalent | Note |
|---|---|---|---|---|
| `status-watcher` | `user/?selections=bars,travel,cooldowns,education,profile` | v1 | `/v2/user?selections=…` | Keep v1 while the code reads `d.chain` from v1 bars |
| `sync-bank-history` | `user/?selections=log&log=5450,5451,6010,6011,6012` | v1 | `/v2/user/log?log=…` | v2 log shape: `id, timestamp, details, data, params` |
| `sync-user-stats` | `user/?selections=profile,battlestats,networth` | v1 | — | Keep v1 (networth) |
| `track-member-stats` | `user/{id}?selections=personalstats` | v1 | `/v2/user/{id}/personalstats?cat=…` | v2 requires `cat` or `stat` (max 10 stats) |
| `check-chain-status` | `user/{id}?selections=profile` | v1 | `/v2/user/{id}/basic` | `basic` is lighter and enough for status |
| `sync-faction-members` | `faction/{id}?selections=basic` | v1 | `/v2/faction/{id}/members` | |
| `sync-items` | `torn/?selections=items` | v1 | `/v2/torn/items` | See 2027-01-01 change |
| `sync-bazaar-prices` | `v2/market/{id}/itemmarket` | v2 | — | |
| `update-stocks` | `torn/?selections=stocks` | v1 | `/v2/torn/stocks` (`market`, `bonus`) | Response shape differs |
| `sync-items` | `https://yata.yt/api/v1/travel/export/` | 3rd party | none | Foreign stock data depends on YATA's uptime |

## Planned features

These are declared in `supabase/config.toml` but have no code yet.

| Feature | Recommended endpoints | Avoid |
|---|---|---|
| `war-watcher` | `/v2/faction/rankedwars`, `/v2/faction/{rankedWarId}/rankedwarreport`, `/v2/faction/{id}/members` (enemy status), `/v2/faction/warfareranked` | `/faction/warfare` |
| `daily-networth` | v1 `user/?selections=networth` (detailed) or `/v2/user/personalstats?cat=networth` | v2 `/user/networth` (too coarse) |
| `update-chain-targets` / `sync-chain-targets` | `/v2/user/{id}/basic` (status), `/v2/user/{id}/personalstats?stat=…`, `/v2/faction/chain`, `/v2/faction/chains` | — |

## Screens and the calls they use

| Screen | Calls |
|---|---|
| Stats (`(quick-actions)/stats`) | `fetchUserData`, `fetchBattleStats`, `fetchDrugStats` |
| Property (`(quick-actions)/property`) | `fetchUserData` (v2 `property` selection), `fetchPerks` |
| Offshore Bank (`(quick-actions)/bank/offshore-bank`) | `fetchUserDataWithNetworth` |
| Payday (`(quick-actions)/faction/payday`) | `fetchFactionBasic` + Supabase `ranked_war_members` |
| Others (`(quick-actions)/others`) | none |
| Profit tab (`(tabs)/profit`) | `fetchUserDataWithNetworth`, `fetchCityBankDetails`, `fetchBankRates`, `fetchBankInterestModifier` + RPC `record_and_get_profit` |
| Assets tab (`(tabs)/assets`) | `fetchUserDataWithNetworth` |

## Recommended next steps

1. Rewrite `sync-items` / `fetchItemDetails` parsing for `value.shops[]` **before 2027-01-01**, but only if they move to v2. Otherwise leave them on v1.
2. Point `fetchGymDataCombined` at the cached `fetchPerks` too, and delete the unused `fetchGymModifier`.
3. Keep networth on v1 until Torn ships a detailed v2 breakdown.
