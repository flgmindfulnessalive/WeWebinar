"use client";

import Script from "next/script";

// Whop ad-tracking pixel for the WeWebinars business itself (biz_FcdBjm0QL8efoE)
// -- site-wide, unlike FacebookPixel (which is per-webinar-host and only on
// registration pages). Snippet is verbatim from Whop's install flow; do not
// edit its contents.
export function WhopPixel() {
  return (
    <Script id="whop-pixel" strategy="afterInteractive">
      {`!function(w,d,s,u,n,a,b){if(w[n])return;a=w[n]={q:[],t:+new Date,s:[],o:u,track:function(){a.q.push([+new Date].concat([].slice.call(arguments)))},setScope:function(){a.s=[].slice.call(arguments).filter(function(x){return typeof x==="string"});a.q.push([+new Date,"setScope"].concat(a.s))},scope:function(){var c=[].slice.call(arguments);return{track:function(){a.q.push([+new Date].concat([].slice.call(arguments)).concat([{__scope:c}]))}}}};b=d.createElement(s);b.async=1;b.src=u+"/s.js";d.getElementsByTagName(s)[0].parentNode.insertBefore(b,d.getElementsByTagName(s)[0])}(window,document,"script","https://t.whop.tw","whop");whop.setScope("biz_FcdBjm0QL8efoE");whop.track("page");`}
    </Script>
  );
}
