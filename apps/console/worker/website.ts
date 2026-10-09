import { bounded, context, GameError } from './games';
import type { ConsoleActor, SummaryRequest, WebsiteAnalytics } from '../shared/contracts';

interface WebsiteService {
  getWebsite(request: SummaryRequest & {hours:number}): Promise<WebsiteAnalytics>;
}
export async function publishedWebsite() {
  const controller=new AbortController();
  let timer:ReturnType<typeof setTimeout>|undefined;
  try {
    return await Promise.race([(async()=>{
      const response=await fetch('https://quietatlas.io/build.json',{redirect:'manual',cache:'no-store',signal:controller.signal});
      if(!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw Error();
      const reader=response.body?.getReader();if(!reader)throw Error();
      const chunks:Uint8Array[]=[];let size=0;
      try {while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>4096)throw Error();chunks.push(part.value);}}
      finally{await reader.cancel().catch(()=>{});}
      const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
      const data=JSON.parse(new TextDecoder().decode(bytes));
      if(data.schemaVersion!==1 || !/^[a-f0-9]{40}$/.test(data.commit) || typeof data.builtAt!=='string' || !Number.isFinite(Date.parse(data.builtAt)))throw Error();
      return {available:true,commit:data.commit as string,builtAt:data.builtAt as string};
    })(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error());},3000);})]);
  } catch {return {available:false,commit:null,builtAt:null};}
  finally {if(timer!==undefined)clearTimeout(timer);}
}

export async function websiteApi(request:Request,env:Cloudflare.Env,actor:ConsoleActor,requestId:string):Promise<Response|null> {
  const url=new URL(request.url);if(url.pathname!=='/api/sites/quiet-atlas')return null;
  if(request.method!=='GET')throw new GameError(405,'method_not_allowed');
  if([...url.searchParams.keys()].some(key=>key!=='hours') || url.searchParams.getAll('hours').length>1 || !['24','168','720'].includes(url.searchParams.get('hours')??'168'))throw new GameError(400,'invalid_filter');
  if(env.ENVIRONMENT==='local'||!env.DARTS_OPS)throw new GameError(503,'game_not_connected');
  const hours=Number(url.searchParams.get('hours')??168);
  const [analytics,publication]=await Promise.allSettled([
    bounded((env.DARTS_OPS as Fetcher & WebsiteService).getWebsite({...context('quiet-atlas',actor,requestId,'production'),hours})),publishedWebsite()
  ]);
  const source=analytics.status==='fulfilled'?analytics.value:null;
  const valid=source?.schemaVersion===1 && source.resourceId==='quiet-atlas';
  const number=(value:unknown)=>typeof value==='number' && Number.isFinite(value) && value>=0?value:null;
  const timestamp=(value:unknown)=>typeof value==='string' && Number.isFinite(Date.parse(value))?value:null;
  const metrics=['lcp','inp','cls'].map(key=>{
    const metric=valid && source?.available===true && Array.isArray(source.metrics)?source.metrics.find(row=>row.key===key):null;
    return {key,samples:number(metric?.samples),good:number(metric?.good),needsImprovement:number(metric?.needsImprovement),poor:number(metric?.poor)};
  });
  return Response.json({schemaVersion:1,resourceId:'quiet-atlas',available:!!(valid&&source?.available===true),
    queriedAt:valid?timestamp(source.queriedAt):new Date().toISOString(),windowStart:valid?timestamp(source.windowStart):null,windowEnd:valid?timestamp(source.windowEnd):null,
    pageViews:valid&&source.available?number(source.pageViews):null,visits:valid&&source.available?number(source.visits):null,metrics,
    publication:publication.status==='fulfilled'?publication.value:{available:false,commit:null,builtAt:null}});
}
