"use strict";var AISupportWidgetModule=(()=>{var _=Object.defineProperty;var ae=Object.getOwnPropertyDescriptor;var ne=Object.getOwnPropertyNames;var oe=Object.prototype.hasOwnProperty;var ie=(e,t)=>{for(var n in t)_(e,n,{get:t[n],enumerable:!0})},re=(e,t,n,o)=>{if(t&&typeof t=="object"||typeof t=="function")for(let a of ne(t))!oe.call(e,a)&&a!==n&&_(e,a,{get:()=>t[a],enumerable:!(o=ae(t,a))||o.enumerable});return e};var se=e=>re(_({},"__esModule",{value:!0}),e);var ge={};ie(ge,{AISupportWidget:()=>R});function F(e,t){try{let n=e.split(".")[1].replace(/-/g,"+").replace(/_/g,"/"),o=Uint8Array.from(atob(n.padEnd(Math.ceil(n.length/4)*4,"=")),i=>i.charCodeAt(0)),a=JSON.parse(new TextDecoder().decode(o));return a.tenantId!==t||typeof a.userId!="string"||!a.userId?null:JSON.stringify([t,a.userId])}catch{return null}}var le={support:"Support",chat:"Support chat",open:"Open support chat",minimize:"Minimize support chat",end:"End Session",endLabel:"End support session",messages:"Chat messages",composer:"Send a message",placeholder:"Describe your issue...",messageLabel:"Type your message",send:"Send",sendLabel:"Send message",thinking:"AI is thinking...",sendFailed:"Failed to send message. Please try again.",responseFailed:"Failed to get response. Please try again.",unavailable:"Support unavailable. Try again.",resolved:"Was your issue resolved?",yes:"Yes",no:"No",resolvedLabel:"Issue was resolved",unresolvedLabel:"Issue was not resolved",rating:"How would you rate this experience? (1-10)",rateLabel:e=>`Rate ${e} out of 10`,skipRating:"Close without rating",closing:"Closing case...",closed:"Case closed.",closeFailed:"Failed to close case. Please try again.",retry:"Retry",copy:"Copy",cancel:"Cancel",confirm:"Confirm",confirmAction:e=>`Are you sure you want to "${e}"?`,actionFailed:"This action is unavailable. Use your application\u2019s human support channel.",humanHelp:"Contact support"},ce={support:"Suporte",chat:"Chat de suporte",open:"Abrir chat de suporte",minimize:"Minimizar chat de suporte",end:"Encerrar conversa",endLabel:"Encerrar conversa de suporte",messages:"Mensagens do chat",composer:"Enviar mensagem",placeholder:"Descreva seu problema\u2026",messageLabel:"Digite sua mensagem",send:"Enviar",sendLabel:"Enviar mensagem",thinking:"A IA est\xE1 preparando uma resposta\u2026",sendFailed:"N\xE3o foi poss\xEDvel enviar. Tente novamente.",responseFailed:"N\xE3o foi poss\xEDvel obter uma resposta. Tente novamente.",unavailable:"Suporte indispon\xEDvel. Tente novamente.",resolved:"Seu problema foi resolvido?",yes:"Sim",no:"N\xE3o",resolvedLabel:"O problema foi resolvido",unresolvedLabel:"O problema n\xE3o foi resolvido",rating:"Como voc\xEA avalia esta experi\xEAncia? (1 a 10)",rateLabel:e=>`Dar nota ${e} de 10`,skipRating:"Encerrar sem avaliar",closing:"Encerrando conversa\u2026",closed:"Conversa encerrada.",closeFailed:"N\xE3o foi poss\xEDvel encerrar. Tente novamente.",retry:"Tentar novamente",copy:"Copiar",cancel:"Cancelar",confirm:"Confirmar",confirmAction:e=>`Voc\xEA confirma a a\xE7\xE3o \u201C${e}\u201D?`,actionFailed:"Esta a\xE7\xE3o est\xE1 indispon\xEDvel. Use o canal de atendimento humano do aplicativo.",humanHelp:"Falar com o atendimento"};function C(e="en-US"){return e.toLowerCase().split(/[-_]/)[0]==="pt"?ce:le}function B(e,t){let n=e==="light";return`
    :host {
      --ai-support-primary: ${t??(n?"#2563eb":"#60a5fa")};
      --ai-support-bg: ${n?"#ffffff":"#1e1e2e"};
      --ai-support-text: ${n?"#1a1a2e":"#e4e4e7"};
      --ai-support-radius: 12px;
      --ai-support-surface: ${n?"#f4f4f5":"#2a2a3e"};
      --ai-support-border: ${n?"#e4e4e7":"#3a3a4e"};
      --ai-support-muted: ${n?"#5c5c66":"#a1a1aa"};
      --ai-support-danger: #ef4444;
      --ai-support-success: #22c55e;
      --ai-support-focus: ${t??(n?"#2563eb":"#60a5fa")};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: var(--ai-support-text);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    *:focus-visible {
      outline: 2px solid var(--ai-support-focus);
      outline-offset: 2px;
    }
    .ai-widget-fab {
      position: fixed; bottom: 20px; right: 20px; width: 56px; height: 56px;
      border-radius: 50%; background: var(--ai-support-primary); color: #fff;
      border: none; cursor: pointer; font-size: 24px; display: flex;
      align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,.2);
      z-index: 2147483647; transition: transform .2s ease-in-out;
    }
    .ai-widget-fab.left { right: auto; left: 20px; }
    .ai-widget-fab:hover { transform: scale(1.08); }
    .ai-widget-fab:active { transform: scale(0.95); }
    .ai-widget-panel {
      position: fixed; bottom: 88px; right: 20px; width: 440px; max-height: 620px;
      background: var(--ai-support-bg); border-radius: var(--ai-support-radius);
      box-shadow: 0 8px 32px rgba(0,0,0,.18); display: flex; flex-direction: column;
      overflow: hidden; z-index: 2147483647; border: 1px solid var(--ai-support-border);
    }
    .ai-widget-panel.left { right: auto; left: 20px; }
    .ai-widget-panel.hidden { display: none; }
    .ai-widget-header {
      display: flex; align-items: center; padding: 14px 16px; gap: 8px;
      background: var(--ai-support-primary); color: #fff;
    }
    .ai-widget-header-title { flex: 1; font-weight: 600; font-size: 15px; margin: 0; }
    .ai-widget-handoff { color: inherit; font-size: 12px; text-decoration: underline; }
    .ai-widget-header button {
      background: none; border: none; color: #fff; cursor: pointer;
      font-size: 13px; padding: 4px 8px; border-radius: 4px; opacity: .9;
      transition: opacity .15s ease-in-out, background .15s ease-in-out;
    }
    .ai-widget-header button:hover { opacity: 1; background: rgba(255,255,255,.15); }
    .ai-widget-header button:focus-visible { outline-color: #fff; }
    .ai-end-btn { font-size: 11px !important; opacity: .7; }
    .ai-widget-messages {
      flex: 1; overflow-y: auto; padding: 12px; display: flex;
      flex-direction: column; gap: 8px; min-height: 200px;
    }
    .ai-msg {
      max-width: 85%; padding: 10px 14px; border-radius: 12px;
      word-break: break-word; overflow-wrap: break-word;
      white-space: pre-wrap; font-size: 14px; line-height: 1.5;
    }
    .ai-msg.user {
      align-self: flex-end; background: var(--ai-support-primary); color: #fff;
      border-bottom-right-radius: 4px;
    }
    .ai-msg.assistant {
      align-self: flex-start; background: var(--ai-support-surface);
      border-bottom-left-radius: 4px;
    }
    .ai-msg.system {
      align-self: center; color: var(--ai-support-muted); font-size: 12px;
      font-style: italic; white-space: normal;
    }
    .ai-typing {
      align-self: flex-start; color: var(--ai-support-muted);
      font-style: italic; padding: 8px; font-size: 13px;
    }
    .ai-evidence { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 4px; }
    .ai-evidence-badge {
      display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px;
      border-radius: var(--ai-support-radius); font-size: 12px; font-family: monospace;
    }
    .ai-evidence-badge.error_code {
      background: ${n?"#fef2f2":"rgba(239,68,68,.15)"};
      color: ${n?"#dc2626":"#fca5a5"};
    }
    .ai-evidence-badge.job_id {
      background: ${n?"#f0fdf4":"rgba(34,197,94,.15)"};
      color: ${n?"#16a34a":"#86efac"};
      cursor: pointer;
    }
    .ai-evidence-badge.timestamp {
      background: ${n?"#eff6ff":"rgba(96,165,250,.15)"};
      color: ${n?"#2563eb":"#93c5fd"};
    }
    .ai-evidence-badge.resource_id {
      background: ${n?"#fefce8":"rgba(234,179,8,.15)"};
      color: ${n?"#ca8a04":"#fde047"};
    }
    .ai-evidence-badge.log_excerpt {
      display: block; width: 100%;
      background: ${n?"#f8fafc":"#1e1e2e"};
      color: ${n?"#334155":"#d4d4d8"};
      padding: 8px; border-radius: 6px; white-space: pre-wrap; font-size: 11px;
      border: 1px solid var(--ai-support-border);
    }
    .ai-actions { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px; }
    .ai-action-btn {
      padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer;
      border: 1px solid var(--ai-support-border); background: var(--ai-support-bg);
      color: var(--ai-support-text); transition: background .15s ease-in-out;
    }
    .ai-action-btn:hover { background: var(--ai-support-surface); }
    .ai-action-btn:active { transform: scale(0.97); }
    .ai-action-btn.create_ticket {
      border-color: var(--ai-support-danger); color: var(--ai-support-danger);
    }
    .ai-case-close { margin-top: 8px; padding: 8px; border-radius: 8px;
      background: var(--ai-support-surface); text-align: center;
    }
    .ai-case-close p { font-size: 13px; margin-bottom: 8px; color: var(--ai-support-text); }
    .ai-case-close-btns { display: flex; gap: 8px; justify-content: center; }
    .ai-case-close-btns button {
      padding: 6px 16px; border-radius: 6px; cursor: pointer; border: none;
      font-size: 13px; font-weight: 500; transition: opacity .15s ease-in-out;
    }
    .ai-case-close-btns button:hover { opacity: .85; }
    .ai-close-yes { background: var(--ai-support-success); color: #fff; }
    .ai-close-no { background: var(--ai-support-danger); color: #fff; }
    .ai-rating { display: flex; gap: 4px; justify-content: center; flex-wrap: wrap; }
    .ai-rating button {
      width: 32px; height: 32px; border-radius: 6px; cursor: pointer;
      border: 1px solid var(--ai-support-border); background: var(--ai-support-bg);
      color: var(--ai-support-text); font-size: 13px; font-weight: 600;
      transition: background .15s ease-in-out;
    }
    .ai-rating button:hover { background: var(--ai-support-primary); color: #fff; }
    .ai-widget-input {
      display: flex; padding: 10px 12px; gap: 8px;
      border-top: 1px solid var(--ai-support-border);
    }
    .ai-widget-input input {
      flex: 1; padding: 8px 12px; border-radius: 8px;
      border: 1px solid var(--ai-support-border);
      background: var(--ai-support-bg); color: var(--ai-support-text);
      font-size: 14px; transition: border-color .15s ease-in-out;
    }
    .ai-widget-input input:hover { border-color: var(--ai-support-muted); }
    .ai-widget-input input:focus {
      border-color: var(--ai-support-primary);
      outline: 2px solid var(--ai-support-focus); outline-offset: 1px;
    }
    .ai-widget-input button {
      padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer;
      background: var(--ai-support-primary); color: #fff;
      font-size: 14px; font-weight: 500;
      transition: opacity .15s ease-in-out;
    }
    .ai-widget-input button:hover { opacity: .9; }
    .ai-widget-input button:active { opacity: .8; }
    .ai-widget-input button:disabled { opacity: .5; cursor: not-allowed; }
    .ai-confirm-overlay {
      position: absolute; inset: 0; background: rgba(0,0,0,.5); display: flex;
      align-items: center; justify-content: center; z-index: 10;
    }
    .ai-confirm-box {
      background: var(--ai-support-bg); padding: 20px; border-radius: 12px;
      max-width: 280px; text-align: center;
      border: 1px solid var(--ai-support-border);
    }
    .ai-confirm-box p { margin-bottom: 12px; font-size: 14px; }
    .ai-confirm-box button {
      margin: 0 4px; padding: 6px 16px; border-radius: 6px; cursor: pointer;
      border: none; font-size: 13px; font-weight: 500;
      transition: opacity .15s ease-in-out;
    }
    .ai-confirm-box button:hover { opacity: .9; }
    .ai-confirm-box button:active { opacity: .8; }
    .ai-confirm-yes { background: var(--ai-support-danger); color: #fff; }
    .ai-confirm-no { background: var(--ai-support-surface); color: var(--ai-support-text); }
    @media (max-width: 480px) {
      .ai-widget-panel {
        width: calc(100vw - 24px); right: 12px; bottom: 80px; max-height: 75vh;
      }
      .ai-widget-panel.left { left: 12px; }
      .ai-msg { max-width: 90%; }
      .ai-widget-header button { min-height: 44px; min-width: 44px; }
      .ai-widget-input button { min-height: 44px; }
    }
    @media (prefers-reduced-motion: reduce) {
      * { transition: none !important; animation: none !important; }
    }
    @media (forced-colors: active) {
      .ai-widget-fab, .ai-action-btn, .ai-confirm-yes, .ai-confirm-no {
        border: 2px solid ButtonText;
      }
    }
  `}function J(e){let t=e.getJwt(),n=t;async function o(a,i,r){if(e.signal?.aborted)throw new Error("Support session closed");let s=e.getJwt();s!==n&&(t=s,n=s);let c=`${e.apiUrl}${i}`,d={Authorization:`Bearer ${t}`};r!==void 0&&(d["Content-Type"]="application/json");let p=await fetch(c,{signal:e.signal,method:a,headers:d,body:r!==void 0?JSON.stringify(r):void 0});if(p.status===401&&e.onTokenRefresh){if(t=await e.onTokenRefresh(),e.signal?.aborted)throw new Error("Support session closed");p=await fetch(c,{signal:e.signal,method:a,headers:{...d,Authorization:`Bearer ${t}`},body:r!==void 0?JSON.stringify(r):void 0})}if(!p.ok)throw await p.json().catch(()=>({statusCode:p.status,error:"UNKNOWN",message:p.statusText}));return p.json()}return{async createCase(a,i,r){return o("POST","/api/cases",{message:a,...i?{context:i}:{},...r?{clientTurnId:r}:{}})},async getCase(a){return o("GET",`/api/cases/${a}`)},async sendMessage(a,i,r,s){return(await o("POST",`/api/cases/${a}/messages`,{content:i,...r?{replyToMessageId:r}:{},...s?{clientTurnId:s}:{}})).message},async addFeedback(a,i){await o("POST",`/api/cases/${a}/feedback`,{feedback:i})},async closeCase(a,i,r){await o("POST",`/api/cases/${a}/close`,{resolution:i,rating:r})},async executeAction(a,i){return(await o("POST",`/api/cases/${a}/actions`,{action:i})).result},async escalate(a,i){return o("POST",`/api/cases/${a}/escalate`,{reason:i})}}}function q(e,t){let n=document.createElement("div");n.className="ai-evidence";for(let o of e){let a=document.createElement("span");if(a.className=`ai-evidence-badge ${o.type}`,o.type==="error_code")a.textContent=`${o.label}: ${o.value}`;else if(o.type==="job_id"){a.textContent=`${o.label}: ${o.value}`,a.setAttribute("role","button"),a.setAttribute("tabindex","0"),a.setAttribute("aria-label",`${C(t).copy} ${o.label}: ${o.value}`);let i=()=>{navigator.clipboard.writeText(o.value).catch(()=>{})};a.addEventListener("click",i),a.addEventListener("keydown",r=>{(r.key==="Enter"||r.key===" ")&&(r.preventDefault(),i())})}else if(o.type==="timestamp"){let r=new Date(o.value).toLocaleString(t);a.textContent=`${o.label}: ${r}`}else o.type==="log_excerpt"?a.textContent=o.value:a.textContent=`${o.label}: ${o.value}`;n.appendChild(a)}return n}var de=new Set(["create_ticket","request_access","custom"]);function K(e,t,n,o){let a=C(o),i=document.createElement("div");i.className="ai-actions";for(let r of e){let s=document.createElement("button");s.className=`ai-action-btn ${r.type}`,s.textContent=r.label,s.addEventListener("click",()=>{let c=()=>{pe(r,t).catch(()=>{let d=document.createElement("p");d.setAttribute("role","alert"),d.textContent=a.actionFailed,i.appendChild(d)})};de.has(r.type)?ue(n,r.label,c,a):c()}),i.appendChild(s)}return i}async function pe(e,t){switch(e.type){case"retry":await t.onRetry(e);break;case"open_docs":{t.onOpenDocs(e);break}case"request_access":await t.onRequestAccess(e);break;case"create_ticket":await(t.onCreateTicket??t.onCustom)(e);break;default:await t.onCustom(e)}}function ue(e,t,n,o){let a=document.createElement("div");a.className="ai-confirm-overlay",a.setAttribute("role","alertdialog"),a.setAttribute("aria-modal","true"),a.setAttribute("aria-label",`${o.confirm}: ${t}`);let i=document.createElement("div");i.className="ai-confirm-box";let r=document.createElement("p");r.id="ai-confirm-msg",r.textContent=o.confirmAction(t),a.setAttribute("aria-describedby","ai-confirm-msg"),i.appendChild(r);let s=()=>a.remove(),c=document.createElement("button");c.className="ai-confirm-yes",c.textContent=o.yes,c.addEventListener("click",()=>{s(),n()});let d=document.createElement("button");d.className="ai-confirm-no",d.textContent=o.cancel,d.addEventListener("click",s),a.addEventListener("keydown",p=>{if(p.key==="Escape"){s();return}if(p.key==="Tab"){let g=a.getRootNode()instanceof ShadowRoot?a.getRootNode().activeElement:document.activeElement;p.shiftKey&&g===d?(p.preventDefault(),c.focus()):!p.shiftKey&&g===c&&(p.preventDefault(),d.focus())}}),i.appendChild(c),i.appendChild(d),a.appendChild(i),e.appendChild(a),d.focus()}function V(e,t){let n=document.createElement("div");n.className=`ai-msg ${e.role}`,n.dataset.messageId=e.id;let o=document.createElement("span");if(o.textContent=e.content,n.appendChild(o),e.evidence.length>0&&n.appendChild(q(e.evidence,t.locale)),e.actions.length>0){let a=me(t);n.appendChild(K(e.actions,a,t.panelEl,t.locale))}return n}function W(e){let t=C(e.locale),n=document.createElement("div");n.className="ai-case-close";let o=document.createElement("p");o.textContent=t.resolved,n.appendChild(o);let a=document.createElement("div");a.className="ai-case-close-btns";let i=document.createElement("button");i.className="ai-close-yes",i.textContent=t.yes,i.setAttribute("aria-label",t.resolvedLabel);let r=document.createElement("button");return r.className="ai-close-no",r.textContent=t.no,r.setAttribute("aria-label",t.unresolvedLabel),i.addEventListener("click",()=>Y(n,"resolved",e)),r.addEventListener("click",()=>fe(n,e)),a.appendChild(i),a.appendChild(r),n.appendChild(a),n}function fe(e,t){Y(e,"unresolved",t)}function Y(e,t,n){let o=C(n.locale);e.innerHTML="";let a=document.createElement("p");a.textContent=o.rating,e.appendChild(a);let i=document.createElement("div");i.className="ai-rating";for(let s=1;s<=10;s++){let c=document.createElement("button");c.textContent=String(s),c.setAttribute("aria-label",o.rateLabel(s)),c.addEventListener("click",()=>D(e,t,s,n)),i.appendChild(c)}e.appendChild(i);let r=document.createElement("button");r.type="button",r.textContent=o.skipRating,r.addEventListener("click",()=>void D(e,t,void 0,n)),e.appendChild(r),n.messagesEl.scrollTop=n.messagesEl.scrollHeight}async function D(e,t,n,o){let a=C(o.locale);e.innerHTML="";let i=document.createElement("p");i.textContent=a.closing,e.appendChild(i);try{await o.apiClient.closeCase(o.caseId,t,n),e.innerHTML="";let r=document.createElement("p");r.textContent=a.closed,e.appendChild(r),o.onCaseClosed&&setTimeout(()=>o.onCaseClosed(),2e3)}catch{e.innerHTML="";let r=document.createElement("p");r.textContent=a.closeFailed,e.appendChild(r);let s=document.createElement("button");s.type="button",s.textContent=a.retry,s.addEventListener("click",()=>void D(e,t,n,o)),e.appendChild(s)}}function me(e){let{apiClient:t,caseId:n}=e;return{async onRetry(o){let a=await t.executeAction(n,o);P(a,e)},onOpenDocs(o){let a=o.payload.url;a&&window.open(a,"_blank","noopener")},async onRequestAccess(o){let a=await t.executeAction(n,o);P(a,e)},async onCustom(o){let a=await t.executeAction(n,o);P(a,e)}}}function P(e,t){let n=document.createElement("div");n.className="ai-msg system",n.textContent=e,t.messagesEl.appendChild(n),t.messagesEl.scrollTop=t.messagesEl.scrollHeight}function j(e){let{apiClient:t,locale:n,position:o,onClose:a}=e,i=C(n),r=o==="bottom-left",s=document.createElement("div");s.className=`ai-widget-panel${r?" left":""}`,s.setAttribute("role","dialog"),s.setAttribute("aria-label",i.chat);let c=document.createElement("div");c.className="ai-widget-header";let d=document.createElement("h2");d.className="ai-widget-header-title",d.textContent=i.support,d.id="ai-widget-title",s.setAttribute("aria-labelledby","ai-widget-title");let p=document.createElement("button");p.className="ai-close-btn",p.textContent="\u2715",p.setAttribute("aria-label",i.minimize),p.addEventListener("click",a);let g=document.createElement("button");if(g.className="ai-end-btn",g.textContent=i.end,g.setAttribute("aria-label",i.endLabel),g.style.display="none",c.appendChild(d),e.handoffUrl){let l=document.createElement("a");l.href=e.handoffUrl,l.textContent=i.humanHelp,l.className="ai-widget-handoff",l.target="_blank",l.rel="noopener noreferrer",c.appendChild(l)}c.appendChild(g),c.appendChild(p);let f=document.createElement("div");f.className="ai-widget-messages",f.setAttribute("role","log"),f.setAttribute("aria-live","polite"),f.setAttribute("aria-label",i.messages);let E=document.createElement("div");E.className="ai-widget-input",E.setAttribute("role","form"),E.setAttribute("aria-label",i.composer);let h=document.createElement("input");h.type="text",h.placeholder=i.placeholder,h.setAttribute("aria-label",i.messageLabel);let S=document.createElement("button");S.textContent=i.send,S.setAttribute("aria-label",i.sendLabel),E.appendChild(h),E.appendChild(S),s.appendChild(c),s.appendChild(f),s.appendChild(E);let x=e.initialCaseId??null,k=!1,L,N=!1;if(x&&(g.style.display=""),g.addEventListener("click",()=>{!x||N||(N=!0,f.appendChild(W(u())),f.scrollTop=f.scrollHeight)}),e.initialMessages&&e.initialMessages.length>0)for(let l of e.initialMessages)y(l);async function I(l){if(!x||k)return;k=!0;let $=b();try{let w=await t.sendMessage(x,l,L);$.remove(),y(w)}catch{$.remove();let w=document.createElement("div");w.className="ai-msg system",w.textContent=i.responseFailed,f.appendChild(w)}finally{k=!1}}function u(){return{apiClient:t,locale:n,messagesEl:f,panelEl:s,caseId:x??"",onCaseClosed:e.onCaseClosed,onSendMessage:I}}function b(){let l=document.createElement("div");return l.className="ai-typing",l.setAttribute("role","status"),l.setAttribute("aria-live","polite"),l.textContent=i.thinking,f.appendChild(l),f.scrollTop=f.scrollHeight,l}function y(l){l.role==="assistant"&&(L=l.id),f.appendChild(V(l,u())),f.scrollTop=f.scrollHeight}let T;async function z(){let l=h.value.trim();if(!l||k)return;T?.text!==l&&(T={text:l,id:globalThis.crypto?.randomUUID?.()});let $=T.id;k=!0,S.setAttribute("disabled",""),h.readOnly=!0,f.querySelector("[data-send-error]")?.remove();let w=b();try{let v;if(x)v=await t.sendMessage(x,l,L,$);else{let M=await t.createCase(l,e.getContext?e.getContext():e.context,$);x=M.case.id,e.onCaseCreated?.(x),g.style.display="",v=M.aiMessage??await t.sendMessage(x,l,L)}w.remove();let A={id:"local_u",caseId:x,role:"user",content:l,actions:[],evidence:[],confidence:null,createdAt:new Date().toISOString()};y(A),y(v),h.value="",T=void 0}catch{w.remove();let v=document.createElement("div");v.className="ai-msg system",v.dataset.sendError="",v.setAttribute("role","status"),v.textContent=i.sendFailed+" ";let A=document.createElement("button");A.type="button",A.textContent=i.retry,A.addEventListener("click",()=>void z()),v.appendChild(A),f.appendChild(v)}finally{k=!1,h.readOnly=!1,S.removeAttribute("disabled")}}return S.addEventListener("click",z),h.addEventListener("keydown",l=>{l.key==="Enter"&&z()}),s.addEventListener("keydown",l=>{l.key==="Escape"&&a()}),{element:s,destroy(){s.remove()},focus(){h.focus()},hide(){s.classList.add("hidden")},show(){s.classList.remove("hidden")}}}var be="ai_support_";function H(e){return`${be}v2_${encodeURIComponent(e)}_caseId`}function G(e,t){try{localStorage.setItem(H(e),t)}catch{}}function X(e){try{return localStorage.getItem(H(e))}catch{return null}}function Q(e){try{localStorage.removeItem(H(e))}catch{}}var R=class e{static init(t){e.instance&&e.instance.destroy();let n=t.theme??"light",o=t.position??"bottom-right",a=t.locale??"en-US",i=C(a),r;try{if(t.handoffUrl){let m=new URL(t.handoffUrl,window.location.href);m.protocol==="https:"&&!m.username&&!m.password&&(r=m.href)}}catch{}let s=t.tenantKey,c=F(t.jwt,s),d=!1,p=0,g=null,f=new AbortController;try{localStorage.removeItem(`ai_support_${s}_caseId`)}catch{}let E=()=>{c&&Q(c)},h=m=>{!d&&c&&G(c,m)},S=o==="bottom-left",x=document.createElement("div");x.id="ai-support-widget",document.body.appendChild(x);let k=x.attachShadow({mode:"open"}),L=document.createElement("style");L.textContent=B(n,t.brandColor),k.appendChild(L);let N=t.jwt,I=J({apiUrl:t.apiUrl,getJwt:()=>N,signal:f.signal,onTokenRefresh:t.onTokenRefresh?async()=>{let m=await t.onTokenRefresh();return M(m),N}:void 0}),u=document.createElement("button");u.className=`ai-widget-fab${S?" left":""}`,u.textContent="\u{1F4AC}",u.setAttribute("aria-label",i.open),u.setAttribute("aria-expanded","false"),u.setAttribute("aria-haspopup","dialog"),k.appendChild(u);let b=null,y=!1;function T(){E(),b&&(b.destroy(),b=null),y=!1,u.setAttribute("aria-expanded","false"),u.setAttribute("aria-label",i.open)}function z(m){k.appendChild(m.element),y=!0,u.setAttribute("aria-expanded","true"),u.setAttribute("aria-label",i.minimize),m.focus()}async function l(){let m=p;if(t.onOpen&&await t.onOpen(),d||p!==m)return;if(b&&!y){b.show(),y=!0,u.setAttribute("aria-expanded","true"),u.setAttribute("aria-label",i.minimize),b.focus();return}if(b)return;let U=c?X(c):null;if(U)try{let{case:ee,messages:te}=await I.getCase(U);if(d||p!==m)return;if(ee.status==="active"&&F(N,s)===c){b=j({apiClient:I,locale:a,position:o,handoffUrl:r,onClose:w,onCaseClosed:T,getContext:()=>t.context,initialCaseId:U,initialMessages:te,onCaseCreated:h}),z(b);return}E()}catch{E()}d||p!==m||(b=j({apiClient:I,locale:a,position:o,handoffUrl:r,onClose:w,onCaseClosed:T,getContext:()=>t.context,onCaseCreated:h}),z(b))}function $(){return d?Promise.reject(new Error("Support session closed")):g||(g=l().finally(()=>{g=null}),g)}function w(){b&&b.hide(),y=!1,u.setAttribute("aria-expanded","false"),u.setAttribute("aria-label",i.open),u.focus()}function v(){p++,b&&(b.destroy(),b=null),y=!1,u.setAttribute("aria-expanded","false"),u.setAttribute("aria-label",i.open),u.focus()}function A(){d=!0,f.abort(),E(),v(),x.remove(),e.instance===O&&(e.instance=null)}u.addEventListener("click",()=>{y?w():$().catch(()=>{u.setAttribute("aria-label",i.unavailable)})});function M(m){if(d)throw new Error("Support session closed");if(F(m,s)!==c)throw A(),new Error("Support identity changed; initialize a new widget");N=m}function Z(m){if(d)throw new Error("Support session closed");t.context=m}let O={open:$,close:v,destroy:A,updateJwt:M,updateContext:Z};return e.instance=O,O}};R.instance=null;typeof window<"u"&&(window.AISupportWidget=R);return se(ge);})();
window.AISupportWidget=AISupportWidgetModule.AISupportWidget;
