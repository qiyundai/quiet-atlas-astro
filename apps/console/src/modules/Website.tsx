import { useEffect, useState } from 'react';
import type { WebsiteReport } from '../../shared/contracts';
const count=(value:number|null|undefined)=>value==null?'Unavailable':value.toLocaleString(undefined,{maximumFractionDigits:0});
const names:Record<string,string>={lcp:'Largest contentful paint · loading',inp:'Interaction to next paint · responsiveness',cls:'Cumulative layout shift · visual stability'};
export default function Website() {
  const [hours,setHours]=useState('168'),[refresh,setRefresh]=useState(0),[data,setData]=useState<WebsiteReport|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(true);
  useEffect(()=>{
    const controller=new AbortController();let active=true;
    const timer=setTimeout(()=>controller.abort(),15000);
    setBusy(true);setData(null);setError('');
    void (async()=>{
      try {
        const response=await fetch(`/api/sites/quiet-atlas?hours=${hours}`,{cache:'no-store',signal:controller.signal});
        if(!response.ok||!response.headers.get('content-type')?.includes('application/json'))throw Error();
        const result:WebsiteReport=await response.json();
        if(result.schemaVersion!==1||result.resourceId!=='quiet-atlas')throw Error();
        if(active)setData(result);
      }catch{if(active)setError('Website reporting could not be loaded. Check your owner session and retry.');}
      finally{clearTimeout(timer);if(active)setBusy(false);}
    })();
    return()=>{active=false;controller.abort();clearTimeout(timer);};
  },[hours,refresh]);
  return <>
    <div className="section-heading"><label>Reporting window <select value={hours} onChange={event=>setHours(event.target.value)}><option value="24">Last 24 hours</option><option value="168">Last 7 days</option><option value="720">Last 30 days</option></select></label><button disabled={busy} onClick={()=>setRefresh(value=>value+1)}>{busy?'Loading…':'Refresh reporting'}</button></div>
    {error&&<p className="notice" role="alert">{error}</p>}
    {busy&&<p aria-live="polite">Loading website reporting…</p>}
    {data&&<>
      <section className="panel"><h2>Traffic</h2>{data.available?<><p>{count(data.pageViews)} page views · {count(data.visits)} visits</p>{data.pageViews===0&&<p>No browser page reports in this window yet.</p>}</>:<p>Cloudflare Web Analytics is unavailable. Unknown traffic is not zero traffic.</p>}
        <p>Cloudflare estimates from sampled browser reports, excluding detected bots. Visits do not count unique people. Blocked and unsupported browsers are absent. Collection starts when analytics is enabled.</p>
        <p>{data.windowStart&&data.windowEnd?`${new Date(data.windowStart).toLocaleString()} – ${new Date(data.windowEnd).toLocaleString()}`:''}{data.queriedAt?` · Checked ${new Date(data.queriedAt).toLocaleString()}`:''}</p>
      </section>
      <section className="panel"><h2>Website performance</h2><p>Cloudflare Web Analytics ratings from measured browser sessions. Each metric has its own sample count.</p>
        <div className="table-scroll"><table className="audit-table"><thead><tr>{['Metric','Samples','Good','Needs improvement','Poor'].map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>{(data.metrics??[]).map(metric=><tr key={metric.key}><td>{names[metric.key]}</td><td>{count(metric.samples)}</td><td>{metric.samples&&metric.good!=null?`${count(metric.good)} (${(100*metric.good/metric.samples).toFixed(1)}%)`:'No measurements'}</td><td>{count(metric.needsImprovement)}</td><td>{count(metric.poor)}</td></tr>)}</tbody></table></div>
      </section>
      <section className="panel"><h2>Published build</h2>{data.publication.available&&data.publication.commit&&data.publication.builtAt?<><p>Source <a href={`https://github.com/qiyundai/quiet-atlas-astro/commit/${data.publication.commit}`} target="_blank" rel="noopener noreferrer">{data.publication.commit.slice(0,12)} ↗</a> · built {new Date(data.publication.builtAt).toLocaleString()}</p><p>This metadata comes from the build currently served by quietatlas.io. Build time is not deployment time; failed deployment attempts are visible in Cloudflare.</p></>:<p>The published website has not provided valid build metadata yet.</p>}<a href="https://dash.cloudflare.com/" target="_blank" rel="noopener noreferrer">Open Cloudflare deployment history ↗</a></section>
    </>}
  </>;
}
