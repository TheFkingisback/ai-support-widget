"use strict";var AISupportWidgetModule=(()=>{var A=Object.defineProperty;var j=Object.getOwnPropertyDescriptor;var B=Object.getOwnPropertyNames;var I=Object.prototype.hasOwnProperty;var P=(i,a)=>{for(var n in a)A(i,n,{get:a[n],enumerable:!0})},_=(i,a,n,e)=>{if(a&&typeof a=="object"||typeof a=="function")for(let t of B(a))!I.call(i,t)&&t!==n&&A(i,t,{get:()=>a[t],enumerable:!(e=j(a,t))||e.enumerable});return i};var D=i=>_(A({},"__esModule",{value:!0}),i);var K={};P(K,{AISupportWidget:()=>h});function $(i,a){let n=i==="light";return`
    :host {
      --ai-support-primary: ${a??(n?"#2563eb":"#60a5fa")};
      --ai-support-bg: ${n?"#ffffff":"#1e1e2e"};
      --ai-support-text: ${n?"#1a1a2e":"#e4e4e7"};
      --ai-support-radius: 12px;
      --ai-support-surface: ${n?"#f4f4f5":"#2a2a3e"};
      --ai-support-border: ${n?"#e4e4e7":"#3a3a4e"};
      --ai-support-muted: ${n?"#5c5c66":"#a1a1aa"};
      --ai-support-danger: #ef4444;
      --ai-support-success: #22c55e;
      --ai-support-focus: ${a??(n?"#2563eb":"#60a5fa")};
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
  `}function T(i){let a=i.getJwt();async function n(e,t,o){let r=`${i.apiUrl}${t}`,p={Authorization:`Bearer ${a}`,"Content-Type":"application/json"},d=await fetch(r,{method:e,headers:p,body:o?JSON.stringify(o):void 0});if(d.status===401&&i.onTokenRefresh&&(a=await i.onTokenRefresh(),d=await fetch(r,{method:e,headers:{...p,Authorization:`Bearer ${a}`},body:o?JSON.stringify(o):void 0})),!d.ok)throw await d.json().catch(()=>({statusCode:d.status,error:"UNKNOWN",message:d.statusText}));return d.json()}return{async createCase(e,t){return n("POST","/api/cases",{message:e,...t?{context:t}:{}})},async sendMessage(e,t){return(await n("POST",`/api/cases/${e}/messages`,{content:t})).message},async addFeedback(e,t){await n("POST",`/api/cases/${e}/feedback`,{feedback:t})},async escalate(e,t){return n("POST",`/api/cases/${e}/escalate`,{reason:t})},async closeCase(e,t,o){await n("POST",`/api/cases/${e}/close`,{resolution:t,rating:o})},async executeAction(e,t){return(await n("POST",`/api/cases/${e}/actions`,{action:t})).result}}}function N(i,a){let n=document.createElement("div");n.className="ai-evidence";for(let e of i){let t=document.createElement("span");if(t.className=`ai-evidence-badge ${e.type}`,e.type==="error_code")t.textContent=`${e.label}: ${e.value}`;else if(e.type==="job_id"){t.textContent=`${e.label}: ${e.value}`,t.setAttribute("role","button"),t.setAttribute("tabindex","0"),t.setAttribute("aria-label",`Copy ${e.label}: ${e.value}`);let o=()=>{navigator.clipboard.writeText(e.value).catch(()=>{})};t.addEventListener("click",o),t.addEventListener("keydown",r=>{(r.key==="Enter"||r.key===" ")&&(r.preventDefault(),o())})}else if(e.type==="timestamp"){let r=new Date(e.value).toLocaleString(a);t.textContent=`${e.label}: ${r}`}else e.type==="log_excerpt"?t.textContent=e.value:t.textContent=`${e.label}: ${e.value}`;n.appendChild(t)}return n}var H=new Set(["create_ticket"]);function z(i,a,n){let e=document.createElement("div");e.className="ai-actions";for(let t of i){let o=document.createElement("button");o.className=`ai-action-btn ${t.type}`,o.textContent=t.label,o.addEventListener("click",()=>{H.has(t.type)?U(n,t.label,()=>S(t,a)):S(t,a)}),e.appendChild(o)}return e}function S(i,a){switch(i.type){case"retry":a.onRetry(i);break;case"open_docs":{a.onOpenDocs(i);break}case"create_ticket":a.onCreateTicket(i);break;case"request_access":a.onRequestAccess(i);break;default:a.onCustom(i)}}function U(i,a,n){let e=document.createElement("div");e.className="ai-confirm-overlay",e.setAttribute("role","alertdialog"),e.setAttribute("aria-modal","true"),e.setAttribute("aria-label",`Confirm: ${a}`);let t=document.createElement("div");t.className="ai-confirm-box";let o=document.createElement("p");o.id="ai-confirm-msg",o.textContent=`Are you sure you want to "${a}"?`,e.setAttribute("aria-describedby","ai-confirm-msg"),t.appendChild(o);let r=()=>e.remove(),p=document.createElement("button");p.className="ai-confirm-yes",p.textContent="Yes",p.addEventListener("click",()=>{r(),n()});let d=document.createElement("button");d.className="ai-confirm-no",d.textContent="Cancel",d.addEventListener("click",r),e.addEventListener("keydown",u=>{if(u.key==="Escape"){r();return}if(u.key==="Tab"){let f=e.getRootNode()instanceof ShadowRoot?e.getRootNode().activeElement:document.activeElement;u.shiftKey&&f===d?(u.preventDefault(),p.focus()):!u.shiftKey&&f===p&&(u.preventDefault(),d.focus())}}),t.appendChild(p),t.appendChild(d),e.appendChild(t),i.appendChild(e),d.focus()}function R(i,a){let n=document.createElement("div");n.className=`ai-msg ${i.role}`,n.dataset.messageId=i.id;let e=document.createElement("span");if(e.textContent=i.content,n.appendChild(e),i.evidence.length>0&&n.appendChild(N(i.evidence,a.locale)),i.actions.length>0){let t=J(a);n.appendChild(z(i.actions,t,a.panelEl))}return i.role==="assistant"&&n.appendChild(q(a)),n}function q(i){let a=document.createElement("div");a.className="ai-case-close";let n=document.createElement("p");n.textContent="Was your issue resolved?",a.appendChild(n);let e=document.createElement("div");e.className="ai-case-close-btns";let t=document.createElement("button");t.className="ai-close-yes",t.textContent="Yes",t.setAttribute("aria-label","Issue was resolved");let o=document.createElement("button");return o.className="ai-close-no",o.textContent="No",o.setAttribute("aria-label","Issue was not resolved"),t.addEventListener("click",()=>L(a,"resolved",i)),o.addEventListener("click",()=>L(a,"unresolved",i)),e.appendChild(t),e.appendChild(o),a.appendChild(e),a}function L(i,a,n){i.innerHTML="";let e=document.createElement("p");e.textContent="How would you rate this experience? (1-10)",i.appendChild(e);let t=document.createElement("div");t.className="ai-rating";for(let o=1;o<=10;o++){let r=document.createElement("button");r.textContent=String(o),r.setAttribute("aria-label",`Rate ${o} out of 10`),r.addEventListener("click",()=>F(i,a,o,n)),t.appendChild(r)}i.appendChild(t),n.messagesEl.scrollTop=n.messagesEl.scrollHeight}async function F(i,a,n,e){i.innerHTML="";let t=document.createElement("p");t.textContent="Closing case...",i.appendChild(t);try{await e.apiClient.closeCase(e.caseId,a,n),i.innerHTML="";let o=document.createElement("p");o.textContent="Thanks for your feedback! Case closed.",i.appendChild(o),e.onCaseClosed&&setTimeout(()=>e.onCaseClosed(),2e3)}catch{i.innerHTML="";let o=document.createElement("p");o.textContent="Failed to close case. Please try again.",i.appendChild(o)}}function J(i){let{apiClient:a,caseId:n}=i;return{async onRetry(e){let t=await a.executeAction(n,e);E(t,i)},onOpenDocs(e){let t=e.payload.url;t&&window.open(t,"_blank","noopener")},async onCreateTicket(e){let t=await a.escalate(n);E(`Ticket created: ${t.ticketId}`,i)},async onRequestAccess(e){let t=await a.executeAction(n,e);E(t,i)},async onCustom(e){let t=await a.executeAction(n,e);E(t,i)}}}function E(i,a){let n=document.createElement("div");n.className="ai-msg system",n.textContent=i,a.messagesEl.appendChild(n),a.messagesEl.scrollTop=a.messagesEl.scrollHeight}function O(i){let{apiClient:a,locale:n,position:e,onClose:t}=i,o=e==="bottom-left",r=document.createElement("div");r.className=`ai-widget-panel${o?" left":""}`,r.setAttribute("role","dialog"),r.setAttribute("aria-label","Support chat");let p=document.createElement("div");p.className="ai-widget-header";let d=document.createElement("h2");d.className="ai-widget-header-title",d.textContent="Support",d.id="ai-widget-title",r.setAttribute("aria-labelledby","ai-widget-title");let u=document.createElement("button");u.className="ai-close-btn",u.textContent="\u2715",u.setAttribute("aria-label","Minimize support chat"),u.addEventListener("click",t),p.appendChild(d),p.appendChild(u);let f=document.createElement("div");f.className="ai-widget-messages",f.setAttribute("role","log"),f.setAttribute("aria-live","polite"),f.setAttribute("aria-label","Chat messages");let s=document.createElement("div");s.className="ai-widget-input",s.setAttribute("role","form"),s.setAttribute("aria-label","Send a message");let c=document.createElement("input");c.type="text",c.placeholder="Describe your issue...",c.setAttribute("aria-label","Type your message");let b=document.createElement("button");b.textContent="Send",b.setAttribute("aria-label","Send message"),s.appendChild(c),s.appendChild(b),r.appendChild(p),r.appendChild(f),r.appendChild(s);let m=null,x=!1;function v(){return{apiClient:a,locale:n,messagesEl:f,panelEl:r,caseId:m??"",onCaseClosed:i.onCaseClosed}}function y(){let l=document.createElement("div");return l.className="ai-typing",l.setAttribute("role","status"),l.setAttribute("aria-live","polite"),l.textContent="AI is thinking...",f.appendChild(l),f.scrollTop=f.scrollHeight,l}function w(l){f.appendChild(R(l,v())),f.scrollTop=f.scrollHeight}async function C(){let l=c.value.trim();if(!l||x)return;x=!0,b.setAttribute("disabled",""),c.value="";let k=y();try{m||(m=(await a.createCase(l,i.context)).case.id);let g=await a.sendMessage(m,l);k.remove();let M={id:"local_u",caseId:m,role:"user",content:l,actions:[],evidence:[],confidence:null,createdAt:new Date().toISOString()};w(M),w(g)}catch{k.remove();let g=document.createElement("div");g.className="ai-msg system",g.textContent="Failed to send message. Please try again.",f.appendChild(g)}finally{x=!1,b.removeAttribute("disabled")}}return b.addEventListener("click",C),c.addEventListener("keydown",l=>{l.key==="Enter"&&C()}),r.addEventListener("keydown",l=>{l.key==="Escape"&&t()}),{element:r,destroy(){r.remove()},focus(){c.focus()},hide(){r.classList.add("hidden")},show(){r.classList.remove("hidden")}}}var h=class i{static init(a){i.instance&&i.instance.destroy();let n=a.theme??"light",e=a.position??"bottom-right",t=a.locale??"en-US",o=e==="bottom-left",r=document.createElement("div");r.id="ai-support-widget",document.body.appendChild(r);let p=r.attachShadow({mode:"open"}),d=document.createElement("style");d.textContent=$(n,a.brandColor),p.appendChild(d);let u=a.jwt,f=T({apiUrl:a.apiUrl,getJwt:()=>u,onTokenRefresh:a.onTokenRefresh?async()=>(u=await a.onTokenRefresh(),u):void 0}),s=document.createElement("button");s.className=`ai-widget-fab${o?" left":""}`,s.textContent="\u{1F4AC}",s.setAttribute("aria-label","Open support chat"),s.setAttribute("aria-expanded","false"),s.setAttribute("aria-haspopup","dialog"),p.appendChild(s);let c=null,b=!1;function m(){c&&(c.destroy(),c=null),b=!1,s.setAttribute("aria-expanded","false"),s.setAttribute("aria-label","Open support chat")}function x(){if(c&&!b){c.show(),b=!0,s.setAttribute("aria-expanded","true"),s.setAttribute("aria-label","Minimize support chat"),c.focus();return}c||(c=O({apiClient:f,locale:t,position:e,onClose:v,onCaseClosed:m,context:a.context}),p.appendChild(c.element),b=!0,s.setAttribute("aria-expanded","true"),s.setAttribute("aria-label","Minimize support chat"),c.focus())}function v(){c&&c.hide(),b=!1,s.setAttribute("aria-expanded","false"),s.setAttribute("aria-label","Open support chat"),s.focus()}function y(){c&&(c.destroy(),c=null),b=!1,s.setAttribute("aria-expanded","false"),s.setAttribute("aria-label","Open support chat"),s.focus()}function w(){y(),r.remove(),i.instance=null}s.addEventListener("click",()=>{b?v():x()});function C(k){u=k}let l={open:x,close:y,destroy:w,updateJwt:C};return i.instance=l,l}};h.instance=null;typeof window<"u"&&(window.AISupportWidget=h);return D(K);})();
window.AISupportWidget=AISupportWidgetModule.AISupportWidget;
