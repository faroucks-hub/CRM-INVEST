import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractBody, gmailFetch, header } from '@/lib/email/gmail'

async function uid(){const s=await createClient();return (await s.auth.getUser()).data.user?.id}
export async function GET(_:NextRequest,{params}:{params:Promise<{id:string}>}){
  const user=await uid();if(!user)return NextResponse.json({error:'Non authentifié'},{status:401})
  try{const {id}=await params;const data=await gmailFetch(`/messages/${encodeURIComponent(id)}?format=full`).then(r=>r.json()) as any;const body=extractBody(data.payload)
    if((data.labelIds||[]).includes('UNREAD'))await gmailFetch(`/messages/${id}/modify`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({removeLabelIds:['UNREAD']})})
    return NextResponse.json({id:data.id,threadId:data.threadId,labels:data.labelIds||[],from:header(data.payload?.headers,'From'),to:header(data.payload?.headers,'To'),cc:header(data.payload?.headers,'Cc'),subject:header(data.payload?.headers,'Subject')||'(Sans objet)',date:header(data.payload?.headers,'Date'),messageId:header(data.payload?.headers,'Message-ID'),references:header(data.payload?.headers,'References'),importance:header(data.payload?.headers,'Importance')||header(data.payload?.headers,'X-Priority'),html:'',text:body,snippet:data.snippet})
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Lecture impossible'},{status:400})}
}
export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const user=await uid();if(!user)return NextResponse.json({error:'Non authentifié'},{status:401})
  try{const {id}=await params;const {action}=await request.json() as {action:string}
    if(action==='trash')await gmailFetch(`/messages/${id}/trash`,{method:'POST'})
    else if(action==='restore')await gmailFetch(`/messages/${id}/untrash`,{method:'POST'})
    else {const addLabelIds=action==='star'?['STARRED']:action==='unread'?['UNREAD']:[];const removeLabelIds=action==='unstar'?['STARRED']:action==='read'?['UNREAD']:action==='archive'?['INBOX']:[];await gmailFetch(`/messages/${id}/modify`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({addLabelIds,removeLabelIds})})}
    return NextResponse.json({success:true})
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Action impossible'},{status:400})}
}
