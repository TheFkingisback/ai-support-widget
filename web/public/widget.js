"use strict";var AISupportWidgetModule=(()=>{var A=Object.defineProperty;var z=Object.getOwnPropertyDescriptor;var D=Object.getOwnPropertyNames;var H=Object.prototype.hasOwnProperty;var j=(i,e)=>{for(var n in e)A(i,n,{get:e[n],enumerable:!0})},O=(i,e,n,t)=>{if(e&&typeof e=="object"||typeof e=="function")for(let a of D(e))!H.call(i,a)&&a!==n&&A(i,a,{get:()=>e[a],enumerable:!(t=z(e,a))||t.enumerable});return i};var U=i=>O(A({},"__esModule",{value:!0}),i);var W={};j(W,{AISupportWidget:()=>w});function T(i){let e=i==="light";return`
    :host {
      --ai-support-primary: ${e?"#2563eb":"#60a5fa"};
      --ai-support-bg: ${e?"#ffffff":"#1e1e2e"};
      --ai-support-text: ${e?"#1a1a2e":"#e4e4e7"};
      --ai-support-radius: 12px;
      --ai-support-surface: ${e?"#f4f4f5":"#2a2a3e"};
      --ai-support-border: ${e?"#e4e4e7":"#3a3a4e"};
      --ai-support-muted: ${e?"#5c5c66":"#a1a1aa"};
      --ai-support-danger: #ef4444;
      --ai-support-success: #22c55e;
      --ai-support-focus: ${e?"#2563eb":"#60a5fa"};
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
      position: fixed; bottom: 88px; right: 20px; width: 380px; max-height: 560px;
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
      word-break: break-word; font-size: 14px; line-height: 1.5;
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
      font-style: italic;
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
      background: ${e?"#fef2f2":"rgba(239,68,68,.15)"};
      color: ${e?"#dc2626":"#fca5a5"};
    }
    .ai-evidence-badge.job_id {
      background: ${e?"#f0fdf4":"rgba(34,197,94,.15)"};
      color: ${e?"#16a34a":"#86efac"};
      cursor: pointer;
    }
    .ai-evidence-badge.timestamp {
      background: ${e?"#eff6ff":"rgba(96,165,250,.15)"};
      color: ${e?"#2563eb":"#93c5fd"};
    }
    .ai-evidence-badge.resource_id {
      background: ${e?"#fefce8":"rgba(234,179,8,.15)"};
      color: ${e?"#ca8a04":"#fde047"};
    }
    .ai-evidence-badge.log_excerpt {
      display: block; width: 100%;
      background: ${e?"#f8fafc":"#1e1e2e"};
      color: ${e?"#334155":"#d4d4d8"};
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
    .ai-feedback { display: flex; gap: 4px; margin-top: 6px; }
    .ai-feedback button {
      background: none; border: 1px solid var(--ai-support-border); border-radius: 4px;
      padding: 2px 8px; cursor: pointer; font-size: 14px; color: var(--ai-support-muted);
      transition: background .15s ease-in-out;
    }
    .ai-feedback button:hover { background: var(--ai-support-surface); }
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
  `}function $(i){let e=i.getJwt();async function n(t,a,s){let o=`${i.apiUrl}${a}`,p={Authorization:`Bearer ${e}`,"Content-Type":"application/json"},c=await fetch(o,{method:t,headers:p,body:s?JSON.stringify(s):void 0});if(c.status===401&&i.onTokenRefresh&&(e=await i.onTokenRefresh(),c=await fetch(o,{method:t,headers:{...p,Authorization:`Bearer ${e}`},body:s?JSON.stringify(s):void 0})),!c.ok)throw await c.json().catch(()=>({statusCode:c.status,error:"UNKNOWN",message:c.statusText}));return c.json()}return{async createCase(t,a){return n("POST","/api/cases",{message:t,...a?{context:a}:{}})},async sendMessage(t,a){return(await n("POST",`/api/cases/${t}/messages`,{content:a})).message},async addFeedback(t,a){await n("POST",`/api/cases/${t}/feedback`,{feedback:a})},async escalate(t,a){return n("POST",`/api/cases/${t}/escalate`,{reason:a})},async executeAction(t,a){return(await n("POST",`/api/cases/${t}/actions`,{action:a})).result}}}function R(i,e){let n=document.createElement("div");n.className="ai-evidence";for(let t of i){let a=document.createElement("span");if(a.className=`ai-evidence-badge ${t.type}`,t.type==="error_code")a.textContent=`${t.label}: ${t.value}`;else if(t.type==="job_id"){a.textContent=`${t.label}: ${t.value}`,a.setAttribute("role","button"),a.setAttribute("tabindex","0"),a.setAttribute("aria-label",`Copy ${t.label}: ${t.value}`);let s=()=>{navigator.clipboard.writeText(t.value).catch(()=>{})};a.addEventListener("click",s),a.addEventListener("keydown",o=>{(o.key==="Enter"||o.key===" ")&&(o.preventDefault(),s())})}else if(t.type==="timestamp"){let o=new Date(t.value).toLocaleString(e);a.textContent=`${t.label}: ${o}`}else t.type==="log_excerpt"?a.textContent=t.value:a.textContent=`${t.label}: ${t.value}`;n.appendChild(a)}return n}var _=new Set(["create_ticket"]);function N(i,e,n){let t=document.createElement("div");t.className="ai-actions";for(let a of i){let s=document.createElement("button");s.className=`ai-action-btn ${a.type}`,s.textContent=a.label,s.addEventListener("click",()=>{_.has(a.type)?B(n,a.label,()=>M(a,e)):M(a,e)}),t.appendChild(s)}return t}function M(i,e){switch(i.type){case"retry":e.onRetry(i);break;case"open_docs":{e.onOpenDocs(i);break}case"create_ticket":e.onCreateTicket(i);break;case"request_access":e.onRequestAccess(i);break;default:e.onCustom(i)}}function B(i,e,n){let t=document.createElement("div");t.className="ai-confirm-overlay",t.setAttribute("role","alertdialog"),t.setAttribute("aria-modal","true"),t.setAttribute("aria-label",`Confirm: ${e}`);let a=document.createElement("div");a.className="ai-confirm-box";let s=document.createElement("p");s.id="ai-confirm-msg",s.textContent=`Are you sure you want to "${e}"?`,t.setAttribute("aria-describedby","ai-confirm-msg"),a.appendChild(s);let o=()=>t.remove(),p=document.createElement("button");p.className="ai-confirm-yes",p.textContent="Yes",p.addEventListener("click",()=>{o(),n()});let c=document.createElement("button");c.className="ai-confirm-no",c.textContent="Cancel",c.addEventListener("click",o),t.addEventListener("keydown",l=>{if(l.key==="Escape"){o();return}if(l.key==="Tab"){let m=t.getRootNode()instanceof ShadowRoot?t.getRootNode().activeElement:document.activeElement;l.shiftKey&&m===c?(l.preventDefault(),p.focus()):!l.shiftKey&&m===p&&(l.preventDefault(),c.focus())}}),a.appendChild(p),a.appendChild(c),t.appendChild(a),i.appendChild(t),c.focus()}function P(i,e){let n=document.createElement("div");n.className=`ai-msg ${i.role}`,n.dataset.messageId=i.id;let t=document.createElement("span");if(t.textContent=i.content,n.appendChild(t),i.evidence.length>0&&n.appendChild(R(i.evidence,e.locale)),i.actions.length>0){let a=J(e);n.appendChild(N(i.actions,a,e.panelEl))}return i.role==="assistant"&&n.appendChild(F(e)),n}function F(i){let e=document.createElement("div");e.className="ai-feedback";let n=document.createElement("button");n.textContent="\u{1F44D}",n.setAttribute("aria-label","Mark as helpful"),n.addEventListener("click",()=>{i.apiClient.addFeedback(i.caseId,"positive").catch(()=>{}),e.textContent="Thanks for your feedback!"});let t=document.createElement("button");return t.textContent="\u{1F44E}",t.setAttribute("aria-label","Mark as not helpful"),t.addEventListener("click",()=>{i.apiClient.addFeedback(i.caseId,"negative").catch(()=>{}),e.textContent="Thanks for your feedback!"}),e.appendChild(n),e.appendChild(t),e}function J(i){let{apiClient:e,caseId:n}=i;return{async onRetry(t){let a=await e.executeAction(n,t);C(a,i)},onOpenDocs(t){let a=t.payload.url;a&&window.open(a,"_blank","noopener")},async onCreateTicket(t){let a=await e.escalate(n);C(`Ticket created: ${a.ticketId}`,i)},async onRequestAccess(t){let a=await e.executeAction(n,t);C(a,i)},async onCustom(t){let a=await e.executeAction(n,t);C(a,i)}}}function C(i,e){let n=document.createElement("div");n.className="ai-msg system",n.textContent=i,e.messagesEl.appendChild(n),e.messagesEl.scrollTop=e.messagesEl.scrollHeight}function L(i){let{apiClient:e,locale:n,position:t,onClose:a}=i,s=t==="bottom-left",o=document.createElement("div");o.className=`ai-widget-panel${s?" left":""}`,o.setAttribute("role","dialog"),o.setAttribute("aria-label","Support chat");let p=document.createElement("div");p.className="ai-widget-header";let c=document.createElement("h2");c.className="ai-widget-header-title",c.textContent="Support",c.id="ai-widget-title",o.setAttribute("aria-labelledby","ai-widget-title");let l=document.createElement("button");l.className="ai-escalate-btn",l.textContent="Talk to human",l.setAttribute("aria-label","Escalate to human support");let m=document.createElement("button");m.className="ai-close-btn",m.textContent="\u2715",m.setAttribute("aria-label","Close support chat"),m.addEventListener("click",a),p.appendChild(c),p.appendChild(l),p.appendChild(m);let r=document.createElement("div");r.className="ai-widget-messages",r.setAttribute("role","log"),r.setAttribute("aria-live","polite"),r.setAttribute("aria-label","Chat messages");let u=document.createElement("div");u.className="ai-widget-input",u.setAttribute("role","form"),u.setAttribute("aria-label","Send a message");let g=document.createElement("input");g.type="text",g.placeholder="Describe your issue...",g.setAttribute("aria-label","Type your message");let f=document.createElement("button");f.textContent="Send",f.setAttribute("aria-label","Send message"),u.appendChild(g),u.appendChild(f),o.appendChild(p),o.appendChild(r),o.appendChild(u);let b=null,h=!1;function y(){return{apiClient:e,locale:n,messagesEl:r,panelEl:o,caseId:b??""}}function k(){let d=document.createElement("div");return d.className="ai-typing",d.setAttribute("role","status"),d.setAttribute("aria-live","polite"),d.textContent="AI is thinking...",r.appendChild(d),r.scrollTop=r.scrollHeight,d}function E(d){r.appendChild(P(d,y())),r.scrollTop=r.scrollHeight}async function S(){let d=g.value.trim();if(!d||h)return;h=!0,f.setAttribute("disabled",""),g.value="";let x=k();try{b||(b=(await e.createCase(d,i.context)).case.id);let v=await e.sendMessage(b,d);x.remove();let I={id:"local_u",caseId:b,role:"user",content:d,actions:[],evidence:[],confidence:null,createdAt:new Date().toISOString()};E(I),E(v)}catch{x.remove();let v=document.createElement("div");v.className="ai-msg system",v.textContent="Failed to send message. Please try again.",r.appendChild(v)}finally{h=!1,f.removeAttribute("disabled")}}return f.addEventListener("click",S),g.addEventListener("keydown",d=>{d.key==="Enter"&&S()}),o.addEventListener("keydown",d=>{d.key==="Escape"&&a()}),l.addEventListener("click",async()=>{if(b)try{let d=await e.escalate(b,"User requested human agent"),x=document.createElement("div");x.className="ai-msg system",x.textContent=`Escalated to human support. Ticket: ${d.ticketId}`,r.appendChild(x)}catch{let d=document.createElement("div");d.className="ai-msg system",d.textContent="Failed to escalate. Please try again.",r.appendChild(d)}}),{element:o,destroy(){o.remove()},focus(){g.focus()}}}var w=class i{static{this.instance=null}static init(e){i.instance&&i.instance.destroy();let n=e.theme??"light",t=e.position??"bottom-right",a=e.locale??"en-US",s=t==="bottom-left",o=document.createElement("div");o.id="ai-support-widget",document.body.appendChild(o);let p=o.attachShadow({mode:"open"}),c=document.createElement("style");c.textContent=T(n),p.appendChild(c);let l=e.jwt,m=$({apiUrl:e.apiUrl,getJwt:()=>l,onTokenRefresh:e.onTokenRefresh?async()=>(l=await e.onTokenRefresh(),l):void 0}),r=document.createElement("button");r.className=`ai-widget-fab${s?" left":""}`,r.textContent="\u{1F4AC}",r.setAttribute("aria-label","Open support chat"),r.setAttribute("aria-expanded","false"),r.setAttribute("aria-haspopup","dialog"),p.appendChild(r);let u=null;function g(){u||(u=L({apiClient:m,locale:a,position:t,onClose:f,context:e.context}),p.appendChild(u.element),r.setAttribute("aria-expanded","true"),r.setAttribute("aria-label","Close support chat"),u.focus())}function f(){u&&(u.destroy(),u=null),r.setAttribute("aria-expanded","false"),r.setAttribute("aria-label","Open support chat"),r.focus()}function b(){f(),o.remove(),i.instance=null}r.addEventListener("click",()=>{u?f():g()});function h(k){l=k}let y={open:g,close:f,destroy:b,updateJwt:h};return i.instance=y,y}};typeof window<"u"&&(window.AISupportWidget=w);return U(W);})();
