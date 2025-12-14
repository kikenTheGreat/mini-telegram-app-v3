const PRIMARY = "#0C59FF";

const PRIZES = [
  { label: "10 USDT", icon: "💎" },
  { label: "Mystery Box", icon: "🎁" },
  { label: "20 USDT", icon: "💠" },
  { label: "Free Spin", icon: "🎡" },
  { label: "50 USDT", icon: "💰" },
  { label: "VIP Pass", icon: "👑" },
  { label: "Skin", icon: "🧩" },
  { label: "Try Again", icon: "🔁" }
];

const TASKS = [
  { id: "follow_x", title: "Follow us on X", reward: 555, link: "https://x.com" },
  { id: "join_channel", title: "Join Telegram Channel", reward: 555, link: "https://t.me/telegram" },
  { id: "join_chat", title: "Join Telegram Chat", reward: 555, link: "https://t.me/telegram" },
  { id: "youtube", title: "Wager an amount of $5,000", reward: 555, link: "https://youtube.com" },
  { id: "tiktok", title: "Follow us on TikTok", reward: 555, link: "https://tiktok.com" },
  { id: "daily", title: "Daily Check-in", reward: 555, link: "" }
];

const SUPPORT_USERNAME = "USERNAME";
const REF_LINK = "https://t.me/twixer_mini_app_bot?start=ref_12345";

// === Supabase config (env/Telegram-safe; do not hardcode secrets) ===
// Provide at runtime via: window.SUPABASE_URL / window.SUPABASE_ANON_KEY (injected by server) or bundler env like import.meta.env.VITE_SUPABASE_URL.
const SUPABASE_URL = window.SUPABASE_URL || (typeof importMetaEnv !== "undefined" ? importMetaEnv.VITE_SUPABASE_URL : undefined) || "https://zvzzwmlpimznzyaayvxt.supabase.co";
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || (typeof importMetaEnv !== "undefined" ? importMetaEnv.VITE_SUPABASE_ANON_KEY : undefined) || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2enp3bWxwaW16bnp5YWF5dnh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNjk1MDQsImV4cCI6MjA4MDc0NTUwNH0.-LWqxtf715XZaGpMeoM0Unv4znveIXUUX_9wqRiulWA";
const supa = (SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Dev fallback: allow direct Supabase writes when not inside Telegram WebApp
const ALLOW_DEV_NO_INITDATA = true;

async function testSupabaseConnection(){
  if(!supa){
    console.error("[Supa] Client not initialized (missing URL/key or supabase lib)");
    return;
  }
  try{
    const { data, error } = await supa.from("profiles").select("user_id").limit(1);
    if(error){
      console.error("[Supa] Select failed:", error.message);
    }else{
      console.log("[Supa] Connected. Sample row count:", (data || []).length);
    }
  }catch(err){
    console.error("[Supa] Unexpected error:", err);
  }
}

// Basic user identity from Telegram WebApp (binds to signed payload). Backend must verify signature.
const USER_KEY = "miniapp_user_v1";
const user = resolveUser();

function resolveUser(){
  const params = new URLSearchParams(window.location.search);
  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
  if(tgUser?.id){
    const profile = {
      id: String(tgUser.id),
      username: tgUser.username || params.get("username") || `tg_${tgUser.id}`,
      first_name: tgUser.first_name,
      last_name: tgUser.last_name,
      tg: true
    };
    saveJSON(USER_KEY, profile);
    return profile;
  }

  // fallback for browser preview: URL params or cached local id
  const cached = loadJSON(USER_KEY, null);
  if(cached) return cached;
  const id = params.get("uid") || params.get("user_id") || crypto.randomUUID();
  const username = params.get("username") || `user_${id.slice(0,6)}`;
  const profile = { id, username };
  saveJSON(USER_KEY, profile);
  return profile;
}

const elSplash = document.getElementById("splash");
const elTopbar = document.getElementById("topbar");
const pages = Array.from(document.querySelectorAll(".screen-page"));
const navButtons = Array.from(document.querySelectorAll("#bottomNav .nav-item"));
const toastEl = document.getElementById("toast");

const canvas = document.getElementById("wheelCanvas");
const ctx = canvas.getContext("2d");
const btnSpin = document.getElementById("btnSpin");
const overlay = document.getElementById("winOverlay");
const winPrize = document.getElementById("winPrize");
const btnCloseWin = document.getElementById("btnCloseWin");
const confetti = document.getElementById("confetti");
const historyList = document.getElementById("historyList");

const tasksList = document.getElementById("tasksList");
const lbInviteList = document.getElementById("leaderboardInviteList");
const lbWagerList = document.getElementById("leaderboardWagerList");

const tabLbInvite = document.getElementById("tabLbInvite");
const tabLbWager = document.getElementById("tabLbWager");
const panelLbInvite = document.getElementById("panelLbInvite");
const panelLbWager = document.getElementById("panelLbWager");

const tabTasks = document.getElementById("tabTasks");
const tabFriendsFromTasks = document.getElementById("tabFriendsFromTasks");
const panelTasks = document.getElementById("panelTasks");
const panelFriendsInTasks = document.getElementById("panelFriendsInTasks");

const tabTasksFromInvite = document.getElementById("tabTasksFromInvite");
const tabFriends = document.getElementById("tabFriends");

const inviteLink = document.getElementById("inviteLink");
const btnCopyInvite = document.getElementById("btnCopyInvite");
const btnCopyInvite2 = document.getElementById("btnCopyInvite2");
const inviteCountEl = document.getElementById("inviteCount");

const inviteLinkTasks = document.getElementById("inviteLinkTasks");
const btnCopyInviteTasks = document.getElementById("btnCopyInviteTasks");
const btnCopyInviteTasks2 = document.getElementById("btnCopyInviteTasks2");
const inviteCountTasksEl = document.getElementById("inviteCountTasks");

const supportHandle = document.getElementById("supportHandle");
const btnOpenSupport = document.getElementById("btnOpenSupport");

let wheelRotation = 0;
let spinning = false;
let history = [];
let inviteCount = 0;
let inviteCountTasks = 0;
let lastDailyClaim = loadJSON("miniapp_daily_claim_v1", null);

const taskStateKey = "miniapp_task_state_v1";
const taskState = loadJSON(taskStateKey, {});
TASKS.forEach(t => { if (!taskState[t.id]) taskState[t.id] = "default"; });
saveJSON(taskStateKey, taskState);

const TASK_COOLDOWN_MS = 5000; // simple guard: wait 5s after Start before Claim

function showToast(msg){
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=>toastEl.classList.remove("show"), 1200);
}

