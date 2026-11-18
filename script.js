/* === MODE ONLINE: Firebase Firestore (data dipakai bersama oleh semua perangkat) ===
   Isi kunci proyek Anda di firebase-config.js.
   Panel Pengelola: buka  index.html?admin  lalu masuk dengan akun admin. */
const ADMINMODE = /[?&]admin/.test(location.search);
let fbAuth = null, dbErr = false, unsubKontak = null;
const kontak = {}; // nama lengkap + WhatsApp: hanya terbaca oleh admin
(function(){
  try{
    const cfg = window.FIREBASE_CONFIG;
    if(!window.firebase || !cfg || !cfg.apiKey || /ISI_/.test(cfg.apiKey)) throw new Error("Konfigurasi Firebase belum diisi (firebase-config.js)");
    firebase.initializeApp(cfg);
    window.ptbDB = firebase.firestore();
    fbAuth = firebase.auth();
  }catch(e){ console.error("[PTB] Firebase tidak aktif:", e); window.ptbDB = null; }
})();
const OWNER_WA = "6285752101665"; // ganti dengan nomor WhatsApp pengelola, format 62...
const REK = {bank:"BRI", no:"491101032285530", an:"Lestari Ayu Nastiti"};
const BANNER = "images/gedung.jpg";
const BATAS_JAM = 24; // batas waktu pembayaran setelah reservasi diterima

const $ = id => document.getElementById(id);
const rp = n => "Rp " + n.toLocaleString("id-ID");
const samar = n => n.split(/\s+/).filter(Boolean).map(w=>w[0].toUpperCase()+"***").join(" ");
const waNorm = n=>{let d = n.replace(/\D/g,""); if(d.startsWith("0")) d = "62"+d.slice(1); else if(d.startsWith("8")) d = "62"+d; return d;};
const pad = h => String(h).padStart(2,"0");
const el = (t,c,x)=>{const e=document.createElement(t); if(c) e.className=c; if(x!=null) e.textContent=x; return e;};
const hr = h => pad(h)+".00";
const jam = [[7,16],[16,21]];
const N = {
 root:{t:"Penyewaan Fasilitas Poltekbang",k:["sport","event","bus"]},
 cek:{t:"Cek Reservasi",cek:true},
 cs:{t:"Layanan Pelanggan",cs:true},
 sport:{t:"Pusat Olahraga",e:"🏅",k:["futsal","basket","badminton","voli"]},
 event:{t:"Pusat Acara",e:"🎪",k:["aula","theater","serbaguna"]},
 bus:{t:"Sewa Bus",e:"🚌",k:["dk","lk"]},
 dk:{t:"Dalam Kota",e:"🏙️",k:["micro_dk","mini_dk"]},
 lk:{t:"Luar Kota",e:"🛣️",k:["micro_lk","mini_lk"]},
 futsal:{t:"Lapangan Futsal",e:"⚽",m:"hour",tier:[[7,16,150000],[16,21,200000]]},
 basket:{t:"Lapangan Basket",e:"🏀",m:"hour",tier:[[7,16,150000],[16,21,200000]]},
 badminton:{t:"Lapangan Bulu Tangkis",e:"🏸",m:"hour",tier:[[7,16,35000],[16,21,70000]]},
 voli:{t:"Lapangan Voli",e:"🏐",m:"hour",tier:[[7,21,75000]]},
 aula:{t:"Aula",e:"🏛️",m:"block",n:4,s:[7,17],price:6000000,per:"/ 4 jam",f:["Ber-AC penuh","Sistem tata suara","Kapasitas 200 orang","Toilet"]},
 theater:{t:"Mini Teater",e:"🎬",m:"pax",price:40000,max:180,per:"/ orang",f:["Ber-AC penuh","Sistem tata suara","Videotron","Kursi teater","Kapasitas 180 orang"]},
 serbaguna:{t:"Gedung Serbaguna",e:"🏟️",m:"block",n:8,s:[7,13],price:6000000,per:"/ 8 jam",f:["Tribun kapasitas 500 orang","Tata cahaya","Mendukung acara besar dan turnamen"]},
 micro_dk:{t:"Bus Mikro",f:["Kapasitas 12–16 kursi"],e:"🚐",m:"day",price:800000,per:"/ hari"},
 mini_dk:{t:"Bus Mini",f:["Kapasitas 25 kursi"],e:"🚌",m:"day",price:1000000,per:"/ hari"},
 micro_lk:{t:"Bus Mikro",f:["Kapasitas 12–16 kursi"],e:"🚐",m:"day",price:1200000,per:"/ hari"},
 mini_lk:{t:"Bus Mini",f:["Kapasitas 25 kursi"],e:"🚌",m:"day",price:1600000,per:"/ hari"}
};
const IC = {
 cs:'<path d="M4 14v-2a8 8 0 0 1 16 0v2M4 14h3v5H5a1 1 0 0 1-1-1zM20 14h-3v5h2a1 1 0 0 0 1-1zM17 19c0 1.5-2 2-5 2"/>',
 sport:'<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
 event:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M12 13l1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.8 2.6-.4z"/>',
 bus:'<rect x="4" y="4" width="16" height="13" rx="2"/><path d="M4 11h16M7 21v-4M17 21v-4M8 14.5h.01M16 14.5h.01"/>',
 futsal:'<circle cx="12" cy="12" r="9"/><path d="m12 8 3.5 2.5-1.3 4H9.8l-1.3-4zM12 3v5M20 9.5l-4.5 1M17.5 19l-3.3-4.5M6.5 19l3.3-4.5M4 9.5l4.5 1"/>',
 basket:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3v18M5.5 5.5c3 3 3 10 0 13M18.5 5.5c-3 3-3 10 0 13"/>',
 badminton:'<circle cx="12" cy="19" r="2.2"/><path d="M10.4 17 6 5M13.6 17 18 5M12 16.8V4M6 5h12"/>',
 voli:'<circle cx="12" cy="12" r="9"/><path d="M12 3c-1 5 1 9 7 11M12 3c3 3 2 8-2 11M3.5 14c4-1 8 1 10 7M5 6.5c3 .5 6 3 7 7"/>',
 aula:'<path d="M3 9l9-5 9 5zM5 9v9M9.5 9v9M14.5 9v9M19 9v9M3 21h18M4 18h16"/>',
 theater:'<rect x="3" y="4" width="18" height="11" rx="1.5"/><path d="M8 20h8M12 15v5M10.5 7.5l4 2-4 2z"/>',
 serbaguna:'<ellipse cx="12" cy="9" rx="9" ry="4"/><path d="M3 9v7c0 2.2 4 4 9 4s9-1.8 9-4V9M7 12.5v7M12 13v7.5M17 12.5v7"/>',
 rapat:'<circle cx="12" cy="8" r="3"/><path d="M5 20c0-4 3-6 7-6s7 2 7 6"/><circle cx="4.5" cy="10" r="2"/><circle cx="19.5" cy="10" r="2"/>',
 dk:'<path d="M3 21h18M5 21V9h5v12M14 21V4h5v17M7.5 13h.01M7.5 17h.01M16.5 8h.01M16.5 12h.01M16.5 16h.01"/>',
 lk:'<path d="M9 21l2-15M15 21l-2-15M12 9v2M12 14v2M12 19v1M3 21h18"/>',
 micro:'<path d="M3 17V9a2 2 0 0 1 2-2h9l5 5v5zM3 12h16M10 7v5"/><circle cx="7.5" cy="17.5" r="1.8"/><circle cx="16" cy="17.5" r="1.8"/>',
 mini:'<rect x="2" y="5" width="20" height="12" rx="2"/><path d="M2 11h20M8 5v6M14 5v6M5 17v2M19 17v2M7 14h.01M17 14h.01"/>'
};
const svgOf = k => '<svg viewBox="0 0 24 24" aria-hidden="true">'+(IC[k]||IC[k.split("_")[0]]||IC.sport)+'</svg>';
const KOTA = {micro_dk:"Dalam Kota",mini_dk:"Dalam Kota",micro_lk:"Luar Kota",mini_lk:"Luar Kota"};
const today = new Date().toLocaleDateString("sv-SE",{timeZone:"Asia/Jayapura"});
const addD = (s,n)=>{const d=new Date(s+"T00:00:00Z"); d.setUTCDate(d.getUTCDate()+n); return d.toISOString().slice(0,10);};
let path = [], db = null, isAdmin = false, booked = {}, rows = [], paint = ()=>{}, F = {}, stat = {}, cekKode = "";

