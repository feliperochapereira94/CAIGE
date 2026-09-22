(function () {
  'use strict';
  const MAX = 320;
  let state = null;

  function ensureModal() {
    if (document.getElementById('foto-crop-modal')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <div class="foto-crop-modal" id="foto-crop-modal" hidden>
        <div class="foto-crop-dialog modal__content" role="dialog" aria-modal="true" aria-labelledby="foto-crop-title">
          <div class="modal__header modal__header--destaque"><h2 class="modal__title" id="foto-crop-title">Ajustar foto</h2><button type="button" class="modal__close foto-crop-close" aria-label="Fechar"><span class="icone icone--sm" data-icone="fechar" aria-hidden="true"></span></button></div>
          <div class="foto-crop-stage"><canvas id="foto-crop-canvas" width="320" height="320"></canvas></div>
          <div class="foto-crop-help">Arraste a foto para enquadrar o rosto.</div>
          <div class="foto-crop-zoom"><span>Zoom</span><input id="foto-crop-range" type="range" min="1" max="3" value="1" step="0.01"></div>
          <div class="foto-crop-actions"><button type="button" class="btn btn--secondary" data-crop-cancel>Cancelar</button><button type="button" class="btn btn--primary" data-crop-apply>Aplicar foto</button></div>
        </div>
      </div>`);
    const modal = document.getElementById('foto-crop-modal');
    window.IconesCAIGE?.aplicar?.(modal);
    modal.querySelector('.foto-crop-close').onclick = close;
    modal.querySelector('[data-crop-cancel]').onclick = close;
    modal.querySelector('[data-crop-apply]').onclick = apply;
    document.getElementById('foto-crop-range').oninput = e => { state.zoom = +e.target.value; draw(); };
    const canvas = document.getElementById('foto-crop-canvas');
    const point = e => { const r=canvas.getBoundingClientRect(), t=e.touches?.[0]||e; return {x:(t.clientX-r.left)*MAX/r.width,y:(t.clientY-r.top)*MAX/r.height}; };
    const down=e=>{if(!state)return; state.drag=true; state.last=point(e); e.preventDefault();};
    const move=e=>{if(!state?.drag)return; const p=point(e); state.x+=p.x-state.last.x; state.y+=p.y-state.last.y; state.last=p; draw(); e.preventDefault();};
    const up=()=>{if(state)state.drag=false;};
    canvas.addEventListener('mousedown',down); canvas.addEventListener('mousemove',move); window.addEventListener('mouseup',up);
    canvas.addEventListener('touchstart',down,{passive:false}); canvas.addEventListener('touchmove',move,{passive:false}); window.addEventListener('touchend',up);
  }
  function draw() {
    const c=document.getElementById('foto-crop-canvas'), ctx=c.getContext('2d'), im=state.img;
    ctx.clearRect(0,0,MAX,MAX);
    const base=Math.max(MAX/im.width,MAX/im.height), scale=base*state.zoom, w=im.width*scale,h=im.height*scale;
    const minX=MAX-w,maxX=0,minY=MAX-h,maxY=0;
    state.x=Math.min(maxX,Math.max(minX,state.x)); state.y=Math.min(maxY,Math.max(minY,state.y));
    ctx.drawImage(im,state.x,state.y,w,h);
  }
  function open(file, callback) {
    if (!file || !/^image\/(jpeg|png|webp)$/.test(file.type)) return window.notify?.error?.('Selecione uma imagem JPG, PNG ou WebP.');
    if (file.size > 8*1024*1024) return window.notify?.error?.('A foto deve ter no máximo 8 MB.');
    ensureModal(); const im=new Image(); im.onload=()=>{URL.revokeObjectURL(im.src); const base=Math.max(MAX/im.width,MAX/im.height),w=im.width*base,h=im.height*base; state={img:im,zoom:1,x:(MAX-w)/2,y:(MAX-h)/2,callback,drag:false}; document.getElementById('foto-crop-range').value=1; document.getElementById('foto-crop-modal').hidden=false; draw();}; im.src=URL.createObjectURL(file);
  }
  function apply(){ if(!state)return; draw(); const data=document.getElementById('foto-crop-canvas').toDataURL('image/webp',0.72); const cb=state.callback; close(); cb(data); }
  function close(){ const m=document.getElementById('foto-crop-modal'); if(m)m.hidden=true; state=null; }
  async function save(patientId,dataUrl){ const r=await fetch(`/api/pacientes/${patientId}/foto`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:dataUrl})}); const data=await r.json().catch(()=>({})); if(!r.ok)throw new Error(data.message||'Erro ao salvar foto'); if(!data.photo&&!data.path)throw new Error('O servidor não confirmou a gravação da foto.'); return data; }
  async function remove(patientId){ const r=await fetch(`/api/pacientes/${patientId}/foto`,{method:'DELETE'}); if(!r.ok)throw new Error('Erro ao remover foto'); }
  function url(patientId){ return `/recursos/uploads/pacientes/${patientId}.webp?v=${Date.now()}`; }
  window.PacienteFotoEditor={open,save,remove,url};
})();