function loadJSON(key, fallback){
  try{
    const v = localStorage.getItem(key);
    if(!v) return fallback;
    return JSON.parse(v);
  }catch{
    return fallback;
  }
}
function saveJSON(key, value){
  try{ localStorage.setItem(key, JSON.stringify(value)); }catch{}
}

async function persistTaskState(taskId, status, extra = {}){
  const initData = window.Telegram?.WebApp?.initData;
  const { daily_date, ...taskExtra } = extra || {};

  if(!initData){
    if(ALLOW_DEV_NO_INITDATA && supa){
      console.warn("[Task] No initData; using dev fallback direct supabase writes");
      // Direct writes (dev only)
      const payload = {
        user_id: user.id,
        task_id: taskId,
        status,
        updated_at: new Date().toISOString(),
        ...taskExtra
      };
      const { error } = await supa.from("task_progress").upsert(payload);
      if(error){
        console.error("[Task][dev] Failed to save task_progress:", error);
      }
      if(taskId === "daily" && daily_date){
        const { error: dErr } = await supa.from("daily_claims").upsert({
          user_id: user.id,
          claim_date: daily_date
        });
        if(dErr){
          console.error("[Daily][dev] Failed to save daily_claims:", dErr);
        }
      }
      return;
    }
    console.error("[Task] Missing Telegram initData; cannot call Edge Function");
    return;
  }

  // Daily is handled by the dedicated Edge Function
  if(taskId === "daily" && status === "claimed"){
    console.log("[Daily] Calling daily-claim Edge Function");
    try{
      const res = await fetch(`${SUPABASE_URL}/functions/v1/daily-claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData })
      });
      const json = await res.json();
      if(!res.ok || !json.ok){
        console.error("[Daily] Failed:", json);
      }else{
        console.log("[Daily] Success:", json);
      }
    }catch(e){
      console.error("[Daily] Error calling Edge Function:", e);
    }
    return;
  }

  // Regular tasks via Edge Function
  try{
    console.log("[Task] Calling tasks Edge Function", { taskId, status });
    const res = await fetch(`${SUPABASE_URL}/functions/v1/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData, task_id: taskId, status })
    });
    const json = await res.json();
    if(!res.ok || !json.ok){
      console.error("[Task] Edge Function failed:", json);
    }else{
      console.log("[Task] Edge Function success:", json);
    }
  }catch(err){
    console.error("[Task] Edge Function error:", err);
  }
}