function suara(t){
  try{
    const s = window.speechSynthesis; if(!s) return;
    s.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = LANG==="en"?"en-US":"id-ID"; u.rate = .95;
    const v = s.getVoices().find(x=>x.lang && x.lang.toLowerCase().startsWith(LANG==="en"?"en":"id")); if(v) u.voice = v;
    s.speak(u);
  }catch(e){}
}
function nav(p){path = p; render(); window.scrollTo(0,0);}
$("bOpen").onclick = ()=>nav(["root"]);

function render(){
  $("cover").hidden = path.length>0; $("app").hidden = !path.length; document.body.classList.toggle("inapp", path.length>0);
  const app = $("app"); app.textContent = ""; paint = ()=>{};
  if(!path.length) return;
  const id = path[path.length-1], n = N[id];
  const top = el("div","top"), back = el("button","back","← Kembali"); back.type="button";
  back.onclick = ()=>nav(path.slice(0,-1)); top.append(back, el("h2","",n.t)); if(path.length>1||true) app.appendChild(top);
  if(n.cek) cekPage(app); else if(n.cs) csPage(app); else if(n.k){
    const bx = el("div", id==="root"?"bubbles":"kartus");
    n.k.forEach(k=>{const c=N[k], b=el("button", id==="root"?"bubble":"kartu"); b.type="button";
      const ic = el("span","e"); ic.innerHTML = svgOf(k); b.append(ic, el("span","",c.t)); if(id!=="root") b.appendChild(el("span","arr","›"));
      
      b.onclick=()=>{b.classList.add("pressed"); setTimeout(()=>nav([...path,k]),240);}; bx.appendChild(b);});
    app.appendChild(bx);
    if(id==="root"){const cb=el("button","btn alt","Cek Status Reservasi"); cb.type="button"; cb.style.background="var(--card)"; cb.onclick=()=>nav(["root","cek"]); app.appendChild(cb);}
  } else product(id, n, app);
  if(ADMINMODE){ if(isAdmin) admin(app); else adminLogin(app); }
}

const CSFOTO = "images/cs.jpg";
const FOTO = {"futsal": ["images/futsal1.jpg", "images/futsal2.jpg"], "badminton": ["images/badminton1.jpg", "images/badminton2.jpg"], "basket": ["images/basket1.jpg", "images/basket2.jpg"], "voli": ["images/voli1.jpg"], "aula": ["images/aula1.jpg", "images/aula2.jpg"], "serbaguna": ["images/serbaguna1.jpg"], "theater": ["images/theater1.jpg", "images/theater2.jpg"], "micro_dk": ["images/bus.jpg"], "micro_lk": ["images/bus.jpg"], "mini_dk": ["images/bus.jpg"], "mini_lk": ["images/bus.jpg"]};
const KB = ["kb1","kb2","kb3","kb4"];
function galeri(list, title){
  const g = el("div","galeri"), slides = list.map(u=>{const d = el("div","slide"); d.style.backgroundImage = "url("+u+")"; g.appendChild(d); return d;});
  g.appendChild(el("div","gcap",title));
  const dots = [], bx = el("div","gdots"); let cur = 0, n = 0, timer = null;
  const show = i=>{
    const old = slides[cur];
    if(i!==cur){old.classList.remove("on"); old.classList.add("prev"); setTimeout(()=>old.classList.remove("prev"),2200);}
    const s = slides[i]; KB.forEach(k=>s.classList.remove(k)); s.classList.add(KB[n%KB.length]); n++;
    s.classList.add("on"); dots.forEach((d,j)=>d.classList.toggle("on",j===i)); cur = i;
  };
  if(list.length>1){
    list.forEach((_,i)=>{const b = el("button"); b.type="button"; b.setAttribute("aria-label","Foto "+(i+1)); b.onclick = ()=>{show(i); clearInterval(timer); timer = setInterval(auto,6500);}; dots.push(b); bx.appendChild(b);});
    g.appendChild(bx);
  }
  const auto = ()=>{ if(!document.body.contains(g)){clearInterval(timer); return;} show((cur+1)%list.length); };
  show(0); if(list.length>1) timer = setInterval(auto,6500);
  return g;
}

