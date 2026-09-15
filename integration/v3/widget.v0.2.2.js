"use strict";var AISupportWidgetModule=(()=>{var O=Object.defineProperty;var Q=Object.getOwnPropertyDescriptor;var Z=Object.getOwnPropertyNames;var ee=Object.prototype.hasOwnProperty;var te=(e,t)=>{for(var i in t)O(e,i,{get:t[i],enumerable:!0})},ae=(e,t,i,n)=>{if(t&&typeof t=="object"||typeof t=="function")for(let a of Z(t))!ee.call(e,a)&&a!==i&&O(e,a,{get:()=>t[a],enumerable:!(n=Q(t,a))||n.enumerable});return e};var ne=e=>ae(O({},"__esModule",{value:!0}),e);var pe={};te(pe,{AISupportWidget:()=>T});function z(e,t){try{let i=e.split(".")[1].replace(/-/g,"+").replace(/_/g,"/"),n=Uint8Array.from(atob(i.padEnd(Math.ceil(i.length/4)*4,"=")),o=>o.charCodeAt(0)),a=JSON.parse(new TextDecoder().decode(n));return a.tenantId!==t||typeof a.userId!="string"||!a.userId?null:JSON.stringify([t,a.userId])}catch{return null}}function B(e,t){let i=e==="light";return`
    :host {
      --ai-support-primary: ${t??(i?"#2563eb":"#60a5fa")};
      --ai-support-bg: ${i?"#ffffff":"#1e1e2e"};
      --ai-support-text: ${i?"#1a1a2e":"#e4e4e7"};
      --ai-support-radius: 12px;
      --ai-support-surface: ${i?"#f4f4f5":"#2a2a3e"};
      --ai-support-border: ${i?"#e4e4e7":"#3a3a4e"};
      --ai-support-muted: ${i?"#5c5c66":"#a1a1aa"};
      --ai-support-danger: #ef4444;
      --ai-support-success: #22c55e;
      --ai-support-focus: ${t??(i?"#2563eb":"#60a5fa")};
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
      background: ${i?"#fef2f2":"rgba(239,68,68,.15)"};
      color: ${i?"#dc2626":"#fca5a5"};
    }
    .ai-evidence-badge.job_id {
      background: ${i?"#f0fdf4":"rgba(34,197,94,.15)"};
      color: ${i?"#16a34a":"#86efac"};
      cursor: pointer;
    }
    .ai-evidence-badge.timestamp {
      background: ${i?"#eff6ff":"rgba(96,165,250,.15)"};
      color: ${i?"#2563eb":"#93c5fd"};
    }
    .ai-evidence-badge.resource_id {
      background: ${i?"#fefce8":"rgba(234,179,8,.15)"};
      color: ${i?"#ca8a04":"#fde047"};
    }
    .ai-evidence-badge.log_excerpt {
      display: block; width: 100%;
      background: ${i?"#f8fafc":"#1e1e2e"};
      color: ${i?"#334155":"#d4d4d8"};
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
  `}function D(e){let t=e.getJwt(),i=t;async function n(a,o,r){if(e.signal?.aborted)throw new Error("Support session closed");let s=e.getJwt();s!==i&&(t=s,i=s);let f=`${e.apiUrl}${o}`,d={Authorization:`Bearer ${t}`};r!==void 0&&(d["Content-Type"]="application/json");let p=await fetch(f,{signal:e.signal,method:a,headers:d,body:r!==void 0?JSON.stringify(r):void 0});if(p.status===401&&e.onTokenRefresh){if(t=await e.onTokenRefresh(),e.signal?.aborted)throw new Error("Support session closed");p=await fetch(f,{signal:e.signal,method:a,headers:{...d,Authorization:`Bearer ${t}`},body:r!==void 0?JSON.stringify(r):void 0})}if(!p.ok)throw await p.json().catch(()=>({statusCode:p.status,error:"UNKNOWN",message:p.statusText}));return p.json()}return{async createCase(a,o){return n("POST","/api/cases",{message:a,...o?{context:o}:{}})},async getCase(a){return n("GET",`/api/cases/${a}`)},async sendMessage(a,o,r){return(await n("POST",`/api/cases/${a}/messages`,{content:o,...r?{replyToMessageId:r}:{}})).message},async addFeedback(a,o){await n("POST",`/api/cases/${a}/feedback`,{feedback:o})},async closeCase(a,o,r){await n("POST",`/api/cases/${a}/close`,{resolution:o,rating:r})},async executeAction(a,o){return(await n("POST",`/api/cases/${a}/actions`,{action:o})).result},async escalate(a,o){return n("POST",`/api/cases/${a}/escalate`,{reason:o})}}}function H(e,t){let i=document.createElement("div");i.className="ai-evidence";for(let n of e){let a=document.createElement("span");if(a.className=`ai-evidence-badge ${n.type}`,n.type==="error_code")a.textContent=`${n.label}: ${n.value}`;else if(n.type==="job_id"){a.textContent=`${n.label}: ${n.value}`,a.setAttribute("role","button"),a.setAttribute("tabindex","0"),a.setAttribute("aria-label",`Copy ${n.label}: ${n.value}`);let o=()=>{navigator.clipboard.writeText(n.value).catch(()=>{})};a.addEventListener("click",o),a.addEventListener("keydown",r=>{(r.key==="Enter"||r.key===" ")&&(r.preventDefault(),o())})}else if(n.type==="timestamp"){let r=new Date(n.value).toLocaleString(t);a.textContent=`${n.label}: ${r}`}else n.type==="log_excerpt"?a.textContent=n.value:a.textContent=`${n.label}: ${n.value}`;i.appendChild(a)}return i}var ie=new Set(["create_ticket","request_access","custom"]);function U(e,t,i){let n=document.createElement("div");n.className="ai-actions";for(let a of e){let o=document.createElement("button");o.className=`ai-action-btn ${a.type}`,o.textContent=a.label,o.addEventListener("click",()=>{let r=()=>{oe(a,t).catch(()=>{let s=document.createElement("p");s.setAttribute("role","alert"),s.textContent="This action is unavailable. Use the application or its human support channel.",n.appendChild(s)})};ie.has(a.type)?re(i,a.label,r):r()}),n.appendChild(o)}return n}async function oe(e,t){switch(e.type){case"retry":await t.onRetry(e);break;case"open_docs":{t.onOpenDocs(e);break}case"request_access":await t.onRequestAccess(e);break;case"create_ticket":await(t.onCreateTicket??t.onCustom)(e);break;default:await t.onCustom(e)}}function re(e,t,i){let n=document.createElement("div");n.className="ai-confirm-overlay",n.setAttribute("role","alertdialog"),n.setAttribute("aria-modal","true"),n.setAttribute("aria-label",`Confirm: ${t}`);let a=document.createElement("div");a.className="ai-confirm-box";let o=document.createElement("p");o.id="ai-confirm-msg",o.textContent=`Are you sure you want to "${t}"?`,n.setAttribute("aria-describedby","ai-confirm-msg"),a.appendChild(o);let r=()=>n.remove(),s=document.createElement("button");s.className="ai-confirm-yes",s.textContent="Yes",s.addEventListener("click",()=>{r(),i()});let f=document.createElement("button");f.className="ai-confirm-no",f.textContent="Cancel",f.addEventListener("click",r),n.addEventListener("keydown",d=>{if(d.key==="Escape"){r();return}if(d.key==="Tab"){let p=n.getRootNode()instanceof ShadowRoot?n.getRootNode().activeElement:document.activeElement;d.shiftKey&&p===f?(d.preventDefault(),s.focus()):!d.shiftKey&&p===s&&(d.preventDefault(),f.focus())}}),a.appendChild(s),a.appendChild(f),n.appendChild(a),e.appendChild(n),f.focus()}function F(e,t){let i=document.createElement("div");i.className=`ai-msg ${e.role}`,i.dataset.messageId=e.id;let n=document.createElement("span");if(n.textContent=e.content,i.appendChild(n),e.evidence.length>0&&i.appendChild(H(e.evidence,t.locale)),e.actions.length>0){let a=le(t);i.appendChild(U(e.actions,a,t.panelEl))}return i}function J(e){let t=document.createElement("div");t.className="ai-case-close";let i=document.createElement("p");i.textContent="Was your issue resolved?",t.appendChild(i);let n=document.createElement("div");n.className="ai-case-close-btns";let a=document.createElement("button");a.className="ai-close-yes",a.textContent="Yes",a.setAttribute("aria-label","Issue was resolved");let o=document.createElement("button");return o.className="ai-close-no",o.textContent="No",o.setAttribute("aria-label","Issue was not resolved"),a.addEventListener("click",()=>q(t,"resolved",e)),o.addEventListener("click",()=>se(t,e)),n.appendChild(a),n.appendChild(o),t.appendChild(n),t}function se(e,t){q(e,"unresolved",t)}function q(e,t,i){e.innerHTML="";let n=document.createElement("p");n.textContent="How would you rate this experience? (1-10)",e.appendChild(n);let a=document.createElement("div");a.className="ai-rating";for(let o=1;o<=10;o++){let r=document.createElement("button");r.textContent=String(o),r.setAttribute("aria-label",`Rate ${o} out of 10`),r.addEventListener("click",()=>ce(e,t,o,i)),a.appendChild(r)}e.appendChild(a),i.messagesEl.scrollTop=i.messagesEl.scrollHeight}async function ce(e,t,i,n){e.innerHTML="";let a=document.createElement("p");a.textContent="Closing case...",e.appendChild(a);try{await n.apiClient.closeCase(n.caseId,t,i),e.innerHTML="";let o=document.createElement("p");o.textContent="Thanks for your feedback! Case closed.",e.appendChild(o),n.onCaseClosed&&setTimeout(()=>n.onCaseClosed(),2e3)}catch{e.innerHTML="";let o=document.createElement("p");o.textContent="Failed to close case. Please try again.",e.appendChild(o)}}function le(e){let{apiClient:t,caseId:i}=e;return{async onRetry(n){let a=await t.executeAction(i,n);R(a,e)},onOpenDocs(n){let a=n.payload.url;a&&window.open(a,"_blank","noopener")},async onRequestAccess(n){let a=await t.executeAction(i,n);R(a,e)},async onCustom(n){let a=await t.executeAction(i,n);R(a,e)}}}function R(e,t){let i=document.createElement("div");i.className="ai-msg system",i.textContent=e,t.messagesEl.appendChild(i),t.messagesEl.scrollTop=t.messagesEl.scrollHeight}function _(e){let{apiClient:t,locale:i,position:n,onClose:a}=e,o=n==="bottom-left",r=document.createElement("div");r.className=`ai-widget-panel${o?" left":""}`,r.setAttribute("role","dialog"),r.setAttribute("aria-label","Support chat");let s=document.createElement("div");s.className="ai-widget-header";let f=document.createElement("h2");f.className="ai-widget-header-title",f.textContent="Support",f.id="ai-widget-title",r.setAttribute("aria-labelledby","ai-widget-title");let d=document.createElement("button");d.className="ai-close-btn",d.textContent="\u2715",d.setAttribute("aria-label","Minimize support chat"),d.addEventListener("click",a);let p=document.createElement("button");p.className="ai-end-btn",p.textContent="End Session",p.setAttribute("aria-label","End support session"),p.style.display="none",s.appendChild(f),s.appendChild(p),s.appendChild(d);let l=document.createElement("div");l.className="ai-widget-messages",l.setAttribute("role","log"),l.setAttribute("aria-live","polite"),l.setAttribute("aria-label","Chat messages");let w=document.createElement("div");w.className="ai-widget-input",w.setAttribute("role","form"),w.setAttribute("aria-label","Send a message");let y=document.createElement("input");y.type="text",y.placeholder="Describe your issue...",y.setAttribute("aria-label","Type your message");let h=document.createElement("button");h.textContent="Send",h.setAttribute("aria-label","Send message"),w.appendChild(y),w.appendChild(h),r.appendChild(s),r.appendChild(l),r.appendChild(w);let g=e.initialCaseId??null,C=!1,E,S=!1;if(g&&(p.style.display=""),p.addEventListener("click",()=>{!g||S||(S=!0,l.appendChild(J(m())),l.scrollTop=l.scrollHeight)}),e.initialMessages&&e.initialMessages.length>0)for(let c of e.initialMessages)A(c);async function u(c){if(!g||C)return;C=!0;let k=v();try{let b=await t.sendMessage(g,c,E);k.remove(),A(b)}catch{k.remove();let b=document.createElement("div");b.className="ai-msg system",b.textContent="Failed to get response. Please try again.",l.appendChild(b)}finally{C=!1}}function m(){return{apiClient:t,locale:i,messagesEl:l,panelEl:r,caseId:g??"",onCaseClosed:e.onCaseClosed,onSendMessage:u}}function v(){let c=document.createElement("div");return c.className="ai-typing",c.setAttribute("role","status"),c.setAttribute("aria-live","polite"),c.textContent="AI is thinking...",l.appendChild(c),l.scrollTop=l.scrollHeight,c}function A(c){c.role==="assistant"&&(E=c.id),l.appendChild(F(c,m())),l.scrollTop=l.scrollHeight}async function $(){let c=y.value.trim();if(!c||C)return;C=!0,h.setAttribute("disabled",""),y.value="";let k=v();try{let b;if(g)b=await t.sendMessage(g,c,E);else{let N=await t.createCase(c,e.getContext?e.getContext():e.context);g=N.case.id,e.onCaseCreated?.(g),p.style.display="",b=N.aiMessage??await t.sendMessage(g,c,E)}k.remove();let I={id:"local_u",caseId:g,role:"user",content:c,actions:[],evidence:[],confidence:null,createdAt:new Date().toISOString()};A(I),A(b)}catch{k.remove();let b=document.createElement("div");b.className="ai-msg system",b.textContent="Failed to send message. Please try again.",l.appendChild(b)}finally{C=!1,h.removeAttribute("disabled")}}return h.addEventListener("click",$),y.addEventListener("keydown",c=>{c.key==="Enter"&&$()}),r.addEventListener("keydown",c=>{c.key==="Escape"&&a()}),{element:r,destroy(){r.remove()},focus(){y.focus()},hide(){r.classList.add("hidden")},show(){r.classList.remove("hidden")}}}var de="ai_support_";function P(e){return`${de}v2_${encodeURIComponent(e)}_caseId`}function K(e,t){try{localStorage.setItem(P(e),t)}catch{}}function V(e){try{return localStorage.getItem(P(e))}catch{return null}}function Y(e){try{localStorage.removeItem(P(e))}catch{}}var T=class e{static init(t){e.instance&&e.instance.destroy();let i=t.theme??"light",n=t.position??"bottom-right",a=t.locale??"en-US",o=t.tenantKey,r=z(t.jwt,o),s=!1,f=0,d=null,p=new AbortController;try{localStorage.removeItem(`ai_support_${o}_caseId`)}catch{}let l=()=>{r&&Y(r)},w=x=>{!s&&r&&K(r,x)},y=n==="bottom-left",h=document.createElement("div");h.id="ai-support-widget",document.body.appendChild(h);let g=h.attachShadow({mode:"open"}),C=document.createElement("style");C.textContent=B(i,t.brandColor),g.appendChild(C);let E=t.jwt,S=D({apiUrl:t.apiUrl,getJwt:()=>E,signal:p.signal,onTokenRefresh:t.onTokenRefresh?async()=>{let x=await t.onTokenRefresh();return j(x),E}:void 0}),u=document.createElement("button");u.className=`ai-widget-fab${y?" left":""}`,u.textContent="\u{1F4AC}",u.setAttribute("aria-label","Open support chat"),u.setAttribute("aria-expanded","false"),u.setAttribute("aria-haspopup","dialog"),g.appendChild(u);let m=null,v=!1;function A(){l(),m&&(m.destroy(),m=null),v=!1,u.setAttribute("aria-expanded","false"),u.setAttribute("aria-label","Open support chat")}function $(x){g.appendChild(x.element),v=!0,u.setAttribute("aria-expanded","true"),u.setAttribute("aria-label","Minimize support chat"),x.focus()}async function c(){let x=f;if(t.onOpen&&await t.onOpen(),s||f!==x)return;if(m&&!v){m.show(),v=!0,u.setAttribute("aria-expanded","true"),u.setAttribute("aria-label","Minimize support chat"),m.focus();return}if(m)return;let M=r?V(r):null;if(M)try{let{case:G,messages:X}=await S.getCase(M);if(s||f!==x)return;if(G.status==="active"&&z(E,o)===r){m=_({apiClient:S,locale:a,position:n,onClose:b,onCaseClosed:A,getContext:()=>t.context,initialCaseId:M,initialMessages:X,onCaseCreated:w}),$(m);return}l()}catch{l()}s||f!==x||(m=_({apiClient:S,locale:a,position:n,onClose:b,onCaseClosed:A,getContext:()=>t.context,onCaseCreated:w}),$(m))}function k(){return s?Promise.reject(new Error("Support session closed")):d||(d=c().finally(()=>{d=null}),d)}function b(){m&&m.hide(),v=!1,u.setAttribute("aria-expanded","false"),u.setAttribute("aria-label","Open support chat"),u.focus()}function I(){f++,m&&(m.destroy(),m=null),v=!1,u.setAttribute("aria-expanded","false"),u.setAttribute("aria-label","Open support chat"),u.focus()}function N(){s=!0,p.abort(),l(),I(),h.remove(),e.instance===L&&(e.instance=null)}u.addEventListener("click",()=>{v?b():k().catch(()=>{u.setAttribute("aria-label","Support unavailable. Try again.")})});function j(x){if(s)throw new Error("Support session closed");if(z(x,o)!==r)throw N(),new Error("Support identity changed; initialize a new widget");E=x}function W(x){if(s)throw new Error("Support session closed");t.context=x}let L={open:k,close:I,destroy:N,updateJwt:j,updateContext:W};return e.instance=L,L}};T.instance=null;typeof window<"u"&&(window.AISupportWidget=T);return ne(pe);})();
window.AISupportWidget=AISupportWidgetModule.AISupportWidget;