async function fetchRemoteTasks(){
  if(!supa) return;
  const { data } = await supa
    .from("task_progress")
    .select("task_id,status")
    .eq("user_id", user.id);
  if(data){
    data.forEach(row=>{ taskState[row.task_id] = row.status || "default"; });
    saveJSON(taskStateKey, taskState);
  }

  const { data: daily } = await supa
    .from("daily_claims")
    .select("claim_date")
    .eq("user_id", user.id)
    .order("claim_date", { ascending:false })
    .limit(1);
  if(daily && daily.length){
    lastDailyClaim = daily[0].claim_date;
    saveJSON("miniapp_daily_claim_v1", lastDailyClaim);
  }
  renderTasks();
}

async function refreshInviteCounts(){
  if(!supa) return;
  try{
    const { data } = await supa
      .from("invite_stats")
      .select("invites")
      .eq("user_id", user.id)
      .single();
    if(data){
      inviteCount = data.invites || inviteCount;
      inviteCountTasks = inviteCount;
      updateInviteCounters();
    }
  }catch{
    /* ignore when no rows */
  }
}

function updateInviteCounters(){
  if(inviteCountEl) inviteCountEl.textContent = inviteCount;
  if(inviteCountTasksEl) inviteCountTasksEl.textContent = inviteCountTasks;
}

async function recordInviteShare(){
  if(!supa) return;
  console.log("[Invite] Recording share");
  const { data, error } = await supa.from("invite_events").insert({
    user_id: user.id,
    username: user.username,
    event_type: "share",
    meta: { link: REF_LINK },
    created_at: new Date().toISOString()
  });
  if(error){
    console.error("[Invite] Failed to save:", error);
  }else{
    console.log("[Invite] Saved:", data);
    // Increment aggregate invite_stats so leaderboards and counters reflect shares
    try{
      const { error: incErr } = await supa.rpc("inc_invite_stat", {
        p_user_id: user.id,
        p_username: user.username
      });
      if(incErr){
        console.error("[Invite] Failed to increment invite_stats:", incErr);
      }else{
        console.log("[Invite] invite_stats incremented");
        await refreshInviteCounts();
      }
    }catch(e){
      console.error("[Invite] RPC error inc_invite_stat:", e);
    }
  }
}

async function recordSpin(prize){
  if(!supa) return;
  console.log("[Spin] Recording:", prize.label);
  const { data, error } = await supa.from("spins").insert({
    user_id: user.id,
    username: user.username,
    prize: prize.label,
    icon: prize.icon,
    created_at: new Date().toISOString()
  });
  if(error){
    console.error("[Spin] Failed to save:", error);
  }else{
    console.log("[Spin] Saved:", data);
  }
}

