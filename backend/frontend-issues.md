# Frontend Issues & Feature Requirements


## [BUG] Content Security Policy (CSP) blocks Google Sign-In script

### Description
The frontend fails to load the official Google Identity Services SDK (`https://accounts.google.com/gsi/client`). The browser blocks execution due to missing domain permissions in the current Content Security Policy (CSP).

### Console Error
```text
Loading the script '[https://accounts.google.com/gsi/client](https://accounts.google.com/gsi/client)' violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inline' 'unsafe-eval'". 
Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback. The action has been blocked at googleIdentity.js:47