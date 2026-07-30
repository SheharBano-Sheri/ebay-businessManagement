const filter = 'lastmodifieddate:[2026-06-23T12:24:27.000Z..2026-07-23T12:24:27.000Z]';
console.log('Original:          ', filter);
console.log('encodeURI:         ', encodeURI(filter));
console.log('encodeURIComponent:', encodeURIComponent(filter));
console.log('URLSearchParams:   ', new URLSearchParams({ filter }).toString());