async function fetchHistory(){
  if(!supa) return;
  const { data } = await supa
    .from("spins")
    .select("prize,icon,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending:false })
    .limit(6);
  if(data){
    history = data.map(row=>({
      prize: { label: row.prize, icon: row.icon },
      time: new Date(row.created_at)
    }));
    renderHistoryList();
  }
}

async function upsertProfile(){
  if(!supa) return;
  await supa.from("profiles").upsert({
    user_id: user.id,
    username: user.username,
    first_name: user.first_name || "",
    last_name: user.last_name || ""
  });
  console.log("[Profile]", user.username, "saved to profiles");
}

async function bootstrapRemote(){
  await testSupabaseConnection();
  await upsertProfile();
  await Promise.allSettled([
    fetchRemoteTasks(),
    refreshInviteCounts(),
    fetchHistory()
  ]);
  renderTasks();
  updateInviteCounters();
  renderHistoryList();
}

function renderHistoryList(){
  historyList.innerHTML = "";
  history.forEach(h=>{
    const div = document.createElement("div");
    div.className = "hist-item";
    div.innerHTML = `<div>${h.prize.icon} <strong>${escapeHtml(h.prize.label)}</strong></div><div>${fmtTime(h.time)}</div>`;
    historyList.appendChild(div);
  });
}

function setActiveNav(page){
  navButtons.forEach(b=>{
    const isCenter = b.classList.contains("nav-center");
    const target = b.getAttribute("data-nav");
    const active = (target === page);
    b.classList.toggle("active", active);
    if(isCenter && page === "home") b.classList.add("active");
  });
}

function showPage(page){
  pages.forEach(p => p.classList.toggle("active", p.getAttribute("data-page") === page));
  setActiveNav(page);
  if(page === "tasks") setTasksTab("tasks");
  if(page === "invite") setInviteTab("friends");
  if(page === "leaderboard") setLeaderboardTab("invite");
}

function setTasksTab(which){
  const isTasks = which === "tasks";
  tabTasks.classList.toggle("active", isTasks);
  tabFriendsFromTasks.classList.toggle("active", !isTasks);
  panelTasks.classList.toggle("active", isTasks);
  panelFriendsInTasks.classList.toggle("active", !isTasks);
}

function setInviteTab(which){
  const isFriends = which === "friends";
  tabFriends.classList.toggle("active", isFriends);
  tabTasksFromInvite.classList.toggle("active", !isFriends);
}

function setLeaderboardTab(which){
  const isInvite = which === "invite";
  tabLbInvite.classList.toggle("active", isInvite);
  tabLbWager.classList.toggle("active", !isInvite);
  panelLbInvite.classList.toggle("active", isInvite);
  panelLbWager.classList.toggle("active", !isInvite);
}

function openLink(url){
  if(!url) return;
  window.open(url, "_blank");
}

function renderTasks(){
  tasksList.innerHTML = "";
  const today = todayKey();

  TASKS.forEach(t=>{
    let state = taskState[t.id] || "default";

    if(t.id === "daily"){
      if(lastDailyClaim === today){
        state = "claimed";
      }else if(state === "claimed"){
        state = "default"; // new day reset
        taskState[t.id] = "default";
      }
    }

    const card = document.createElement("div");
    card.className = "task-card";

    const left = document.createElement("div");
    left.className = "task-left";

    const ico = document.createElement("div");
    ico.className = "task-ico";
    ico.innerHTML = "✓";

    const meta = document.createElement("div");
    meta.className = "task-meta";
    meta.innerHTML = `<div class="task-title">${escapeHtml(t.title)}</div><div class="task-reward">+${t.reward}</div>`;

    left.appendChild(ico);
    left.appendChild(meta);

    const btn = document.createElement("button");
    btn.type = "button";
    const btnClass = (state === "claimed") ? "btn-secondary" : (state === "completed" ? "btn-light" : "btn-outline-light");
    btn.className = "btn btn-sm task-btn " + btnClass;
    const isDailyBlocked = t.id === "daily" && lastDailyClaim === today;
    btn.disabled = state === "claimed" || isDailyBlocked;
    if(t.id === "daily"){
      btn.textContent = isDailyBlocked ? "Claimed Today" : "Daily Check-in";
    }else{
      btn.textContent = state === "claimed" ? "Claimed" : (state === "completed" ? "Claim" : "Start");
    }

    btn.addEventListener("click", async ()=>{
      if(t.id === "daily"){
        if(lastDailyClaim === today){
          showToast("Already claimed today");
          return;
        }
        lastDailyClaim = today;
        taskState[t.id] = "claimed";
        saveJSON("miniapp_daily_claim_v1", lastDailyClaim);
        saveJSON(taskStateKey, taskState);
        renderTasks();
        await persistTaskState(t.id, "claimed", { daily_date: today });
        showToast("Daily claimed");
        return;
      }

      if(state === "default"){
        if(t.link) openLink(t.link);
        btn.disabled = true;
        btn.textContent = "Wait...";
        setTimeout(async ()=>{
          taskState[t.id] = "completed";
          saveJSON(taskStateKey, taskState);
          renderTasks();
          await persistTaskState(t.id, "completed");
          showToast("Completed");
        }, TASK_COOLDOWN_MS);
      }else if(state === "completed"){
        taskState[t.id] = "claimed";
        saveJSON(taskStateKey, taskState);
        renderTasks();
        await persistTaskState(t.id, "claimed");
        showToast("Claimed");
      }
    });

    card.appendChild(left);
    card.appendChild(btn);
    tasksList.appendChild(card);
  });
}

async function renderLeaderboard(){
  await Promise.all([
    fetchInviteLeaderboard(),
    fetchWagerLeaderboard()
  ]);
}

function renderLbList(targetEl, rows, valueLabel){
  targetEl.innerHTML = "";
  rows.forEach((d, i)=>{
    const row = document.createElement("div");
    row.className = "lb-card";
    row.innerHTML = `
      <div class="lb-left">
        <div class="lb-rank">${i+1}</div>
        <div>
          <div class="lb-user">${escapeHtml(d.user)}</div>
          <div class="lb-points">${valueLabel(d)}</div>
        </div>
      </div>
      <div class="lb-pill">Rank ${i+1}</div>
    `;
    targetEl.appendChild(row);
  });
}

async function fetchInviteLeaderboard(){
  let rows = [];
  if(supa){
    const { data, error } = await supa
      .from("invite_stats")
      .select("username, invites")
      .order("invites", { ascending:false })
      .limit(20);
    if(!error && data){
      rows = data.map(r=>({ user: r.username || "anon", invites: r.invites || 0 }));
    }
  }

  if(rows.length === 0){
    rows = [
      { user: "@Lazarus", invites: 12 },
      { user: "@Hassan", invites: 9 },
      { user: "@Princess", invites: 7 },
      { user: "@Nova", invites: 6 },
      { user: "@Raven", invites: 5 },
      { user: "@Zeno", invites: 4 },
      { user: "@Aster", invites: 3 }
    ];
  }
  renderLbList(lbInviteList, rows, (d)=>`${d.invites} invites`);
}

async function fetchWagerLeaderboard(){
  let rows = [];
  const monthKey = new Date().toISOString().slice(0,7); // yyyy-mm
  if(supa){
    const { data, error } = await supa
      .from("wager_monthly")
      .select("username, volume, month")
      .eq("month", monthKey)
      .order("volume", { ascending:false })
      .limit(20);
    if(!error && data){
      rows = data.map(r=>({ user: r.username || "anon", volume: r.volume || 0 }));
    }
  }
  if(rows.length === 0){
    rows = [
      { user: "@Nova", volume: 1500 },
      { user: "@Raven", volume: 1200 },
      { user: "@Hassan", volume: 950 },
      { user: "@Aster", volume: 700 }
    ];
  }
  renderLbList(lbWagerList, rows, (d)=>`${d.volume} pts`);
}

function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function todayKey(){
  return new Date().toISOString().slice(0,10);
}

function drawWheel(){
  const w = canvas.width;
  const h = canvas.height;
  const cx = w/2;
  const cy = h/2;
  const r = Math.min(cx, cy) - 10;
  const n = PRIZES.length;
  const step = (Math.PI * 2) / n;

  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(wheelRotation);

  for(let i=0;i<n;i++){
    const a0 = i*step;
    const a1 = a0 + step;

    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.arc(0,0,r,a0,a1);
    ctx.closePath();

    ctx.fillStyle = (i%2===0) ? "rgba(12,89,255,.32)" : "rgba(255,255,255,.08)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.10)";
    ctx.lineWidth = 2;
    ctx.stroke();

    const mid = (a0+a1)/2;
    ctx.save();
    ctx.rotate(mid);
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,.92)";
    ctx.font = "700 14px system-ui";
    ctx.fillText(PRIZES[i].icon, r*0.66, 6);
    ctx.font = "900 10px system-ui";
    ctx.fillStyle = "rgba(255,255,255,.80)";
    ctx.fillText(PRIZES[i].label, r*0.66, 22);
    ctx.restore();
  }

  ctx.restore();
}

