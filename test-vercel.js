const https = require('https');

https.get('https://yru-community.vercel.app/admin', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    if (data.includes('href="/admin/posts"')) {
      console.log("FOUND OLD LINK: /admin/posts is still in the HTML.");
    } else if (data.includes('href="/admin/content"')) {
      console.log("FOUND NEW LINK: /admin/content is in the HTML. Site IS updated.");
    } else {
      console.log("Could not find either link. Maybe authentication redirect prevented it?");
    }
  });
}).on('error', err => {
  console.log('Error: ', err.message);
});