function product(id, p, app){
  F = {hrs:[], start:null};
  if(FOTO[id]) app.appendChild(galeri(FOTO[id], p.t));
  const d = el("div","card"); d.appendChild(el("h3","","Harga & Fasilitas"));
  if(p.tier) p.tier.forEach(([a,b,pr])=>{const r=el("div","row"); r.append(el("span","",hr(a)+" – "+hr(b)+" WIT"), el("b","",rp(pr)+" / jam")); d.appendChild(r);});
  else {const r=el("div","row"); r.append(el("span","",p.t), el("b","",rp(p.price)+" "+p.per)); d.appendChild(r);}
  if(p.f){const u=el("ul","f"); p.f.forEach(x=>u.appendChild(el("li","",x))); d.appendChild(u);}
  app.appendChild(d);
  const c = el("div","card"); c.appendChild(el("h3","","Reservasi "+p.t));
  const inp = (lab,type,ph)=>{const l=el("label","",lab), i=el("input"); i.type=type||"text"; if(ph) i.placeholder=ph; c.append(l,i); return i;};
  const nama = inp("Nama penyewa"), wa = inp("Nomor WhatsApp","tel","08xxxxxxxxxx");
  const tgl = inp("Tanggal sewa","date"); tgl.min = today; tgl.value = today;
  let ex = null;
  if(p.m==="pax") ex = inp("Jumlah orang (maks. "+p.max+")","number","40");
  if(p.m==="day") {ex = inp("Jumlah hari","number"); ex.value = 1;}
  if(ex){ex.min=1; ex.oninput = ()=>paint();}
  const sel = el("div","slots"), lab = el("label","", p.m==="hour"?"Pilih jam (boleh lebih dari satu)":p.m==="day"?"":"Pilih jam mulai");
  c.append(lab,sel);
  const tot = el("span","total","Rp 0"), pt = el("p"); pt.append("Total: ",tot); c.appendChild(pt);
  const send = el("button","btn","Kirim Reservasi"); send.type="button"; const st = el("div"); c.append(send,st);
  c.appendChild(el("p","note","Nomor WhatsApp Anda hanya dipakai pengelola untuk menghubungi Anda. Simpan kode booking dan cek statusnya di menu Cek Status Reservasi."));
  app.appendChild(c);
  const price = h => p.tier.find(t=>h>=t[0]&&h<t[1])[2];
  const keyOf = (dt,k)=>id+"_"+dt+"_"+k;
  const hrsOf = s => Array.from({length:p.n},(_,i)=>s+i);
  const jml = ()=>Math.max(1,parseInt(ex&&ex.value)||1);
  const total = ()=>p.m==="hour"?F.hrs.reduce((s,h)=>s+price(h),0):p.m==="block"?(F.start!=null?p.price:0):p.m==="pax"?(F.start!=null?p.price*(parseInt(ex.value)||0):0):p.price*jml();
  paint = ()=>{
    const dt = tgl.value; sel.textContent = "";
    const mk = (h,sub,dis,on,fn)=>{const b=el("button","slot"+(on?" sel":""),h); b.type="button"; b.appendChild(el("small","",dis?"Sudah dipesan":sub)); b.disabled=dis; b.onclick=fn; sel.appendChild(b);};
    if(p.m==="hour") for(let h=7;h<21;h++) if(!p.tier[0]||h>=p.tier[0][0]) mk(hr(h)+"–"+hr(h+1), rp(price(h)), !!booked[keyOf(dt,pad(h))], F.hrs.includes(h), ()=>{F.hrs=F.hrs.includes(h)?F.hrs.filter(x=>x!==h):[...F.hrs,h].sort((a,b)=>a-b); paint();});
    if(p.m==="block") for(let s=p.s[0];s<=p.s[1];s++) mk(hr(s)+"–"+hr(s+p.n), rp(p.price), hrsOf(s).some(h=>booked[keyOf(dt,pad(h))]), F.start===s, ()=>{F.start=s; paint();});
    if(p.m==="pax") for(let h=8;h<=20;h++) mk(hr(h), p.per, !!booked[keyOf(dt,pad(h))], F.start===h, ()=>{F.start=h; paint();});
    if(p.m==="day"){const days=Array.from({length:jml()},(_,i)=>addD(dt,i)), b=days.find(x=>booked[keyOf(x,"d")]); if(b) mk("Tanggal "+b,"",true,false,null); else sel.appendChild(el("p","note","Armada tersedia untuk tanggal yang dipilih."));}
    tot.textContent = rp(total());
  };
  tgl.onchange = ()=>{F.hrs=[]; F.start=null; paint();};
  const msg = (t,cls)=>{st.textContent=""; const m=el("div","msg "+cls,t); st.appendChild(m); return m;};
  send.onclick = async ()=>{
    const dt = tgl.value, nm = nama.value.trim(), w = wa.value.trim();
    if(!nm || w.replace(/\D/g,"").length<9) return msg("Isi nama dan nomor WhatsApp yang benar.","bad");
    if(!dt || dt<today) return msg("Pilih tanggal hari ini atau setelahnya.","bad");
    let items = [];
    if(p.m==="hour"){ if(!F.hrs.length) return msg("Pilih minimal satu jam.","bad"); items = F.hrs.map(h=>({id:keyOf(dt,pad(h)),tgl:dt,sesi:hr(h)+"–"+hr(h+1),total:price(h)})); }
    if(p.m==="block"){ if(F.start==null) return msg("Pilih jam mulai.","bad"); items = hrsOf(F.start).map((h,i)=>({id:keyOf(dt,pad(h)),tgl:dt,sesi:hr(F.start)+"–"+hr(F.start+p.n),total:i?0:p.price})); }
    if(p.m==="pax"){ const x=parseInt(ex.value)||0; if(F.start==null||x<1||x>p.max) return msg("Pilih jam dan isi jumlah orang (1–"+p.max+").","bad"); items = [{id:keyOf(dt,pad(F.start)),tgl:dt,sesi:hr(F.start)+" · "+x+" orang",total:p.price*x}]; }
    if(p.m==="day"){ items = Array.from({length:jml()},(_,i)=>({id:keyOf(addD(dt,i),"d"),tgl:addD(dt,i),sesi:KOTA[id]+" · 1 hari",total:p.price})); }
    if(!db || dbErr) return msg("Sistem reservasi belum tersedia di perangkat ini. Buka melalui tautan resmi dan coba lagi.","bad");
    send.disabled = true;
    try{
      const kode = "PTB-"+Math.random().toString(36).slice(2,7).toUpperCase(), all = items.reduce((s,i)=>s+i.total,0), dibuat = new Date().toISOString();
      await db.runTransaction(async tx=>{
        const refs = items.map(it=>db.collection("slots").doc(it.id)), snaps = [];
        for(const r of refs) snaps.push(await tx.get(r));
        if(snaps.some(x=>x.exists)) throw new Error("keep");
        items.forEach((it,i)=>tx.set(refs[i], {nama:samar(nm), prod:p.t, tanggal:it.tgl, sesi:it.sesi, total:it.total, kode, dibuat}));
        tx.set(db.collection("kontak").doc(kode), {nama:nm, wa:waNorm(w), prod:p.t, dibuat});
      });
      const ring = p.t+" – "+dt+" – "+items.map(i=>i.sesi).filter((v,i,a)=>a.indexOf(v)===i).join(", ");
      const m = msg("Reservasi tercatat dengan KODE "+kode+" ("+ring+", total "+rp(all)+"). Simpan kode ini. Status: menunggu konfirmasi pengelola. Pembayaran dibuka setelah reservasi diterima.","ok");
      {const cb=el("button","btn alt","Cek Status Reservasi"); cb.type="button"; cb.onclick=()=>{cekKode=kode; nav(["root","cek"]);}; m.appendChild(cb);}
      suara(LANG==="en"?"Thank you for your reservation. Please wait for confirmation from the manager.":"Terima kasih telah melakukan reservasi. Mohon menunggu konfirmasi dari pengelola.");
      F.hrs=[]; F.start=null; paint();
    }catch(e){
      if(e.message==="keep"){
        const m = msg("Jadwal ini sudah dipesan oleh penyewa lain di hari dan jam yang sama. Silakan jadwalkan ulang: pilih jam lain atau pindah ke tanggal berikutnya.","keep");
        const a = el("button","btn alt","Jadwalkan ulang: lihat tanggal berikutnya"); a.type="button";
        a.onclick = ()=>{tgl.value = addD(dt,1); F.hrs=[]; F.start=null; st.textContent=""; paint(); tgl.scrollIntoView({behavior:"smooth",block:"center"});};
        m.appendChild(a); paint();
      } else {console.error("[PTB] gagal kirim:", e); msg("Gagal mengirim reservasi. Coba lagi.","bad");}
    }
    send.disabled = false;
  };
  paint();
}