function spin(){
  if(spinning) return;
  spinning = true;
  btnSpin.disabled = true;

  const n = PRIZES.length;
  const step = (Math.PI * 2) / n;
  const idx = Math.floor(Math.random() * n);

  const target = (Math.PI * 1.5) - (idx * step + step/2);
  const extra = (Math.PI * 2) * (5 + Math.floor(Math.random()*3));
  const start = wheelRotation;
  const end = target + extra;

  const dur = 4200;
  const t0 = performance.now();

  function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }

  function frame(now){
    const t = Math.min(1, (now - t0) / dur);
    const e = easeOutCubic(t);
    wheelRotation = start + (end - start) * e;
    drawWheel();
    if(t < 1){
      requestAnimationFrame(frame);
    }else{
      wheelRotation = ((wheelRotation % (Math.PI*2)) + (Math.PI*2)) % (Math.PI*2);
      drawWheel();
      const prize = PRIZES[idx];
      addHistory(prize);
      showWin(prize);
      spinning = false;
      btnSpin.disabled = false;
    }
  }
  requestAnimationFrame(frame);
}

function addHistory(prize){
  history.unshift({ prize, time: new Date() });
  history = history.slice(0, 6);
  renderHistoryList();
  recordSpin(prize);
}

function fmtTime(d){
  const hh = String(d.getHours()).padStart(2,"0");
  const mm = String(d.getMinutes()).padStart(2,"0");
  return `${hh}:${mm}`;
}

