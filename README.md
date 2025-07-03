# Awooga Timestamp
Awooga Timestamp is an extension that automatically detects Unix timestamps (in seconds or milliseconds) on any webpage and appends a human-readable date and time format like `[27-06-2025 18:57:30]`. The date is colored green or orange, depending if it is in the future or in the past.

## Force Run
If you are on a non-whitelisted page and still want to interpret timestamps, you can click the green "Run" button in the extension's popup.

## Whitelist URLs
You can add and save linebreak-separated URL that will act as whitelist. If the text input is empty, the extension will work everywhere.

You can use use asterisks (`*`) as wildcards in the url masks:

### Examples

| Mask                        | Matches Example URL(s)                           | Does NOT Match                |
|-----------------------------|--------------------------------------------------|-------------------------------|
| `https://*.example.com*`    | `https://app.example.com`<br>`https://app.example.com/list`<br>`https://example.com` | `http://app.example.com`      |
| `*://*.example.com/*`       | `https://app.example.com/`<br>`http://foo.example.com/page` | `https://example.org/`

## Settings
With checkboxes in the extension popup:
1. You can choose to convert the timestamps to your local timezone or GMT timezone.
2. Yon can choose to detect timestamps in seconds or milliseconds. 