function refresh(){
  if(!path.length) return; const id = path[path.length-1];
  if(isAdmin || id==="cek"){const y = window.scrollY; render(); window.scrollTo(0,y);} else paint();
}
const BADGE = {menunggu:"Menunggu konfirmasi", diterima:"Diterima – menunggu pembayaran", lunas:"Lunas – jadwal terkonfirmasi", ditolak:"Ditolak"};
const stOf = k => (stat[k] && stat[k].s) || "menunggu";
const wib = iso => new Date(iso).toLocaleString(LANG==="en"?"en-GB":"id-ID",{timeZone:"Asia/Jayapura",day:"numeric",month:"long",hour:"2-digit",minute:"2-digit"})+" WIT";
const sum = gr => gr.reduce((a,x)=>a+x.d.total,0);
const jadwal = gr => [...new Set(gr.map(x=>x.d.tanggal+" · "+x.d.sesi))].join("; ");
const setSt = (k,o)=>db.collection("status").doc(k).set(Object.assign({},stat[k]||{},o,{upd:new Date().toISOString()})).catch(()=>{});
const hapus = gr=>gr.forEach(q=>db.collection("slots").doc(q.id).delete().catch(()=>{}));

function adminLogin(app){
  const c = el("div","card"); c.appendChild(el("h3","","Masuk Pengelola"));
  if(!fbAuth){ c.appendChild(el("p","note","Firebase belum dikonfigurasi. Isi firebase-config.js terlebih dahulu.")); return void app.appendChild(c); }
  const e = el("input"), p = el("input"), b = el("button","btn","Masuk"), st = el("div");
  e.type = "email"; e.autocomplete = "username"; p.type = "password"; p.autocomplete = "current-password"; b.type = "button";
  b.onclick = async ()=>{
    st.textContent = ""; b.disabled = true;
    try{ await fbAuth.signInWithEmailAndPassword(e.value.trim(), p.value); }
    catch(err){ console.error("[PTB] login:", err); st.appendChild(el("div","msg bad","Gagal masuk. Periksa email dan kata sandi.")); }
    b.disabled = false;
  };
  c.append(el("label","","Email"), e, el("label","","Kata sandi"), p, b, st); app.appendChild(c);
}

