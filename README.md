# ultimate-timestamp
Timestamp chrome extension

## Whitelist URL Masks

You can control which pages the extension runs on by entering comma-separated URL masks in the popup.  
A mask can contain asterisks (`*`) as wildcards, which match any sequence of characters (including none).

### How masks work

- `*` matches any number of any characters (including `/`, `.`, etc.)
- Masks are compared to the full page URL (including protocol, subdomain, domain, path, and query).

### Examples

| Mask                        | Matches Example URL(s)                           | Does NOT Match                |
|-----------------------------|--------------------------------------------------|-------------------------------|
| `https://*.example.com*`    | `https://app.example.com`<br>`https://app.example.com/list`<br>`https://example.com` | `http://app.example.com`      |
| `*://*.example.com/*`       | `https://app.example.com/`<br>`http://foo.example.com/page` | `https://example.org/`        |
| `https://example.com/list*` | `https://example.com/list`<br>`https://example.com/list/123` | `https://example.com/other`   |
| `*google.com*`              | `https://www.google.com/search?q=test`<br>`http://google.com` | `https://notgoogle.com`       |
| `*`                         | All URLs                                         |                               |

### Notes

- Masks are **case-sensitive**.
- If you want to match all subdomains, use `*.` before the domain.
- If you want to match both `http` and `https`, use `*://` at the start.
- If no mask matches the current page URL, the extension will not run.