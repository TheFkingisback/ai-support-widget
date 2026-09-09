"use strict";var AISupportWidgetModule=(()=>{var M=Object.defineProperty;var Z=Object.getOwnPropertyDescriptor;var ee=Object.getOwnPropertyNames;var te=Object.prototype.hasOwnProperty;var ae=(e,t)=>{for(var o in t)M(e,o,{get:t[o],enumerable:!0})},ne=(e,t,o,n)=>{if(t&&typeof t=="object"||typeof t=="function")for(let a of ee(t))!te.call(e,a)&&a!==o&&M(e,a,{get:()=>t[a],enumerable:!(n=Z(t,a))||n.enumerable});return e};var oe=e=>ne(M({},"__esModule",{value:!0}),e);var pe={};ae(pe,{AISupportWidget:()=>T});function I(e,t){try{let o=e.split(".")[1].replace(/-/g,"+").replace(/_/g,"/"),n=Uint8Array.from(atob(o.padEnd(Math.ceil(o.length/4)*4,"=")),i=>i.charCodeAt(0)),a=JSON.parse(new TextDecoder().decode(n));return a.tenantId!==t||typeof a.userId!="string"||!a.userId?null:JSON.stringify([t,a.userId])}catch{return null}}function B(e,t){let o=e==="light";return`
    :host {
      --ai-support-primary: ${t??(o?"#2563eb":"#60a5fa")};
      --ai-support-bg: ${o?"#ffffff":"#1e1e2e"};
      --ai-support-text: ${o?"#1a1a2e":"#e4e4e7"};
      --ai-support-radius: 12px;
      --ai-support-surface: ${o?"#f4f4f5":"#2a2a3e"};
      --ai-support-border: ${o?"#e4e4e7":"#3a3a4e"};
      --ai-support-muted: ${o?"#5c5c66":"#a1a1aa"};
      --ai-support-danger: #ef4444;
      --ai-support-success: #22c55e;
      --ai-support-focus: ${t??(o?"#2563eb":"#60a5fa")};
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
      background: ${o?"#fef2f2":"rgba(239,68,68,.15)"};
      color: ${o?"#dc2626":"#fca5a5"};
    }
    .ai-evidence-badge.job_id {
      background: ${o?"#f0fdf4":"rgba(34,197,94,.15)"};
      color: ${o?"#16a34a":"#86efac"};
      cursor: pointer;
    }
    .ai-evidence-badge.timestamp {
      background: ${o?"#eff6ff":"rgba(96,165,250,.15)"};
      color: ${o?"#2563eb":"#93c5fd"};
    }
    .ai-evidence-badge.resource_id {
      background: ${o?"#fefce8":"rgba(234,179,8,.15)"};
      color: ${o?"#ca8a04":"#fde047"};
    }
    .ai-evidence-badge.log_excerpt {
      display: block; width: 100%;
      background: ${o?"#f8fafc":"#1e1e2e"};
      color: ${o?"#334155":"#d4d4d8"};
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
  `}function D(e){let t=e.getJwt(),o=t;async function n(a,i,r){if(e.signal?.aborted)throw new Error("Support session closed");let s=e.getJwt();s!==o&&(t=s,o=s);let f=`${e.apiUrl}${i}`,p={Authorization:`Bearer ${t}`};r!==void 0&&(p["Content-Type"]="application/json");let u=await fetch(f,{signal:e.signal,method:a,headers:p,body:r!==void 0?JSON.stringify(r):void 0});if(u.status===401&&e.onTokenRefresh){if(t=await e.onTokenRefresh(),e.signal?.aborted)throw new Error("Support session closed");u=await fetch(f,{signal:e.signal,method:a,headers:{...p,Authorization:`Bearer ${t}`},body:r!==void 0?JSON.stringify(r):void 0})}if(!u.ok)throw await u.json().catch(()=>({statusCode:u.status,error:"UNKNOWN",message:u.statusText}));return u.json()}return{async createCase(a,i){return n("POST","/api/cases",{message:a,...i?{context:i}:{}})},async getCase(a){return n("GET",`/api/cases/${a}`)},async sendMessage(a,i){return(await n("POST",`/api/cases/${a}/messages`,{content:i})).message},async addFeedback(a,i){await n("POST",`/api/cases/${a}/feedback`,{feedback:i})},async closeCase(a,i,r){await n("POST",`/api/cases/${a}/close`,{resolution:i,rating:r})},async executeAction(a,i){return(await n("POST",`/api/cases/${a}/actions`,{action:i})).result}}}function H(e,t){let o=document.createElement("div");o.className="ai-evidence";for(let n of e){let a=document.createElement("span");if(a.className=`ai-evidence-badge ${n.type}`,n.type==="error_code")a.textContent=`${n.label}: ${n.value}`;else if(n.type==="job_id"){a.textContent=`${n.label}: ${n.value}`,a.setAttribute("role","button"),a.setAttribute("tabindex","0"),a.setAttribute("aria-label",`Copy ${n.label}: ${n.value}`);let i=()=>{navigator.clipboard.writeText(n.value).catch(()=>{})};a.addEventListener("click",i),a.addEventListener("keydown",r=>{(r.key==="Enter"||r.key===" ")&&(r.preventDefault(),i())})}else if(n.type==="timestamp"){let r=new Date(n.value).toLocaleString(t);a.textContent=`${n.label}: ${r}`}else n.type==="log_excerpt"?a.textContent=n.value:a.textContent=`${n.label}: ${n.value}`;o.appendChild(a)}return o}var ie=new Set;function U(e,t,o){let n=document.createElement("div");n.className="ai-actions";for(let a of e){let i=document.createElement("button");i.className=`ai-action-btn ${a.type}`,i.textContent=a.label,i.addEventListener("click",()=>{ie.has(a.type)?re(o,a.label,()=>F(a,t)):F(a,t)}),n.appendChild(i)}return n}function F(e,t){switch(e.type){case"retry":t.onRetry(e);break;case"open_docs":{t.onOpenDocs(e);break}case"request_access":t.onRequestAccess(e);break;default:t.onCustom(e)}}function re(e,t,o){let n=document.createElement("div");n.className="ai-confirm-overlay",n.setAttribute("role","alertdialog"),n.setAttribute("aria-modal","true"),n.setAttribute("aria-label",`Confirm: ${t}`);let a=document.createElement("div");a.className="ai-confirm-box";let i=document.createElement("p");i.id="ai-confirm-msg",i.textContent=`Are you sure you want to "${t}"?`,n.setAttribute("aria-describedby","ai-confirm-msg"),a.appendChild(i);let r=()=>n.remove(),s=document.createElement("button");s.className="ai-confirm-yes",s.textContent="Yes",s.addEventListener("click",()=>{r(),o()});let f=document.createElement("button");f.className="ai-confirm-no",f.textContent="Cancel",f.addEventListener("click",r),n.addEventListener("keydown",p=>{if(p.key==="Escape"){r();return}if(p.key==="Tab"){let u=n.getRootNode()instanceof ShadowRoot?n.getRootNode().activeElement:document.activeElement;p.shiftKey&&u===f?(p.preventDefault(),s.focus()):!p.shiftKey&&u===s&&(p.preventDefault(),f.focus())}}),a.appendChild(s),a.appendChild(f),n.appendChild(a),e.appendChild(n),f.focus()}function J(e,t){let o=document.createElement("div");o.className=`ai-msg ${e.role}`,o.dataset.messageId=e.id;let n=document.createElement("span");if(n.textContent=e.content,o.appendChild(n),e.evidence.length>0&&o.appendChild(H(e.evidence,t.locale)),e.actions.length>0){let a=de(t);o.appendChild(U(e.actions,a,t.panelEl))}return o}function q(e){let t=document.createElement("div");t.className="ai-case-close";let o=document.createElement("p");o.textContent="Was your issue resolved?",t.appendChild(o);let n=document.createElement("div");n.className="ai-case-close-btns";let a=document.createElement("button");a.className="ai-close-yes",a.textContent="Yes",a.setAttribute("aria-label","Issue was resolved");let i=document.createElement("button");return i.className="ai-close-no",i.textContent="No",i.setAttribute("aria-label","Issue was not resolved"),a.addEventListener("click",()=>K(t,"resolved",e)),i.addEventListener("click",()=>se(t,e)),n.appendChild(a),n.appendChild(i),t.appendChild(n),t}function se(e,t){K(e,"unresolved",t)}function K(e,t,o){e.innerHTML="";let n=document.createElement("p");n.textContent="How would you rate this experience? (1-10)",e.appendChild(n);let a=document.createElement("div");a.className="ai-rating";for(let i=1;i<=10;i++){let r=document.createElement("button");r.textContent=String(i),r.setAttribute("aria-label",`Rate ${i} out of 10`),r.addEventListener("click",()=>ce(e,t,i,o)),a.appendChild(r)}e.appendChild(a),o.messagesEl.scrollTop=o.messagesEl.scrollHeight}async function ce(e,t,o,n){e.innerHTML="";let a=document.createElement("p");a.textContent="Closing case...",e.appendChild(a);try{await n.apiClient.closeCase(n.caseId,t,o),e.innerHTML="";let i=document.createElement("p");i.textContent="Thanks for your feedback! Case closed.",e.appendChild(i),n.onCaseClosed&&setTimeout(()=>n.onCaseClosed(),2e3)}catch{e.innerHTML="";let i=document.createElement("p");i.textContent="Failed to close case. Please try again.",e.appendChild(i)}}function de(e){let{apiClient:t,caseId:o}=e;return{async onRetry(n){let a=await t.executeAction(o,n);R(a,e)},onOpenDocs(n){let a=n.payload.url;a&&window.open(a,"_blank","noopener")},async onRequestAccess(n){let a=await t.executeAction(o,n);R(a,e)},async onCustom(n){let a=await t.executeAction(o,n);R(a,e)}}}function R(e,t){let o=document.createElement("div");o.className="ai-msg system",o.textContent=e,t.messagesEl.appendChild(o),t.messagesEl.scrollTop=t.messagesEl.scrollHeight}function O(e){let{apiClient:t,locale:o,position:n,onClose:a}=e,i=n==="bottom-left",r=document.createElement("div");r.className=`ai-widget-panel${i?" left":""}`,r.setAttribute("role","dialog"),r.setAttribute("aria-label","Support chat");let s=document.createElement("div");s.className="ai-widget-header";let f=document.createElement("h2");f.className="ai-widget-header-title",f.textContent="Support",f.id="ai-widget-title",r.setAttribute("aria-labelledby","ai-widget-title");let p=document.createElement("button");p.className="ai-close-btn",p.textContent="\u2715",p.setAttribute("aria-label","Minimize support chat"),p.addEventListener("click",a);let u=document.createElement("button");u.className="ai-end-btn",u.textContent="End Session",u.setAttribute("aria-label","End support session"),u.style.display="none",s.appendChild(f),s.appendChild(u),s.appendChild(p);let d=document.createElement("div");d.className="ai-widget-messages",d.setAttribute("role","log"),d.setAttribute("aria-live","polite"),d.setAttribute("aria-label","Chat messages");let w=document.createElement("div");w.className="ai-widget-input",w.setAttribute("role","form"),w.setAttribute("aria-label","Send a message");let v=document.createElement("input");v.type="text",v.placeholder="Describe your issue...",v.setAttribute("aria-label","Type your message");let y=document.createElement("button");y.textContent="Send",y.setAttribute("aria-label","Send message"),w.appendChild(v),w.appendChild(y),r.appendChild(s),r.appendChild(d),r.appendChild(w);let g=e.initialCaseId??null,C=!1,E=!1;if(g&&(u.style.display=""),u.addEventListener("click",()=>{!g||E||(E=!0,d.appendChild(q(l())),d.scrollTop=d.scrollHeight)}),e.initialMessages&&e.initialMessages.length>0)for(let c of e.initialMessages)h(c);async function A(c){if(!g||C)return;C=!0;let k=m();try{let b=await t.sendMessage(g,c);k.remove(),h(b)}catch{k.remove();let b=document.createElement("div");b.className="ai-msg system",b.textContent="Failed to get response. Please try again.",d.appendChild(b)}finally{C=!1}}function l(){return{apiClient:t,locale:o,messagesEl:d,panelEl:r,caseId:g??"",onCaseClosed:e.onCaseClosed,onSendMessage:A}}function m(){let c=document.createElement("div");return c.className="ai-typing",c.setAttribute("role","status"),c.setAttribute("aria-live","polite"),c.textContent="AI is thinking...",d.appendChild(c),d.scrollTop=d.scrollHeight,c}function h(c){d.appendChild(J(c,l())),d.scrollTop=d.scrollHeight}async function S(){let c=v.value.trim();if(!c||C)return;C=!0,y.setAttribute("disabled",""),v.value="";let k=m();try{let b;if(g)b=await t.sendMessage(g,c);else{let N=await t.createCase(c,e.getContext?e.getContext():e.context);g=N.case.id,e.onCaseCreated?.(g),u.style.display="",b=N.aiMessage??await t.sendMessage(g,c)}k.remove();let $={id:"local_u",caseId:g,role:"user",content:c,actions:[],evidence:[],confidence:null,createdAt:new Date().toISOString()};h($),h(b)}catch{k.remove();let b=document.createElement("div");b.className="ai-msg system",b.textContent="Failed to send message. Please try again.",d.appendChild(b)}finally{C=!1,y.removeAttribute("disabled")}}return y.addEventListener("click",S),v.addEventListener("keydown",c=>{c.key==="Enter"&&S()}),r.addEventListener("keydown",c=>{c.key==="Escape"&&a()}),{element:r,destroy(){r.remove()},focus(){v.focus()},hide(){r.classList.add("hidden")},show(){r.classList.remove("hidden")}}}var le="ai_support_";function P(e){return`${le}v2_${encodeURIComponent(e)}_caseId`}function V(e,t){try{localStorage.setItem(P(e),t)}catch{}}function Y(e){try{return localStorage.getItem(P(e))}catch{return null}}function W(e){try{localStorage.removeItem(P(e))}catch{}}var T=class e{static init(t){e.instance&&e.instance.destroy();let o=t.theme??"light",n=t.position??"bottom-right",a=t.locale??"en-US",i=t.tenantKey,r=I(t.jwt,i),s=!1,f=0,p=null,u=new AbortController;try{localStorage.removeItem(`ai_support_${i}_caseId`)}catch{}let d=()=>{r&&W(r)},w=x=>{!s&&r&&V(r,x)},v=n==="bottom-left",y=document.createElement("div");y.id="ai-support-widget",document.body.appendChild(y);let g=y.attachShadow({mode:"open"}),C=document.createElement("style");C.textContent=B(o,t.brandColor),g.appendChild(C);let E=t.jwt,A=D({apiUrl:t.apiUrl,getJwt:()=>E,signal:u.signal,onTokenRefresh:t.onTokenRefresh?async()=>{let x=await t.onTokenRefresh();return j(x),E}:void 0}),l=document.createElement("button");l.className=`ai-widget-fab${v?" left":""}`,l.textContent="\u{1F4AC}",l.setAttribute("aria-label","Open support chat"),l.setAttribute("aria-expanded","false"),l.setAttribute("aria-haspopup","dialog"),g.appendChild(l);let m=null,h=!1;function S(){d(),m&&(m.destroy(),m=null),h=!1,l.setAttribute("aria-expanded","false"),l.setAttribute("aria-label","Open support chat")}function c(x){g.appendChild(x.element),h=!0,l.setAttribute("aria-expanded","true"),l.setAttribute("aria-label","Minimize support chat"),x.focus()}async function k(){let x=f;if(t.onOpen&&await t.onOpen(),s||f!==x)return;if(m&&!h){m.show(),h=!0,l.setAttribute("aria-expanded","true"),l.setAttribute("aria-label","Minimize support chat"),m.focus();return}if(m)return;let L=r?Y(r):null;if(L)try{let{case:X,messages:Q}=await A.getCase(L);if(s||f!==x)return;if(X.status==="active"&&I(E,i)===r){m=O({apiClient:A,locale:a,position:n,onClose:$,onCaseClosed:S,getContext:()=>t.context,initialCaseId:L,initialMessages:Q,onCaseCreated:w}),c(m);return}d()}catch{d()}s||f!==x||(m=O({apiClient:A,locale:a,position:n,onClose:$,onCaseClosed:S,getContext:()=>t.context,onCaseCreated:w}),c(m))}function b(){return s?Promise.reject(new Error("Support session closed")):p||(p=k().finally(()=>{p=null}),p)}function $(){m&&m.hide(),h=!1,l.setAttribute("aria-expanded","false"),l.setAttribute("aria-label","Open support chat"),l.focus()}function N(){f++,m&&(m.destroy(),m=null),h=!1,l.setAttribute("aria-expanded","false"),l.setAttribute("aria-label","Open support chat"),l.focus()}function _(){s=!0,u.abort(),d(),N(),y.remove(),e.instance===z&&(e.instance=null)}l.addEventListener("click",()=>{h?$():b().catch(()=>{l.setAttribute("aria-label","Support unavailable. Try again.")})});function j(x){if(s)throw new Error("Support session closed");if(I(x,i)!==r)throw _(),new Error("Support identity changed; initialize a new widget");E=x}function G(x){if(s)throw new Error("Support session closed");t.context=x}let z={open:b,close:N,destroy:_,updateJwt:j,updateContext:G};return e.instance=z,z}};T.instance=null;typeof window<"u"&&(window.AISupportWidget=T);return oe(pe);})();
window.AISupportWidget=AISupportWidgetModule.AISupportWidget;