function admin(app){
  const c = el("div","card"); c.appendChild(el("h3","","Panel Pengelola"));
  c.appendChild(el("p","note","Terima atau tolak reservasi, lalu tandai lunas setelah Anda cek mutasi rekening. Hanya tampil untuk pemilik website."));
  const g = {}; rows.forEach(r=>{(g[r.d.kode||r.id]=g[r.d.kode||r.id]||[]).push(r);});
  const list = Object.values(g).sort((a,b)=>b[0].d.dibuat.localeCompare(a[0].d.dibuat));
  if(!list.length) c.appendChild(el("p","note","Belum ada reservasi."));
  list.forEach(gr=>{
    const d = gr[0].d, k = d.kode || gr[0].id, s = stOf(k), tot = rp(sum(gr)), kt = kontak[k] || {}, nmFull = kt.nama || d.nama, waNo = kt.wa || d.wa || "";
    const r = el("div","res"); r.style.cssText = "flex-direction:column;align-items:flex-start";
    r.appendChild(el("span","",k+" · "+nmFull+(waNo?" · +"+waNo:"")+" · "+d.prod+" · "+jadwal(gr)+" · "+tot+" · "+BADGE[s]));
    const bx = el("div","acts"); r.appendChild(bx);
    const mk = (t,fn,cls)=>{const b = el("button","act"+(cls?" "+cls:""),t); b.type="button"; b.onclick = fn; bx.appendChild(b);};
    if(s==="menunggu"){
      mk("Terima",()=>setSt(k,{s:"diterima",batas:new Date(Date.now()+BATAS_JAM*3600e3).toISOString()}),"ok");
      mk("Tolak",()=>{setSt(k,{s:"ditolak"}); hapus(gr);});
    }
    if(s==="diterima") mk("Tandai Lunas",()=>setSt(k,{s:"lunas"}),"ok");
    const txt = s==="diterima" ? "Halo "+nmFull+", reservasi "+k+" ("+d.prod+", "+jadwal(gr)+") sudah DITERIMA. Total "+tot+". Silakan transfer ke "+REK.bank+" "+REK.no+" a.n. "+REK.an+" sebelum "+wib(stat[k].batas)+", lalu kirim bukti transfer ke sini."
      : s==="lunas" ? "Halo "+nmFull+", pembayaran reservasi "+k+" sudah kami terima. Jadwal Anda terkonfirmasi. Terima kasih."
      : s==="ditolak" ? "Halo "+nmFull+", mohon maaf reservasi "+k+" belum dapat kami terima. Silakan pilih jadwal lain." : "Halo "+nmFull+", reservasi "+k+" kami terima dan sedang kami proses.";
    const a = el("a","act","Kabari via WhatsApp"); a.target="_blank"; a.rel="noopener"; a.href="https://wa.me/"+waNo+"?text="+encodeURIComponent(txt); bx.appendChild(a);
    mk("Batalkan",()=>{hapus(gr); db.collection("status").doc(k).delete().catch(()=>{});});
    c.appendChild(r);
  });
  const lo = el("button","btn alt","Keluar"); lo.type = "button"; lo.onclick = ()=>fbAuth.signOut(); c.appendChild(lo);
  app.appendChild(c);
}

function csPage(app){
  const c = el("div","card"); c.appendChild(el("h3","","Layanan Pelanggan"));
  c.appendChild(el("p","note","Ada pertanyaan seputar reservasi, jadwal, atau pembayaran? Hubungi kami."));
  const tel = "+"+OWNER_WA.slice(0,2)+" "+OWNER_WA.slice(2,5)+"-"+OWNER_WA.slice(5,9)+"-"+OWNER_WA.slice(9);
  [["Jam layanan","Setiap hari, 07.00 – 21.00 WIT"],["WhatsApp",tel]].forEach(([a,v])=>{const w = el("div","row"); w.append(el("span","",a), el("b","",v)); c.appendChild(w);});
  const a = el("a","btn","Chat via WhatsApp"); a.target="_blank"; a.rel="noopener"; a.href = "https://wa.me/"+OWNER_WA+"?text="+encodeURIComponent("Halo, saya ingin bertanya tentang penyewaan fasilitas Poltekbang Jayapura."); c.appendChild(a);
  const b = el("button","btn alt","Cek Status Reservasi"); b.type="button"; b.onclick = ()=>nav(["root","cek"]); c.appendChild(b);
  app.appendChild(c);
  const f = el("div","card faq"); f.appendChild(el("h3","","Pertanyaan Umum"));
  [["Bagaimana cara reservasi?","Pilih fasilitas, tentukan tanggal dan jam, isi nama, lalu tekan Kirim Reservasi. Simpan kode booking yang muncul."],
   ["Bagaimana cara membayar?","Setelah reservasi diterima pengelola, buka Cek Status Reservasi untuk melihat nomor rekening dan nominal, lalu kirim bukti transfer lewat WhatsApp."],
   ["Berapa lama batas pembayaran?","24 jam setelah reservasi diterima."],
   ["Bagaimana jika jadwal bentrok?","Jadwal yang sudah dipesan tidak dapat dipilih. Gunakan tombol Jadwalkan ulang atau pilih tanggal dan jam lain."]
  ].forEach(([q,j])=>{const d = el("details"); d.append(el("summary","",q), el("p","",j)); f.appendChild(d);});
  app.appendChild(f);
}

function cekPage(app){
  const c = el("div","card"); c.appendChild(el("h3","","Cek Status Reservasi"));
  const l = el("label","","Kode pemesanan"), i = el("input"); i.placeholder = "contoh: PTB-7K3A1"; i.value = cekKode; i.oninput = ()=>{cekKode = i.value.trim().toUpperCase();};
  const b = el("button","btn","Cek"); b.type="button"; b.onclick = ()=>{cekKode = i.value.trim().toUpperCase(); render();};
  c.append(l,i,b); app.appendChild(c);
  if(!cekKode) return;
  const k = cekKode, gr = rows.filter(r=>r.d.kode===k), s = stOf(k), r = el("div","card");
  if(!gr.length){
    r.appendChild(el("div","msg bad", s==="ditolak" ? "Maaf, reservasi ini belum dapat diterima pengelola. Silakan buat reservasi baru dengan jadwal lain." : "Kode tidak ditemukan. Periksa kembali kodenya."));
    return void app.appendChild(r);
  }
  const d = gr[0].d;
  [["Nama",d.nama],["Fasilitas",d.prod],["Jadwal",jadwal(gr)],["Total",rp(sum(gr))],["Status",BADGE[s]]].forEach(([a,v])=>{const w = el("div","row"); w.append(el("span","",a), el("b","",v)); r.appendChild(w);});
  if(s==="menunggu") r.appendChild(el("p","note","Mohon menunggu pengelola menerima reservasi Anda. Halaman ini diperbarui otomatis."));
  if(s==="diterima"){
    r.appendChild(el("h3","","Pembayaran"));
    [["Bank",REK.bank],["No. rekening",REK.no],["Atas nama",REK.an],["Nominal",rp(sum(gr))],["Batas bayar",wib(stat[k].batas)]].forEach(([a,v])=>{const w = el("div","row"); w.append(el("span","",a), el("b","",v)); r.appendChild(w);});
    const cp = el("button","btn alt","Salin nomor rekening"); cp.type="button"; cp.onclick = ()=>{try{navigator.clipboard.writeText(REK.no); cp.textContent="Tersalin";}catch(e){}}; r.appendChild(cp);
    if(!OWNER_WA.includes("X")){const a = el("a","btn","Kirim bukti transfer via WhatsApp"); a.target="_blank"; a.rel="noopener"; a.href="https://wa.me/"+OWNER_WA+"?text="+encodeURIComponent("Halo, saya kirim bukti transfer untuk kode "+k+", total "+rp(sum(gr))+"."); r.appendChild(a);}
    r.appendChild(el("p","note","Jadwal Anda aman selama menunggu pembayaran sampai batas waktu di atas."));
  }
  if(s==="lunas") r.appendChild(el("div","msg ok","Pembayaran sudah diterima. Jadwal Anda terkonfirmasi. Terima kasih."));
  app.appendChild(r);
}

