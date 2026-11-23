# Image search APIs (checked 2026-11-17)

Machine-readable version: `lib/data/imageSources.json`. Anything not confirmed on an official page is marked UNVERIFIED.

## Comparison

| | Pexels | Pixabay | Unsplash | Wikimedia Commons |
|---|---|---|---|---|
| Endpoint | `https://api.pexels.com/v1/search` | `https://pixabay.com/api/` | `https://api.unsplash.com/search/photos` | `https://commons.wikimedia.org/w/api.php` (generator=search, ns 6, prop=imageinfo) |
| Auth | Header `Authorization: KEY` (PEXELS_API_KEY) | Query `key=KEY` (PIXABAY_API_KEY) | Header `Authorization: Client-ID KEY` or `client_id=` (UNSPLASH_ACCESS_KEY) | No key. Descriptive User-Agent required |
| Safe search | None documented (null) | `safesearch=true` | `content_filter=high` (default `low`; not a guarantee) | None. Filter client-side |
| Credit wording | "Photo by {author} on Pexels" linked to photo page; plus a prominent "Photos provided by Pexels" link | Docs only ask to show users where images come from. "Image by {author} from Pixabay" is conventional wording, UNVERIFIED | "Photo by {author} on Unsplash", linking photographer profile and Unsplash, with `?utm_source=APP&utm_medium=referral` | Creator (extmetadata Artist) + licence (LicenseShortName, link LicenseUrl) + file page link |
| Hotlinking | Not forbidden in docs read (UNVERIFIED rule); sample URLs on images.pexels.com | Permanent hotlinking forbidden; temporary display of results only. mustDownload | Required: use `urls.*` URLs for all uses | Allowed but "not recommended" by Commons |
| Download trigger | No | No | Yes: GET `links.download_location` when a photo is used | No |
| Caching | UNVERIFIED | Requests must be cached 24 h; webformatURL valid 24 h | UNVERIFIED | No fixed time; API etiquette says to cache |
| Rate limit | 200/hour, 20,000/month (free unlimited on request) | 100 per 60 s per key | 50/hour demo, 1000/hour production (image requests not counted) | No hard limit; serial requests, gzip, batch with `|` |
| Thumb | `src.medium` (350 px high) | `webformatURL` (640 px; `previewURL` 150 px) | `urls.small` (400 px wide) | `imageinfo[0].thumburl` (iiurlwidth) |
| Full | `src.large` | `largeImageURL` (1280 px) | `urls.regular` (1080 px) | `imageinfo[0].url` |
| Author / profile / page | `photographer` / `photographer_url` / `url` | `user` / `https://pixabay.com/users/{user}-{user_id}/` / `pageURL` | `user.name` / `user.links.html` / `links.html` | `extmetadata.Artist.value` (HTML) / link inside it / `descriptionurl` |
| Text for scoring | `alt` | `tags` | `alt_description`, `description` | `ImageDescription`, `ObjectName`, `Categories`, `title` |

## Notes per source

**Pexels.** Docs: https://www.pexels.com/api/documentation/. The license, terms and help pages returned HTTP 403, so the licence text, hotlink rule and cache rule are UNVERIFIED. The API guideline says to show a prominent link to Pexels whenever API results are shown, and to credit photographers when possible.

**Pixabay.** Docs: https://pixabay.com/api/docs/. The licence and terms pages returned 403. Search results may be shown temporarily from Pixabay URLs. Any image the app keeps must be downloaded to the app's own storage. The API returns at most 500 hits per query. `fullHDURL` and `imageURL` need approved full API access.

**Unsplash.** Docs: https://unsplash.com/documentation and help-center guideline articles (attribution, hotlinking, triggering a download). `unsplash.com/api-terms` and `/license` returned no body text, so cache duration and licence text are UNVERIFIED. Hotlinking is mandatory, so images cannot be copied to local storage. Trigger the download endpoint asynchronously when a user picks or uses a photo.

**Wikimedia Commons.** Sources: https://www.mediawiki.org/wiki/API:Etiquette, https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_User-Agent_Policy (the `meta.wikimedia.org/wiki/User-Agent_policy` URL returned an empty body), https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia. A live test query confirmed the fields above, for example `LicenseShortName: "CC BY-SA 4.0"` and `AttributionRequired: "true"`. User-Agent format: `<client>/<version> (<contact URL or email>) <library>/<version>`. From browser JS, set `Api-User-Agent`. Do not use generic agents (curl, python-urllib) or copy a browser UA.

## Recommendation (for the app)

Pixabay requires downloading, and Unsplash forbids it. Pick one model per source. Pexels and Commons are the easiest to show live with credit. Pexels has no safe-search filter.
