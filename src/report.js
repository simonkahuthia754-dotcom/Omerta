// Sends crashes to Sentry without an SDK. The DSN is a public ingest key by design: it can only submit events.
const DSN=import.meta.env?.VITE_SENTRY_DSN||"https://a290bb349bb83aa9601372cd542e4974@o4512338956386304.ingest.de.sentry.io/4512443347107920";
const m=/^https:\/\/([a-f0-9]+)@([a-z0-9.-]+\.sentry\.io)\/(\d+)$/.exec(DSN);
let sent=0,last="";
const clean=s=>String(s||"").replace(/(key|token|pin|pass\w*)=\S+/gi,"$1=…").slice(0,600);
export function report(err,where){
  try{
    if(!m||sent>=10)return;
    const msg=clean(err&&err.message||err);
    if(msg===last)return;last=msg;sent++;
    const id=Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,"0")).join("");
    const ev={event_id:id,timestamp:Date.now()/1e3,platform:"javascript",level:"error",release:"omerta@1",environment:"app",
      exception:{values:[{type:(err&&err.name)||"Error",value:msg,stacktrace:undefined}]},tags:{where:where||"app"},
      extra:{stack:clean(err&&err.stack).slice(0,1500)}};
    const body=JSON.stringify({event_id:id,dsn:DSN})+"\n"+JSON.stringify({type:"event"})+"\n"+JSON.stringify(ev);
    fetch("https://"+m[2]+"/api/"+m[3]+"/envelope/?sentry_version=7&sentry_key="+m[1],{method:"POST",body,keepalive:true,mode:"no-cors"}).catch(()=>{});
  }catch(e){}
}
export function watchCrashes(){
  addEventListener("error",e=>report(e.error||e.message,"window"));
  addEventListener("unhandledrejection",e=>report(e.reason,"promise"));
}