let LANG = "id"; try{LANG = localStorage.getItem("lang") || "id";}catch(e){}
const EN = {
"Layanan Pelanggan Poltekbang Jayapura":"Poltekbang Jayapura Customer Service","Halo! Ada yang bisa kami bantu?":"Hello! How can we help you?",
"Pusat informasi dan layanan reservasi penyewaan fasilitas Politeknik Penerbangan Jayapura.":"Information and reservation service center for facility rentals at Jayapura Aviation Polytechnic.",
"Hubungi Kami":"Contact Us","Masukkan kode booking Anda":"Enter your booking code","Panduan reservasi dan pembayaran":"Reservation and payment guide",
"Ada pertanyaan seputar reservasi atau pembayaran? Chat kami, ya.":"Questions about reservations or payments? Chat with us.",
"Layanan Pelanggan":"Customer Service",
"Ada pertanyaan seputar reservasi, jadwal, atau pembayaran? Hubungi kami.":"Questions about reservations, schedules, or payments? Contact us.",
"Jam layanan":"Service hours","Setiap hari, 07.00 – 21.00 WIT":"Every day, 07.00 – 21.00 WIT","Pertanyaan Umum":"Frequently Asked Questions",
"Bagaimana cara reservasi?":"How do I make a reservation?",
"Pilih fasilitas, tentukan tanggal dan jam, isi nama, lalu tekan Kirim Reservasi. Simpan kode booking yang muncul.":"Choose a facility, pick the date and time, enter your name, then press Submit Reservation. Keep the booking code shown.",
"Bagaimana cara membayar?":"How do I pay?",
"Setelah reservasi diterima pengelola, buka Cek Status Reservasi untuk melihat nomor rekening dan nominal, lalu kirim bukti transfer lewat WhatsApp.":"Once the manager accepts your reservation, open Check Reservation Status to see the account number and amount, then send the transfer proof via WhatsApp.",
"Berapa lama batas pembayaran?":"How long do I have to pay?","24 jam setelah reservasi diterima.":"24 hours after the reservation is accepted.",
"Bagaimana jika jadwal bentrok?":"What if the schedule is already taken?",
"Jadwal yang sudah dipesan tidak dapat dipilih. Gunakan tombol Jadwalkan ulang atau pilih tanggal dan jam lain.":"Booked slots cannot be selected. Use the Reschedule button or choose another date and time.",
"Panel Pengelola":"Manager Panel",
"Terima atau tolak reservasi, lalu tandai lunas setelah Anda cek mutasi rekening. Hanya tampil untuk pemilik website.":"Accept or reject reservations, then mark them as paid after you check the account statement. Visible to the website owner only.",
"Belum ada reservasi.":"No reservations yet.","Terima":"Accept","Tolak":"Reject","Tandai Lunas":"Mark as Paid","Kabari via WhatsApp":"Notify via WhatsApp","Batalkan":"Cancel","1 hari":"1 day",
"Isi nama penyewa.":"Please enter the renter's name.",
"Salin pesan untuk dikirim manual":"Copy message to send manually",
"Kampus Politeknik Penerbangan Jayapura":"Jayapura Aviation Polytechnic Campus",
"© 2026 Politeknik Penerbangan Jayapura — Sistem Informasi Penyewaan Fasilitas.":"© 2026 Jayapura Aviation Polytechnic — Facility Rental Information System.",
"Pusat Olahraga":"Sport Center","Pusat Acara":"Event Center","Sewa Bus":"Bus Rental","Mini Teater":"Mini Theater","Bus Mikro":"Micro Bus","Bus Mini":"Mini Bus","Sistem tata suara":"Sound system","BUKA":"OPEN",
"Kementerian Perhubungan Republik Indonesia":"Ministry of Transportation of the Republic of Indonesia",
"Politeknik Penerbangan Jayapura":"Jayapura Aviation Polytechnic",
"PENYEWAAN FASILITAS POLTEKBANG JAYAPURA":"FACILITY RENTAL – POLTEKBANG JAYAPURA",
"Unit Penyewaan Fasilitas":"Facility Rental Unit",
"Taruna Poltekbang Jayapura":"Poltekbang Jayapura Cadets",
"Penyewaan Fasilitas Poltekbang":"Poltekbang Facility Rental",
"Dalam Kota":"Within the City","Luar Kota":"Out of Town","Cek Reservasi":"Check Reservation",
"Lapangan Futsal":"Futsal Court","Lapangan Basket":"Basketball Court","Lapangan Bulu Tangkis":"Badminton Court","Lapangan Voli":"Volleyball Court",
"Aula":"Hall","Gedung Serbaguna":"Multipurpose Building","Ruang Rapat":"Meeting Room",
"Kapasitas 12–16 kursi":"Capacity 12–16 seats","Kapasitas 25 kursi":"Capacity 25 seats",
"← Kembali":"← Back","Harga & Fasilitas":"Price & Facilities",
"Ber-AC penuh":"Fully air-conditioned","Toilet":"Restrooms","Kursi teater":"Kursi teatering","Tata cahaya":"Tata cahaya",
"Mendukung acara besar dan turnamen":"Supports large events and tournaments",
"Nama penyewa":"Renter's name","Nomor WhatsApp":"WhatsApp number","Tanggal sewa":"Rental date",
"Pilih jam (boleh lebih dari satu)":"Select hours (more than one allowed)","Pilih jam mulai":"Select start time",
"Jumlah hari":"Number of days","Kirim Reservasi":"Submit Reservation",
"Nomor WhatsApp Anda hanya dipakai pengelola untuk menghubungi Anda. Simpan kode booking dan cek statusnya di menu Cek Status Reservasi.":"Your WhatsApp number is only used by the manager to contact you. Keep your booking code and check its status under Check Reservation Status.",
"Sudah dipesan":"Already reserved","/ orang":"/ person","Armada tersedia untuk tanggal yang dipilih.":"Vehicle available on the selected date.",
"Isi nama dan nomor WhatsApp yang benar.":"Please enter your name and a valid WhatsApp number.",
"Pilih tanggal hari ini atau setelahnya.":"Choose today's date or later.",
"Pilih minimal satu jam.":"Select at least one hour.","Pilih jam mulai.":"Select a start time.",
"Sistem reservasi belum tersedia di perangkat ini. Buka melalui tautan resmi dan coba lagi.":"The reservation system is not available on this device. Open it via the official link and try again.",
"Jadwal ini sudah dipesan oleh penyewa lain di hari dan jam yang sama. Silakan jadwalkan ulang: pilih jam lain atau pindah ke tanggal berikutnya.":"This schedule is already reserved by another renter at the same date and time. Please reschedule: choose another time or move to the next date.",
"Jadwalkan ulang: lihat tanggal berikutnya":"Reschedule: see the next date",
"Gagal mengirim reservasi. Coba lagi.":"Failed to submit the reservation. Please try again.",
"Cek Status Reservasi":"Check Reservation Status","Kirim Pemberitahuan ke Pengelola (WhatsApp)":"Notify the Manager (WhatsApp)",
"Kode pemesanan":"Booking code","Cek":"Check","Nama":"Name","Fasilitas":"Facility","Jadwal":"Schedule",
"Menunggu konfirmasi":"Awaiting confirmation","Diterima – menunggu pembayaran":"Accepted – awaiting payment",
"Lunas – jadwal terkonfirmasi":"Paid – schedule confirmed","Ditolak":"Rejected","Pembayaran":"Payment",
"No. rekening":"Account no.","Atas nama":"Account holder","Nominal":"Amount","Batas bayar":"Pay before",
"Salin nomor rekening":"Copy account number","Tersalin":"Copied","Kirim bukti transfer via WhatsApp":"Send transfer proof via WhatsApp",
"Mohon menunggu pengelola menerima reservasi Anda. Halaman ini diperbarui otomatis.":"Please wait for the manager to accept your reservation. This page updates automatically.",
"Jadwal Anda aman selama menunggu pembayaran sampai batas waktu di atas.":"Your schedule is held while awaiting payment until the deadline above.",
"Pembayaran sudah diterima. Jadwal Anda terkonfirmasi. Terima kasih.":"Payment received. Your schedule is confirmed. Thank you.",
"Maaf, reservasi ini belum dapat diterima pengelola. Silakan buat reservasi baru dengan jadwal lain.":"Sorry, this reservation could not be accepted. Please make a new reservation with another schedule.",
"Kode tidak ditemukan. Periksa kembali kodenya.":"Code not found. Please check the code again."
};
const PAT = [
[/^WhatsApp \/ Telp: (.+)$/, "WhatsApp / Phone: $1"],
[/^Reservasi tercatat dengan KODE (\S+) \((.+), total (Rp [\d.]+)\)\. Simpan kode ini\..*$/, "Reservation recorded with CODE $1 ($2, total $3). Save this code. Status: awaiting manager confirmation. Payment opens once the reservation is accepted."],
[/^Reservasi (.+)$/, (m,a)=>"Book "+(EN[a]||a)],
[/^Kapasitas (\d+) orang$/, "Capacity $1 people"],
[/^Tribun kapasitas (\d+) orang$/, "Grandstand, capacity $1 people"],
[/^Jumlah orang \(maks\. (\d+)\)$/, "Number of people (max. $1)"],
[/^Pilih jam dan isi jumlah orang \(1–(\d+)\)\.$/, "Select a time and enter the number of people (1–$1)."],
[/^Tanggal (\S+)$/, "Date $1"],
[/^(Rp [\d.]+) \/ jam$/, "$1 / hour"], [/^(Rp [\d.]+) \/ (\d+) jam$/, "$1 / $2 hours"],
[/^(Rp [\d.]+) \/ orang$/, "$1 / person"], [/^(Rp [\d.]+) \/ hari$/, "$1 / day"]
];
function tr(src){
  const t = src.trim(); if(!t) return src;
  let out = EN[t];
  if(out === undefined) for(const [re,r] of PAT) if(re.test(t)){out = t.replace(re,r); break;}
  if(out === undefined && t.includes(" · ")){
    const parts = t.split(" · "), tp = parts.map(x=>EN[x] !== undefined ? EN[x] : x);
    if(tp.join("|") !== parts.join("|")) out = tp.join(" · ");
  }
  return out === undefined ? src : src.replace(t, ()=>out);
}
function trNode(n){
  const p = n.parentNode; if(!p || /^(SCRIPT|STYLE)$/.test(p.nodeName)) return;
  const own = n._o !== undefined && n.nodeValue === n._t;
  if(LANG === "en"){
    const src = own ? n._o : n.nodeValue, en = tr(src);
    if(en !== src && n.nodeValue !== en){n._o = src; n._t = en; n.nodeValue = en;}
  } else if(own){n.nodeValue = n._o; delete n._o; delete n._t;}
}
function trTree(root){
  if(root.nodeType === 3) return trNode(root);
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); const list = []; let x;
  while((x = w.nextNode())) list.push(x); list.forEach(trNode);
}
function tick(){
  try{$("clock").textContent = new Date().toLocaleString(LANG==="en"?"en-GB":"id-ID",{timeZone:"Asia/Jayapura",weekday:"short",day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false})+" WIT";}catch(e){}
}
function setLang(l){
  LANG = l; try{localStorage.setItem("lang",l);}catch(e){}
  document.documentElement.lang = l;
  $("lID").classList.toggle("on", l==="id"); $("lEN").classList.toggle("on", l==="en");
  tick(); trTree(document.body); if(path.length) render();
}

