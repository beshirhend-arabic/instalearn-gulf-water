import { getStore } from '@netlify/blobs';

const allowed = new Set(['comment','reaction','mission','change']);
const reactions = new Set(['love','fire','clap','star','rocket']);
const reward = {love:2,fire:3,clap:1,star:4,rocket:5};
const missionRewards=[50,100,75,35,20,10];
const correct=[0,0,null,0,0,0];
const choices=[3,2,0,3,2,2];
function validId(n){return Number.isInteger(n)&&n>=1&&n<=6}
function validate(e){
 if(!e||!allowed.has(e.type)||!validId(e.teamId))return false;
 if(e.type==='comment')return validId(e.targetId)&&typeof e.text==='string'&&e.text.trim().length>0&&e.text.length<=500;
 if(e.type==='reaction')return validId(e.targetId)&&reactions.has(e.reaction);
 if(e.type==='mission')return Number.isInteger(e.missionIndex)&&e.missionIndex>=0&&e.missionIndex<6&&typeof e.answer==='string'&&e.answer.length<=1000&&(e.missionIndex===2?e.answer.trim().length>=10:Number.isInteger(e.choice)&&e.choice>=0&&e.choice<choices[e.missionIndex]&&e.choice===correct[e.missionIndex]);
 if(e.type==='change')return true;
 return false;
}
const headers={'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*'};
export default async (request)=>{
 try {
  const store=getStore('instalearn-classroom-events-v1');
  if(request.method==='GET'){
   let cursor;const keys=[];
   do{const page=await store.list({prefix:'event-',cursor});keys.push(...page.blobs.map(b=>b.key));cursor=page.cursor;}while(cursor&&keys.length<5000);
   const events=(await Promise.all(keys.map(async key=>await store.get(key,{type:'json',consistency:'strong'})))).filter(Boolean).sort((a,b)=>a.id.localeCompare(b.id));
   return new Response(JSON.stringify({events}),{headers});
  }
  if(request.method==='POST'){
   const body=await request.json();
   if(!validate(body))return new Response(JSON.stringify({error:'Invalid event'}),{status:400,headers});
   const event={...body,id:`${new Date().toISOString()}-${crypto.randomUUID()}`};
   await store.setJSON('event-'+event.id,event);
   return new Response(JSON.stringify({ok:true,event}),{status:201,headers});
  }
  return new Response('Method not allowed',{status:405,headers});
 }catch(error){return new Response(JSON.stringify({error:'Backend unavailable',detail:String(error.message||error)}),{status:500,headers});}
};