function showWin(prize){
  winPrize.textContent = `${prize.icon} ${prize.label}`;
  overlay.classList.add("show");
  overlay.setAttribute("aria-hidden","false");
  spawnConfetti();
}

function hideWin(){
  overlay.classList.remove("show");
  overlay.setAttribute("aria-hidden","true");
  confetti.innerHTML = "";
}

function spawnConfetti(){
  confetti.innerHTML = "";
  const count = 70;
  for(let i=0;i<count;i++){
    const c = document.createElement("div");
    c.className = "conf";
    c.style.left = (Math.random()*100) + "%";
    c.style.animationDuration = (1.8 + Math.random()*1.8) + "s";
    c.style.animationDelay = (Math.random()*0.25) + "s";
    c.style.transform = `translateY(0) rotate(${Math.random()*180}deg)`;
    c.style.background = (Math.random() > 0.5) ? PRIMARY : "rgba(255,255,255,.85)";
    confetti.appendChild(c);
  }
}

async function copyText(text){
  try{
    await navigator.clipboard.writeText(text);
    return true;
  }catch{
    try{
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      return true;
    }catch{
      return false;
    }
  }
}

function wireInvite(){
  if(inviteLink){
    inviteLink.value = REF_LINK;
    btnCopyInvite.addEventListener("click", async ()=>{
      const ok = await copyText(REF_LINK);
      if(ok){
        inviteCount++;
        inviteCountEl.textContent = inviteCount;
        showToast("Copied!");
        recordInviteShare();
      }
    });
    btnCopyInvite2.addEventListener("click", async ()=>{
      const ok = await copyText(REF_LINK);
      if(ok){
        inviteCount++;
        inviteCountEl.textContent = inviteCount;
        showToast("Copied!");
        recordInviteShare();
      }
    });
  }

  if(inviteLinkTasks){
    inviteLinkTasks.value = REF_LINK;
    btnCopyInviteTasks.addEventListener("click", async ()=>{
      const ok = await copyText(REF_LINK);
      if(ok){
        inviteCountTasks++;
        inviteCountTasksEl.textContent = inviteCountTasks;
        showToast("Copied!");
        recordInviteShare();
      }
    });
    btnCopyInviteTasks2.addEventListener("click", async ()=>{
      const ok = await copyText(REF_LINK);
      if(ok){
        inviteCountTasks++;
        inviteCountTasksEl.textContent = inviteCountTasks;
        showToast("Copied!");
        recordInviteShare();
      }
    });
  }
}

function wireTabs(){
  tabTasks.addEventListener("click", ()=>setTasksTab("tasks"));
  tabFriendsFromTasks.addEventListener("click", ()=>setTasksTab("friends"));
  tabTasksFromInvite.addEventListener("click", ()=>showPage("tasks"));
  tabFriends.addEventListener("click", ()=>showPage("invite"));

  tabLbInvite.addEventListener("click", ()=>setLeaderboardTab("invite"));
  tabLbWager.addEventListener("click", ()=>setLeaderboardTab("wager"));
}

function wireNav(){
  navButtons.forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const page = btn.getAttribute("data-nav");
      showPage(page);
    });
  });
}

function wireSupport(){
  supportHandle.textContent = "@" + SUPPORT_USERNAME;
  btnOpenSupport.addEventListener("click", ()=>{
    window.open(`https://t.me/${SUPPORT_USERNAME}`, "_blank");
  });
}

btnSpin.addEventListener("click", spin);
btnCloseWin.addEventListener("click", hideWin);
overlay.addEventListener("click", (e)=>{
  if(e.target === overlay) hideWin();
});

document.getElementById("btnClose").addEventListener("click", ()=>showToast("Close"));
document.getElementById("btnMenu").addEventListener("click", ()=>showToast("Menu"));

async function init(){
  elTopbar.style.display = "none";
  pages.forEach(p=>p.classList.remove("active"));
  document.getElementById("page-home").classList.add("active");
  setActiveNav("home");

  drawWheel();
  renderTasks();
  renderLeaderboard();
  wireInvite();
  wireTabs();
  wireNav();
  wireSupport();

   bootstrapRemote();

  setTimeout(()=>{
    elSplash.classList.remove("active");
    elSplash.style.display = "none";
    elTopbar.style.display = "flex";
    showPage("home");
  }, 2300);
}

init();