new MutationObserver(ms=>{ms.forEach(m=>{
  if(m.type==="characterData") trNode(m.target);
  else m.addedNodes.forEach(n=>{ if(n.nodeType===3||n.nodeType===1) trTree(n); });
});}).observe(document.body,{childList:true,subtree:true,characterData:true});
$("lID").onclick = ()=>setLang("id"); $("lEN").onclick = ()=>setLang("en");
setInterval(tick,1000); setLang(LANG);
(function(){ // latar berganti tiap 4 detik setelah halaman dibuka (cover tetap)
  const SHADE = "linear-gradient(180deg,rgba(8,26,70,.8),rgba(12,40,110,.68) 55%,rgba(8,26,70,.9)), url(";
  const imgs = [BANNER, "images/udara.jpg"];
  const a = $("sky2"), b = a.cloneNode(false); b.id = "sky3"; a.after(b);
  const layers = [a,b]; let i = 0;
  imgs.forEach(u=>{const im = new Image(); im.src = u;});
  a.style.backgroundImage = SHADE+imgs[0]+")"; a.classList.add("on");
  setInterval(()=>{
    const cur = layers[i%2], nxt = layers[(i+1)%2]; i++;
    nxt.style.backgroundImage = SHADE+imgs[i%imgs.length]+")";
    nxt.classList.add("on"); cur.classList.remove("on");
  },4000);
})();
(function(){
  const fab = el("button","cs-fab"); fab.type = "button"; fab.setAttribute("aria-label","Layanan Pelanggan");
  fab.innerHTML = '<span class="cs-dot"><svg viewBox="0 0 24 24" aria-hidden="true">'+IC.cs+'</svg></span>'; fab.style.backgroundImage = "url("+CSFOTO+")"; fab.style.backgroundPosition = "center 20%";
  const pop = el("div","cs-pop"); pop.hidden = true;
  const tel = "+"+OWNER_WA.slice(0,2)+" "+OWNER_WA.slice(2,5)+"-"+OWNER_WA.slice(5,9)+"-"+OWNER_WA.slice(9);
  const hd = el("div","cs-hd"), hi = el("span"); hi.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">'+IC.cs+'</svg>';
  const x = el("button","cs-x","×"); x.type = "button"; x.setAttribute("aria-label","Tutup"); x.onclick = ()=>{pop.hidden = true;};
  hd.append(hi, el("span","","Layanan Pelanggan Poltekbang Jayapura"), x);
  const intro = el("div","cs-intro"); intro.append(el("b","","Halo! Ada yang bisa kami bantu?"), el("p","","Pusat informasi dan layanan reservasi penyewaan fasilitas Politeknik Penerbangan Jayapura."));
  const opt = (tag,ico,color,t,s)=>{
    const o = el(tag,"cs-opt"), ib = el("span","cs-ico"), tx = el("span","cs-tx");
    ib.style.background = color; ib.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">'+ico+'</svg>';
    tx.append(el("b","",t), el("small","",s)); o.append(ib,tx); if(tag==="button") o.type = "button"; return o;
  };
  const wa = opt("a",'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',"#16a34a","Hubungi Kami","WhatsApp / Telp: "+tel);
  wa.target = "_blank"; wa.rel = "noopener"; wa.onclick = ()=>{pop.hidden = true;};
  wa.href = "https://wa.me/"+OWNER_WA+"?text="+encodeURIComponent("Halo, saya ingin bertanya tentang penyewaan fasilitas Poltekbang Jayapura.");
  const st = opt("button",'<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4h6v3H9zM9 14l2 2 4-4"/>',"#0b2a6f","Cek Status Reservasi","Masukkan kode booking Anda");
  st.onclick = ()=>{pop.hidden = true; nav(["root","cek"]);};
  const fq = opt("button",'<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17h.01"/>',"#0b2a6f","Pertanyaan Umum","Panduan reservasi dan pembayaran");
  fq.onclick = ()=>{pop.hidden = true; nav(["root","cs"]);};
  pop.append(hd, intro, wa, st, fq);
  fab.onclick = ()=>{pop.hidden = !pop.hidden;};
  document.body.append(pop, fab);
})();
(async()=>{
  try{
    db = window.ptbDB; if(!db) return;
    const oops = n => err => {dbErr = true; console.error("[PTB] gagal membaca "+n+":", err);};
    db.collection("status").onSnapshot(s=>{stat={}; s.docs.forEach(x=>{const d=x.data(); if(d) stat[x.id]=d;}); refresh();}, oops("status"));
    db.collection("slots").onSnapshot(s=>{
      dbErr = false; booked = {}; rows = [];
      s.docs.forEach(x=>{const d = x.data(); if(d){booked[x.id]=1; rows.push({id:x.id,d});}});
      refresh();
    }, oops("slots"));
    if(fbAuth) fbAuth.onAuthStateChanged(u=>{
      isAdmin = !!u && !!window.ADMIN_EMAIL && (u.email||"").toLowerCase() === window.ADMIN_EMAIL.toLowerCase();
      if(unsubKontak){unsubKontak(); unsubKontak = null;}
      Object.keys(kontak).forEach(k=>delete kontak[k]);
      if(isAdmin) unsubKontak = db.collection("kontak").onSnapshot(s=>{
        Object.keys(kontak).forEach(k=>delete kontak[k]); s.docs.forEach(x=>{kontak[x.id] = x.data();}); refresh();
      }, err=>console.error("[PTB] gagal membaca kontak:", err));
      if(path.length) render();
    });
    if(ADMINMODE) nav(["root"]);
  }catch(e){console.error("[PTB]", e); db = null;}
})();
