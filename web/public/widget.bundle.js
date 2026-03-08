"use strict";var AISupportWidgetModule=(()=>{var T=Object.defineProperty;var U=Object.getOwnPropertyDescriptor;var q=Object.getOwnPropertyNames;var J=Object.prototype.hasOwnProperty;var K=(t,a)=>{for(var i in a)T(t,i,{get:a[i],enumerable:!0})},V=(t,a,i,e)=>{if(a&&typeof a=="object"||typeof a=="function")for(let n of q(a))!J.call(t,n)&&n!==i&&T(t,n,{get:()=>a[n],enumerable:!(e=U(a,n))||e.enumerable});return t};var Y=t=>V(T({},"__esModule",{value:!0}),t);var te={};K(te,{AISupportWidget:()=>A});function R(t,a){let i=t==="light";return`
    :host {
      --ai-support-primary: ${a??(i?"#2563eb":"#60a5fa")};
      --ai-support-bg: ${i?"#ffffff":"#1e1e2e"};
      --ai-support-text: ${i?"#1a1a2e":"#e4e4e7"};
      --ai-support-radius: 12px;
      --ai-support-surface: ${i?"#f4f4f5":"#2a2a3e"};
      --ai-support-border: ${i?"#e4e4e7":"#3a3a4e"};
      --ai-support-muted: ${i?"#5c5c66":"#a1a1aa"};
      --ai-support-danger: #ef4444;
      --ai-support-success: #22c55e;
      --ai-support-focus: ${a??(i?"#2563eb":"#60a5fa")};
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
  `}function P(t){let a=t.getJwt();async function i(e,n,o){let s=`${t.apiUrl}${n}`,p={Authorization:`Bearer ${a}`};o!==void 0&&(p["Content-Type"]="application/json");let l=await fetch(s,{method:e,headers:p,body:o!==void 0?JSON.stringify(o):void 0});if(l.status===401&&t.onTokenRefresh&&(a=await t.onTokenRefresh(),l=await fetch(s,{method:e,headers:{...p,Authorization:`Bearer ${a}`},body:o!==void 0?JSON.stringify(o):void 0})),!l.ok)throw await l.json().catch(()=>({statusCode:l.status,error:"UNKNOWN",message:l.statusText}));return l.json()}return{async createCase(e,n){return i("POST","/api/cases",{message:e,...n?{context:n}:{}})},async getCase(e){return i("GET",`/api/cases/${e}`)},async sendMessage(e,n){return(await i("POST",`/api/cases/${e}/messages`,{content:n})).message},async addFeedback(e,n){await i("POST",`/api/cases/${e}/feedback`,{feedback:n})},async closeCase(e,n,o){await i("POST",`/api/cases/${e}/close`,{resolution:n,rating:o})},async executeAction(e,n){return(await i("POST",`/api/cases/${e}/actions`,{action:n})).result}}}function O(t,a){let i=document.createElement("div");i.className="ai-evidence";for(let e of t){let n=document.createElement("span");if(n.className=`ai-evidence-badge ${e.type}`,e.type==="error_code")n.textContent=`${e.label}: ${e.value}`;else if(e.type==="job_id"){n.textContent=`${e.label}: ${e.value}`,n.setAttribute("role","button"),n.setAttribute("tabindex","0"),n.setAttribute("aria-label",`Copy ${e.label}: ${e.value}`);let o=()=>{navigator.clipboard.writeText(e.value).catch(()=>{})};n.addEventListener("click",o),n.addEventListener("keydown",s=>{(s.key==="Enter"||s.key===" ")&&(s.preventDefault(),o())})}else if(e.type==="timestamp"){let s=new Date(e.value).toLocaleString(a);n.textContent=`${e.label}: ${s}`}else e.type==="log_excerpt"?n.textContent=e.value:n.textContent=`${e.label}: ${e.value}`;i.appendChild(n)}return i}var W=new Set;function j(t,a,i){let e=document.createElement("div");e.className="ai-actions";for(let n of t){let o=document.createElement("button");o.className=`ai-action-btn ${n.type}`,o.textContent=n.label,o.addEventListener("click",()=>{W.has(n.type)?G(i,n.label,()=>H(n,a)):H(n,a)}),e.appendChild(o)}return e}function H(t,a){switch(t.type){case"retry":a.onRetry(t);break;case"open_docs":{a.onOpenDocs(t);break}case"request_access":a.onRequestAccess(t);break;default:a.onCustom(t)}}function G(t,a,i){let e=document.createElement("div");e.className="ai-confirm-overlay",e.setAttribute("role","alertdialog"),e.setAttribute("aria-modal","true"),e.setAttribute("aria-label",`Confirm: ${a}`);let n=document.createElement("div");n.className="ai-confirm-box";let o=document.createElement("p");o.id="ai-confirm-msg",o.textContent=`Are you sure you want to "${a}"?`,e.setAttribute("aria-describedby","ai-confirm-msg"),n.appendChild(o);let s=()=>e.remove(),p=document.createElement("button");p.className="ai-confirm-yes",p.textContent="Yes",p.addEventListener("click",()=>{s(),i()});let l=document.createElement("button");l.className="ai-confirm-no",l.textContent="Cancel",l.addEventListener("click",s),e.addEventListener("keydown",f=>{if(f.key==="Escape"){s();return}if(f.key==="Tab"){let m=e.getRootNode()instanceof ShadowRoot?e.getRootNode().activeElement:document.activeElement;f.shiftKey&&m===l?(f.preventDefault(),p.focus()):!f.shiftKey&&m===p&&(f.preventDefault(),l.focus())}}),n.appendChild(p),n.appendChild(l),e.appendChild(n),t.appendChild(e),l.focus()}function B(t,a){let i=document.createElement("div");i.className=`ai-msg ${t.role}`,i.dataset.messageId=t.id;let e=document.createElement("span");if(e.textContent=t.content,i.appendChild(e),t.evidence.length>0&&i.appendChild(O(t.evidence,a.locale)),t.actions.length>0){let n=Z(a);i.appendChild(j(t.actions,n,a.panelEl))}return i}function _(t){let a=document.createElement("div");a.className="ai-case-close";let i=document.createElement("p");i.textContent="Was your issue resolved?",a.appendChild(i);let e=document.createElement("div");e.className="ai-case-close-btns";let n=document.createElement("button");n.className="ai-close-yes",n.textContent="Yes",n.setAttribute("aria-label","Issue was resolved");let o=document.createElement("button");return o.className="ai-close-no",o.textContent="No",o.setAttribute("aria-label","Issue was not resolved"),n.addEventListener("click",()=>D(a,"resolved",t)),o.addEventListener("click",()=>X(a,t)),e.appendChild(n),e.appendChild(o),a.appendChild(e),a}function X(t,a){t.innerHTML="";let i=document.createElement("p");i.textContent="I'll keep trying to help. Please describe what's still wrong.",t.appendChild(i);let e=document.createElement("button");e.className="ai-close-no",e.textContent="Close case anyway",e.style.marginTop="8px",e.addEventListener("click",()=>D(t,"unresolved",a)),t.appendChild(e),a.onSendMessage&&a.onSendMessage("My issue is not resolved yet. Please try a different approach."),a.messagesEl.scrollTop=a.messagesEl.scrollHeight}function D(t,a,i){t.innerHTML="";let e=document.createElement("p");e.textContent="How would you rate this experience? (1-10)",t.appendChild(e);let n=document.createElement("div");n.className="ai-rating";for(let o=1;o<=10;o++){let s=document.createElement("button");s.textContent=String(o),s.setAttribute("aria-label",`Rate ${o} out of 10`),s.addEventListener("click",()=>Q(t,a,o,i)),n.appendChild(s)}t.appendChild(n),i.messagesEl.scrollTop=i.messagesEl.scrollHeight}async function Q(t,a,i,e){t.innerHTML="";let n=document.createElement("p");n.textContent="Closing case...",t.appendChild(n);try{await e.apiClient.closeCase(e.caseId,a,i),t.innerHTML="";let o=document.createElement("p");o.textContent="Thanks for your feedback! Case closed.",t.appendChild(o),e.onCaseClosed&&setTimeout(()=>e.onCaseClosed(),2e3)}catch{t.innerHTML="";let o=document.createElement("p");o.textContent="Failed to close case. Please try again.",t.appendChild(o)}}function Z(t){let{apiClient:a,caseId:i}=t;return{async onRetry(e){let n=await a.executeAction(i,e);z(n,t)},onOpenDocs(e){let n=e.payload.url;n&&window.open(n,"_blank","noopener")},async onRequestAccess(e){let n=await a.executeAction(i,e);z(n,t)},async onCustom(e){let n=await a.executeAction(i,e);z(n,t)}}}function z(t,a){let i=document.createElement("div");i.className="ai-msg system",i.textContent=t,a.messagesEl.appendChild(i),a.messagesEl.scrollTop=a.messagesEl.scrollHeight}function L(t){let{apiClient:a,locale:i,position:e,onClose:n}=t,o=e==="bottom-left",s=document.createElement("div");s.className=`ai-widget-panel${o?" left":""}`,s.setAttribute("role","dialog"),s.setAttribute("aria-label","Support chat");let p=document.createElement("div");p.className="ai-widget-header";let l=document.createElement("h2");l.className="ai-widget-header-title",l.textContent="Support",l.id="ai-widget-title",s.setAttribute("aria-labelledby","ai-widget-title");let f=document.createElement("button");f.className="ai-close-btn",f.textContent="\u2715",f.setAttribute("aria-label","Minimize support chat"),f.addEventListener("click",n);let m=document.createElement("button");m.className="ai-end-btn",m.textContent="End Session",m.setAttribute("aria-label","End support session"),m.style.display="none",p.appendChild(l),p.appendChild(m),p.appendChild(f);let u=document.createElement("div");u.className="ai-widget-messages",u.setAttribute("role","log"),u.setAttribute("aria-live","polite"),u.setAttribute("aria-label","Chat messages");let c=document.createElement("div");c.className="ai-widget-input",c.setAttribute("role","form"),c.setAttribute("aria-label","Send a message");let d=document.createElement("input");d.type="text",d.placeholder="Describe your issue...",d.setAttribute("aria-label","Type your message");let b=document.createElement("button");b.textContent="Send",b.setAttribute("aria-label","Send message"),c.appendChild(d),c.appendChild(b),s.appendChild(p),s.appendChild(u),s.appendChild(c);let g=t.initialCaseId??null,h=!1,w=!1;if(g&&(m.style.display=""),m.addEventListener("click",()=>{!g||w||(w=!0,u.appendChild(_(E())),u.scrollTop=u.scrollHeight)}),t.initialMessages&&t.initialMessages.length>0)for(let r of t.initialMessages)v(r);async function C(r){if(!g||h)return;h=!0;let y=$();try{let x=await a.sendMessage(g,r);y.remove(),v(x)}catch{y.remove();let x=document.createElement("div");x.className="ai-msg system",x.textContent="Failed to get response. Please try again.",u.appendChild(x)}finally{h=!1}}function E(){return{apiClient:a,locale:i,messagesEl:u,panelEl:s,caseId:g??"",onCaseClosed:t.onCaseClosed,onSendMessage:C}}function $(){let r=document.createElement("div");return r.className="ai-typing",r.setAttribute("role","status"),r.setAttribute("aria-live","polite"),r.textContent="AI is thinking...",u.appendChild(r),u.scrollTop=u.scrollHeight,r}function v(r){u.appendChild(B(r,E())),u.scrollTop=u.scrollHeight}async function k(){let r=d.value.trim();if(!r||h)return;h=!0,b.setAttribute("disabled",""),d.value="";let y=$();try{g||(g=(await a.createCase(r,t.context)).case.id,t.onCaseCreated?.(g),m.style.display="");let x=await a.sendMessage(g,r);y.remove();let N={id:"local_u",caseId:g,role:"user",content:r,actions:[],evidence:[],confidence:null,createdAt:new Date().toISOString()};v(N),v(x)}catch{y.remove();let x=document.createElement("div");x.className="ai-msg system",x.textContent="Failed to send message. Please try again.",u.appendChild(x)}finally{h=!1,b.removeAttribute("disabled")}}return b.addEventListener("click",k),d.addEventListener("keydown",r=>{r.key==="Enter"&&k()}),s.addEventListener("keydown",r=>{r.key==="Escape"&&n()}),{element:s,destroy(){s.remove()},focus(){d.focus()},hide(){s.classList.add("hidden")},show(){s.classList.remove("hidden")}}}var ee="ai_support_";function I(t){return`${ee}${t}_caseId`}function M(t,a){try{localStorage.setItem(I(t),a)}catch{}}function F(t){try{return localStorage.getItem(I(t))}catch{return null}}function S(t){try{localStorage.removeItem(I(t))}catch{}}var A=class t{static init(a){t.instance&&t.instance.destroy();let i=a.theme??"light",e=a.position??"bottom-right",n=a.locale??"en-US",o=a.tenantKey,s=e==="bottom-left",p=document.createElement("div");p.id="ai-support-widget",document.body.appendChild(p);let l=p.attachShadow({mode:"open"}),f=document.createElement("style");f.textContent=R(i,a.brandColor),l.appendChild(f);let m=a.jwt,u=P({apiUrl:a.apiUrl,getJwt:()=>m,onTokenRefresh:a.onTokenRefresh?async()=>(m=await a.onTokenRefresh(),m):void 0}),c=document.createElement("button");c.className=`ai-widget-fab${s?" left":""}`,c.textContent="\u{1F4AC}",c.setAttribute("aria-label","Open support chat"),c.setAttribute("aria-expanded","false"),c.setAttribute("aria-haspopup","dialog"),l.appendChild(c);let d=null,b=!1;function g(){S(o),d&&(d.destroy(),d=null),b=!1,c.setAttribute("aria-expanded","false"),c.setAttribute("aria-label","Open support chat")}function h(r){l.appendChild(r.element),b=!0,c.setAttribute("aria-expanded","true"),c.setAttribute("aria-label","Minimize support chat"),r.focus()}async function w(){if(d&&!b){d.show(),b=!0,c.setAttribute("aria-expanded","true"),c.setAttribute("aria-label","Minimize support chat"),d.focus();return}if(d)return;let r=F(o);if(r)try{let{case:y,messages:x}=await u.getCase(r);if(y.status==="active"){d=L({apiClient:u,locale:n,position:e,onClose:C,onCaseClosed:g,context:a.context,initialCaseId:r,initialMessages:x,onCaseCreated:N=>M(o,N)}),h(d);return}S(o)}catch{S(o)}d=L({apiClient:u,locale:n,position:e,onClose:C,onCaseClosed:g,context:a.context,onCaseCreated:y=>M(o,y)}),h(d)}function C(){d&&d.hide(),b=!1,c.setAttribute("aria-expanded","false"),c.setAttribute("aria-label","Open support chat"),c.focus()}function E(){d&&(d.destroy(),d=null),b=!1,c.setAttribute("aria-expanded","false"),c.setAttribute("aria-label","Open support chat"),c.focus()}function $(){E(),p.remove(),t.instance=null}c.addEventListener("click",()=>{b?C():w()});function v(r){m=r}let k={open:w,close:E,destroy:$,updateJwt:v};return t.instance=k,k}};A.instance=null;typeof window<"u"&&(window.AISupportWidget=A);return Y(te);})();
window.AISupportWidget=AISupportWidgetModule.AISupportWidget;
