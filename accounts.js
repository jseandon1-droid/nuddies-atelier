/* Nuddies Atelier — accounts (F-12). Username + password only; no email, phone or tracking.
 *
 * Turned on by api-config.json ({"api":"https://…workers.dev"}). With no address, or if the API
 * can't be reached, nothing account-related appears and the generator works exactly as before.
 *
 * Secrets never leave this browser in readable form:
 *   password       → PBKDF2-SHA256, 600 000 rounds, salt "nuddies-atelier/v1/auth/<username>"
 *   recovery words → SHA-256("nuddies-atelier/v1/recovery/<username>/<words>")
 * Only those derived keys are sent (over HTTPS); the server stores a peppered HMAC of them.
 * The 12 recovery words are generated here (crypto.getRandomValues, 132 bits) and shown once.
 * All user-controlled text is written with textContent — never innerHTML.
 */
(() => {
  'use strict';
  // BIP-39 English wordlist (2048 words, 11 bits each → 12 words = 132 bits). Test AC-1104 pins its hash.
  const WORDS = 'abandon ability able about above absent absorb abstract absurd abuse access accident account accuse achieve acid acoustic acquire across act action actor actress actual adapt add addict address adjust admit adult advance advice aerobic affair afford afraid again age agent agree ahead aim air airport aisle alarm album alcohol alert alien all alley allow almost alone alpha already also alter always amateur amazing among amount amused analyst anchor ancient anger angle angry animal ankle announce annual another answer antenna antique anxiety any apart apology appear apple approve april arch arctic area arena argue arm armed armor army around arrange arrest arrive arrow art artefact artist artwork ask aspect assault asset assist assume asthma athlete atom attack attend attitude attract auction audit august aunt author auto autumn average avocado avoid awake aware away awesome awful awkward axis baby bachelor bacon badge bag balance balcony ball bamboo banana banner bar barely bargain barrel base basic basket battle beach bean beauty because become beef before begin behave behind believe below belt bench benefit best betray better between beyond bicycle bid bike bind biology bird birth bitter black blade blame blanket blast bleak bless blind blood blossom blouse blue blur blush board boat body boil bomb bone bonus book boost border boring borrow boss bottom bounce box boy bracket brain brand brass brave bread breeze brick bridge brief bright bring brisk broccoli broken bronze broom brother brown brush bubble buddy budget buffalo build bulb bulk bullet bundle bunker burden burger burst bus business busy butter buyer buzz cabbage cabin cable cactus cage cake call calm camera camp can canal cancel candy cannon canoe canvas canyon capable capital captain car carbon card cargo carpet carry cart case cash casino castle casual cat catalog catch category cattle caught cause caution cave ceiling celery cement census century cereal certain chair chalk champion change chaos chapter charge chase chat cheap check cheese chef cherry chest chicken chief child chimney choice choose chronic chuckle chunk churn cigar cinnamon circle citizen city civil claim clap clarify claw clay clean clerk clever click client cliff climb clinic clip clock clog close cloth cloud clown club clump cluster clutch coach coast coconut code coffee coil coin collect color column combine come comfort comic common company concert conduct confirm congress connect consider control convince cook cool copper copy coral core corn correct cost cotton couch country couple course cousin cover coyote crack cradle craft cram crane crash crater crawl crazy cream credit creek crew cricket crime crisp critic crop cross crouch crowd crucial cruel cruise crumble crunch crush cry crystal cube culture cup cupboard curious current curtain curve cushion custom cute cycle dad damage damp dance danger daring dash daughter dawn day deal debate debris decade december decide decline decorate decrease deer defense define defy degree delay deliver demand demise denial dentist deny depart depend deposit depth deputy derive describe desert design desk despair destroy detail detect develop device devote diagram dial diamond diary dice diesel diet differ digital dignity dilemma dinner dinosaur direct dirt disagree discover disease dish dismiss disorder display distance divert divide divorce dizzy doctor document dog doll dolphin domain donate donkey donor door dose double dove draft dragon drama drastic draw dream dress drift drill drink drip drive drop drum dry duck dumb dune during dust dutch duty dwarf dynamic eager eagle early earn earth easily east easy echo ecology economy edge edit educate effort egg eight either elbow elder electric elegant element elephant elevator elite else embark embody embrace emerge emotion employ empower empty enable enact end endless endorse enemy energy enforce engage engine enhance enjoy enlist enough enrich enroll ensure enter entire entry envelope episode equal equip era erase erode erosion error erupt escape essay essence estate eternal ethics evidence evil evoke evolve exact example excess exchange excite exclude excuse execute exercise exhaust exhibit exile exist exit exotic expand expect expire explain expose express extend extra eye eyebrow fabric face faculty fade faint faith fall false fame family famous fan fancy fantasy farm fashion fat fatal father fatigue fault favorite feature february federal fee feed feel female fence festival fetch fever few fiber fiction field figure file film filter final find fine finger finish fire firm first fiscal fish fit fitness fix flag flame flash flat flavor flee flight flip float flock floor flower fluid flush fly foam focus fog foil fold follow food foot force forest forget fork fortune forum forward fossil foster found fox fragile frame frequent fresh friend fringe frog front frost frown frozen fruit fuel fun funny furnace fury future gadget gain galaxy gallery game gap garage garbage garden garlic garment gas gasp gate gather gauge gaze general genius genre gentle genuine gesture ghost giant gift giggle ginger giraffe girl give glad glance glare glass glide glimpse globe gloom glory glove glow glue goat goddess gold good goose gorilla gospel gossip govern gown grab grace grain grant grape grass gravity great green grid grief grit grocery group grow grunt guard guess guide guilt guitar gun gym habit hair half hammer hamster hand happy harbor hard harsh harvest hat have hawk hazard head health heart heavy hedgehog height hello helmet help hen hero hidden high hill hint hip hire history hobby hockey hold hole holiday hollow home honey hood hope horn horror horse hospital host hotel hour hover hub huge human humble humor hundred hungry hunt hurdle hurry hurt husband hybrid ice icon idea identify idle ignore ill illegal illness image imitate immense immune impact impose improve impulse inch include income increase index indicate indoor industry infant inflict inform inhale inherit initial inject injury inmate inner innocent input inquiry insane insect inside inspire install intact interest into invest invite involve iron island isolate issue item ivory jacket jaguar jar jazz jealous jeans jelly jewel job join joke journey joy judge juice jump jungle junior junk just kangaroo keen keep ketchup key kick kid kidney kind kingdom kiss kit kitchen kite kitten kiwi knee knife knock know lab label labor ladder lady lake lamp language laptop large later latin laugh laundry lava law lawn lawsuit layer lazy leader leaf learn leave lecture left leg legal legend leisure lemon lend length lens leopard lesson letter level liar liberty library license life lift light like limb limit link lion liquid list little live lizard load loan lobster local lock logic lonely long loop lottery loud lounge love loyal lucky luggage lumber lunar lunch luxury lyrics machine mad magic magnet maid mail main major make mammal man manage mandate mango mansion manual maple marble march margin marine market marriage mask mass master match material math matrix matter maximum maze meadow mean measure meat mechanic medal media melody melt member memory mention menu mercy merge merit merry mesh message metal method middle midnight milk million mimic mind minimum minor minute miracle mirror misery miss mistake mix mixed mixture mobile model modify mom moment monitor monkey monster month moon moral more morning mosquito mother motion motor mountain mouse move movie much muffin mule multiply muscle museum mushroom music must mutual myself mystery myth naive name napkin narrow nasty nation nature near neck need negative neglect neither nephew nerve nest net network neutral never news next nice night noble noise nominee noodle normal north nose notable note nothing notice novel now nuclear number nurse nut oak obey object oblige obscure observe obtain obvious occur ocean october odor off offer office often oil okay old olive olympic omit once one onion online only open opera opinion oppose option orange orbit orchard order ordinary organ orient original orphan ostrich other outdoor outer output outside oval oven over own owner oxygen oyster ozone pact paddle page pair palace palm panda panel panic panther paper parade parent park parrot party pass patch path patient patrol pattern pause pave payment peace peanut pear peasant pelican pen penalty pencil people pepper perfect permit person pet phone photo phrase physical piano picnic picture piece pig pigeon pill pilot pink pioneer pipe pistol pitch pizza place planet plastic plate play please pledge pluck plug plunge poem poet point polar pole police pond pony pool popular portion position possible post potato pottery poverty powder power practice praise predict prefer prepare present pretty prevent price pride primary print priority prison private prize problem process produce profit program project promote proof property prosper protect proud provide public pudding pull pulp pulse pumpkin punch pupil puppy purchase purity purpose purse push put puzzle pyramid quality quantum quarter question quick quit quiz quote rabbit raccoon race rack radar radio rail rain raise rally ramp ranch random range rapid rare rate rather raven raw razor ready real reason rebel rebuild recall receive recipe record recycle reduce reflect reform refuse region regret regular reject relax release relief rely remain remember remind remove render renew rent reopen repair repeat replace report require rescue resemble resist resource response result retire retreat return reunion reveal review reward rhythm rib ribbon rice rich ride ridge rifle right rigid ring riot ripple risk ritual rival river road roast robot robust rocket romance roof rookie room rose rotate rough round route royal rubber rude rug rule run runway rural sad saddle sadness safe sail salad salmon salon salt salute same sample sand satisfy satoshi sauce sausage save say scale scan scare scatter scene scheme school science scissors scorpion scout scrap screen script scrub sea search season seat second secret section security seed seek segment select sell seminar senior sense sentence series service session settle setup seven shadow shaft shallow share shed shell sheriff shield shift shine ship shiver shock shoe shoot shop short shoulder shove shrimp shrug shuffle shy sibling sick side siege sight sign silent silk silly silver similar simple since sing siren sister situate six size skate sketch ski skill skin skirt skull slab slam sleep slender slice slide slight slim slogan slot slow slush small smart smile smoke smooth snack snake snap sniff snow soap soccer social sock soda soft solar soldier solid solution solve someone song soon sorry sort soul sound soup source south space spare spatial spawn speak special speed spell spend sphere spice spider spike spin spirit split spoil sponsor spoon sport spot spray spread spring spy square squeeze squirrel stable stadium staff stage stairs stamp stand start state stay steak steel stem step stereo stick still sting stock stomach stone stool story stove strategy street strike strong struggle student stuff stumble style subject submit subway success such sudden suffer sugar suggest suit summer sun sunny sunset super supply supreme sure surface surge surprise surround survey suspect sustain swallow swamp swap swarm swear sweet swift swim swing switch sword symbol symptom syrup system table tackle tag tail talent talk tank tape target task taste tattoo taxi teach team tell ten tenant tennis tent term test text thank that theme then theory there they thing this thought three thrive throw thumb thunder ticket tide tiger tilt timber time tiny tip tired tissue title toast tobacco today toddler toe together toilet token tomato tomorrow tone tongue tonight tool tooth top topic topple torch tornado tortoise toss total tourist toward tower town toy track trade traffic tragic train transfer trap trash travel tray treat tree trend trial tribe trick trigger trim trip trophy trouble truck true truly trumpet trust truth try tube tuition tumble tuna tunnel turkey turn turtle twelve twenty twice twin twist two type typical ugly umbrella unable unaware uncle uncover under undo unfair unfold unhappy uniform unique unit universe unknown unlock until unusual unveil update upgrade uphold upon upper upset urban urge usage use used useful useless usual utility vacant vacuum vague valid valley valve van vanish vapor various vast vault vehicle velvet vendor venture venue verb verify version very vessel veteran viable vibrant vicious victory video view village vintage violin virtual virus visa visit visual vital vivid vocal voice void volcano volume vote voyage wage wagon wait walk wall walnut want warfare warm warrior wash wasp waste water wave way wealth weapon wear weasel weather web wedding weekend weird welcome west wet whale what wheat wheel when where whip whisper wide width wife wild will win window wine wing wink winner winter wire wisdom wise wish witness wolf woman wonder wood wool word work world worry worth wrap wreck wrestle wrist write wrong yard year yellow you young youth zebra zero zone zoo'.split(' ');
  const WORDSET = new Set(WORDS);
  const STORE = 'nuddies.atelier.session';
  const enc = new TextEncoder();
  const $ = (id) => document.getElementById(id);
  let API = '', HEALTH = null, session = null, ME = null, pendingWords = null, kitConfirmed = true;

  // ---------------------------------------------------------------- crypto helpers
  const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  async function sha256hex(s) { return hex(await crypto.subtle.digest('SHA-256', enc.encode(s))); }
  async function deriveAuth(username, password) {
    const k = await crypto.subtle.importKey('raw', enc.encode(password.normalize('NFKC')), 'PBKDF2', false, ['deriveBits']);
    return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode('nuddies-atelier/v1/auth/' + username), iterations: 600000 }, k, 256));
  }
  const deriveRec = (username, words) => sha256hex('nuddies-atelier/v1/recovery/' + username + '/' + words.join(' '));
  function newWords() { const a = new Uint16Array(12); crypto.getRandomValues(a); return [...a].map((n) => WORDS[n & 2047]); }
  function b64(bytes) { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s); }

  // Compact synchronous SHA-256 for the sign-up proof-of-work (WebCrypto is async per hash,
  // far too slow for ~100k tries). Returns the first 32-bit word of the digest.
  const K = new Uint32Array([0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
    0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb,
    0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f,
    0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
  const W = new Uint32Array(64);
  function sha256first(bytes) {
    const l = bytes.length, nb = ((l + 9 + 63) >> 6) << 6, m = new Uint8Array(nb);
    m.set(bytes); m[l] = 0x80;
    const bits = l * 8; m[nb - 4] = bits >>> 24; m[nb - 3] = bits >>> 16; m[nb - 2] = bits >>> 8; m[nb - 1] = bits;
    let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a, h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
    for (let i = 0; i < nb; i += 64) {
      for (let t = 0; t < 16; t++) W[t] = (m[i + 4 * t] << 24) | (m[i + 4 * t + 1] << 16) | (m[i + 4 * t + 2] << 8) | m[i + 4 * t + 3];
      for (let t = 16; t < 64; t++) {
        const a = W[t - 15], b = W[t - 2];
        const s0 = ((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3);
        const s1 = ((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10);
        W[t] = (W[t - 16] + s0 + W[t - 7] + s1) | 0;
      }
      let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
      for (let t = 0; t < 64; t++) {
        const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        const t1 = (h + S1 + ((e & f) ^ (~e & g)) + K[t] + W[t]) | 0;
        const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
        const t2 = (S0 + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0;
      h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
    }
    return h0 >>> 0;
  }
  async function solvePow(challenge, bits) {
    const prefix = enc.encode(challenge + ':');
    const limit = 2 ** (32 - bits);
    for (let i = 0; ; i++) {
      const d = enc.encode(String(i)), buf = new Uint8Array(prefix.length + d.length);
      buf.set(prefix); buf.set(d, prefix.length);
      if (sha256first(buf) < limit) return String(i);
      if (i % 4000 === 3999) await new Promise((r) => setTimeout(r, 0));
    }
  }

  // ---------------------------------------------------------------- API
  const MSG = {
    network: "Can't reach the accounts server. Check your connection and try again.",
    bad_username: 'Usernames are 3–20 letters, numbers or _.',
    username_taken: 'That username is taken — try another.',
    bad_credentials: 'Wrong username or password.',
    bad_recovery: "Those recovery words don't match that username.",
    creations_full: "You've hit the 300-creation limit. Delete some to save more.",
    not_held: "That Nuddie isn't in your verified wallet.",
    no_wallet: 'Verify a wallet first.',
    bad_signature: "The wallet signature didn't check out. Try again.",
    challenge_expired: 'That took too long — try again.',
    wallet_taken: 'That wallet is already linked to another Atelier account.',
    holdings_unavailable: 'Holdings are switched off right now.',
    holdings_upstream: "Couldn't load your Nuddies right now. Try again shortly.",
    not_configured: 'Accounts are still being set up. Try again later.',
    not_found: "That item doesn't exist any more.",
  };
  function message(e) {
    const c = e && e.code, d = (e && e.data) || {};
    if (c === 'locked') { const mins = Math.max(1, Math.ceil((d.retryAfter || 60) / 60)); return `Too many tries. Try again in ${mins} minute${mins > 1 ? 's' : ''}.`; }
    let m = MSG[c] || 'Something went wrong. Try again.';
    if ((c === 'bad_credentials' || c === 'bad_recovery') && d.attemptsLeft && d.attemptsLeft <= 3)
      m += ` ${d.attemptsLeft} ${d.attemptsLeft === 1 ? 'try' : 'tries'} left before a ${c === 'bad_recovery' ? '1-hour' : '15-minute'} lock.`;
    return m;
  }
  async function api(method, path, body, auth = true) {
    const h = {};
    if (body) h['content-type'] = 'application/json';
    if (auth && session) h.authorization = 'Bearer ' + session.token;
    let r;
    try {
      r = await fetch(API + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', mode: 'cors' });
    } catch { const e = new Error('network'); e.code = 'network'; throw e; }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const e = new Error(j.error || 'server_error'); e.code = j.error || 'server_error'; e.data = j; e.status = r.status;
      if (e.code === 'signed_out' && auth) { localSignOut(); show('auth'); }
      throw e;
    }
    return j;
  }

  // ---------------------------------------------------------------- session
  function loadSession() { try { const s = JSON.parse(localStorage.getItem(STORE) || 'null'); return s && /^nat_[A-Za-z0-9_-]{43}$/.test(s.token) ? s : null; } catch { return null; } }
  function saveSession(token, username) { session = { token, username }; try { localStorage.setItem(STORE, JSON.stringify(session)); } catch {} }
  function localSignOut() { session = null; ME = null; try { localStorage.removeItem(STORE); } catch {} refreshChrome(); }

  // ---------------------------------------------------------------- drawing Nuddies from a saved combo
  const cache = new Map();
  function img(src) {
    if (cache.has(src)) return cache.get(src);
    const p = new Promise((res) => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
    cache.set(src, p);
    if (cache.size > 240) cache.delete(cache.keys().next().value);
    return p;
  }
  async function drawCombo(cv, combo, kind) {
    const cats = window.Atelier.cats();
    const ims = await Promise.all(cats.map((c) => {
      const f = combo[c.name];
      return f ? img(kind + '/' + c.name + '/' + f.replace(/\.png$/i, '.webp')) : null;
    }));
    const ctx = cv.getContext('2d'), S = cv.width;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, S, S);
    if (!combo.Background) {
      const g = ctx.createRadialGradient(S / 2, S * 0.42, 0, S / 2, S * 0.42, S * 0.75);
      g.addColorStop(0, '#1C1824'); g.addColorStop(1, '#0B0A0F'); ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    }
    ims.forEach((im) => { if (im) ctx.drawImage(im, 0, 0, S, S); });
  }
  // Paints a PFP into a box holding one <canvas> and one <img>.
  function paintPfp(box, pfp, kind, fallback) {
    const cv = box.querySelector('canvas'), im = box.querySelector('img'), letter = box.querySelector('.ac-letter');
    cv.hidden = im.hidden = true; if (letter) letter.hidden = true;
    if (pfp && pfp.kind === 'creation' && pfp.combo) { cv.hidden = false; drawCombo(cv, pfp.combo, kind); }
    else if (pfp && pfp.kind === 'held' && (pfp.thumb || pfp.image)) {
      im.hidden = false; im.referrerPolicy = 'no-referrer';
      im.onerror = () => { im.hidden = true; if (letter) { letter.hidden = false; letter.textContent = fallback || ''; } };
      im.src = kind === 'thumbs' ? (pfp.thumb || pfp.image) : (pfp.image || pfp.thumb);
    } else if (letter) { letter.hidden = false; letter.textContent = fallback || ''; }
  }

  // ---------------------------------------------------------------- markup (static; data goes in via textContent)
  const ICON_USER = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>';
  const CHECK = '<svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>';
  const PROMISE = (items) => '<ul class="ac-promise">' + items.map((t) => '<li>' + CHECK + '<span>' + t + '</span></li>').join('') + '</ul>';
  const CSS = `
  .ac-card{position:relative;text-align:left;width:min(460px,100%);padding:22px 20px 20px;}
  .ac-card [data-view]{display:flex;flex-direction:column;gap:12px;}
  .ac-x{position:absolute;top:6px;right:6px;width:44px;height:44px;font-size:22px;color:var(--mauve);border-radius:2px;}
  .ac-x:hover{color:var(--ivory);}
  .ac-logo{width:56px;height:56px;border-radius:14px;align-self:center;background:var(--ivory);}
  .ac-h{font-family:"Cinzel",serif;font-weight:700;letter-spacing:.12em;font-size:20px;margin:0;color:var(--gold-bright);text-transform:uppercase;}
  .ac-center{text-align:center;align-self:center;}
  .ac-sub{font-family:"Cormorant Garamond",serif;font-style:italic;font-size:18px;color:#C8C0D2;margin:-4px 0 4px;text-align:center;}
  .ac-p{font-size:14px;line-height:1.55;color:#C8C0D2;margin:0;}
  .ac-tabs{display:grid;grid-template-columns:1fr 1fr;padding:4px;border:1px solid var(--line);border-radius:4px;background:var(--void);}
  .ac-tabs button{min-height:44px;font-size:13px;letter-spacing:.08em;color:var(--mauve);border-radius:2px;}
  .ac-tabs button[aria-selected="true"]{background:rgba(201,163,78,.16);color:var(--gold-bright);}
  .ac-card form{display:flex;flex-direction:column;gap:6px;margin:0;}
  .ac-card label{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#B5ADBF;margin-top:6px;}
  .ac-card input[type=text],.ac-card input[type=password],.ac-card textarea{width:100%;min-height:48px;padding:0 14px;border:1px solid rgba(201,163,78,.4);
    border-radius:3px;background:var(--void);color:var(--ivory);font:16px "Jost",sans-serif;}
  .ac-card textarea{padding:12px 14px;min-height:96px;line-height:1.5;resize:vertical;}
  .ac-card input:focus,.ac-card textarea:focus{outline:2px solid var(--gold-bright);outline-offset:1px;border-color:transparent;}
  .ac-help{font-size:12px;color:#A79FB0;margin:0;line-height:1.45;}
  .ac-meter{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-top:4px;}
  .ac-meter i{height:4px;border-radius:2px;background:#3A3442;}
  .ac-meter i.on{background:var(--gold);}
  .ac-err{min-height:0;margin:4px 0 0;font-size:13px;color:#F0A49A;line-height:1.45;}
  .ac-err:empty{display:none;}
  .ac-wide{width:100%;min-height:50px;margin-top:6px;}
  .ac-link{align-self:center;min-height:44px;padding:0 10px;font-size:14px;color:var(--gold-bright);text-decoration:underline;text-underline-offset:3px;}
  .ac-back{align-self:flex-start;min-height:44px;font-size:14px;color:var(--gold-bright);padding:0 4px;}
  .ac-promise{list-style:none;margin:6px 0 0;padding:12px 14px;border:1px solid var(--line);border-radius:4px;background:var(--void);display:flex;flex-direction:column;gap:8px;}
  .ac-promise li{display:flex;gap:10px;align-items:center;font-size:13px;color:#C8C0D2;}
  .ac-promise svg{color:var(--gold-bright);flex:none;}
  .ac-words{list-style:none;margin:0;padding:14px;display:grid;grid-template-columns:1fr 1fr;gap:9px 16px;border:1px solid rgba(201,163,78,.45);border-radius:4px;background:var(--void);
    counter-reset:w;font-size:16px;user-select:all;-webkit-user-select:all;}
  .ac-words li{counter-increment:w;display:flex;gap:8px;}
  .ac-words li::before{content:counter(w);width:20px;text-align:right;color:var(--mauve);}
  .ac-row2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
  .ac-row2 .btn{min-height:46px;}
  .ac-warn{margin:0;padding:12px 14px;border:1px solid rgba(201,163,78,.3);border-radius:4px;background:rgba(201,163,78,.07);font-size:13px;line-height:1.5;color:#E9DDBE;}
  .ac-check{display:flex;align-items:center;gap:12px;min-height:44px;font-size:14px!important;letter-spacing:0!important;text-transform:none!important;color:var(--ivory)!important;cursor:pointer;}
  .ac-check input{width:22px;height:22px;accent-color:var(--gold);}
  .btn[disabled]{opacity:.4;cursor:default;}
  .ac-prof{display:flex;align-items:center;gap:16px;padding-right:36px;}
  .ac-pfp{position:relative;width:104px;height:104px;flex:none;border-radius:50%;overflow:hidden;border:2px solid var(--gold-bright);
    box-shadow:0 0 0 5px rgba(201,163,78,.14);background:var(--void);display:grid;place-items:center;}
  .ac-pfp canvas,.ac-pfp img{width:100%;height:100%;object-fit:cover;display:block;}
  .ac-letter{font-family:"Cinzel",serif;font-size:38px;color:var(--gold);text-transform:uppercase;}
  .ac-name{font-family:"Cinzel",serif;font-weight:700;font-size:19px;letter-spacing:.04em;word-break:break-all;}
  .ac-meta{font-size:13px;color:#A79FB0;margin-top:4px;}
  .ac-holder{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--gold-bright);margin-top:6px;}
  .ac-sec{display:flex;justify-content:space-between;align-items:baseline;margin-top:8px;}
  .ac-sec h3{margin:0;font-family:"Cinzel",serif;font-size:12px;letter-spacing:.18em;color:var(--gold-bright);font-weight:600;}
  .ac-sec span{font-size:12px;color:#A79FB0;}
  .ac-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;}
  .ac-tile{position:relative;display:flex;flex-direction:column;gap:6px;min-width:0;}
  .ac-tile-img{position:relative;padding:0;aspect-ratio:1;border:1px solid var(--line);border-radius:4px;overflow:hidden;background:var(--void);}
  .ac-tile-img:hover{border-color:var(--gold);}
  .ac-tile-img canvas,.ac-tile-img img{width:100%;height:100%;object-fit:cover;display:block;}
  .ac-tile.is-pfp .ac-tile-img{border:2px solid var(--gold-bright);}
  .ac-tag{position:absolute;top:5px;left:5px;padding:2px 7px;border-radius:999px;background:var(--gold);color:#231a08;font-size:9px;font-weight:600;letter-spacing:.1em;}
  .ac-tile-name{position:absolute;bottom:5px;left:5px;right:5px;padding:2px 6px;border-radius:3px;background:rgba(11,10,15,.82);font-size:10px;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:left;}
  .ac-tile-act{display:flex;}
  .ac-tile-act button{flex:1;min-height:44px;padding:0 4px;border:1px solid rgba(201,163,78,.45);border-radius:3px;font-size:11px;letter-spacing:.04em;color:var(--ivory);white-space:nowrap;}
  .ac-tile-act button:hover{border-color:var(--gold);}
  .ac-del{position:absolute;top:0;right:0;width:44px;height:44px;display:grid;place-items:center;}
  .ac-del span{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:rgba(11,10,15,.85);border:1px solid rgba(232,120,110,.5);color:#F0A49A;font-size:12px;line-height:1;}
  .ac-del:hover span{background:#2a1416;}
  .ac-noimg{width:100%;height:100%;display:grid;place-items:center;color:var(--gold);font-family:"Cinzel",serif;font-size:13px;letter-spacing:.2em;}
  .ac-tile.is-pfp .ac-setpfp{background:rgba(201,163,78,.12);color:#C8B37E;}
  .ac-empty{font-size:13px;color:#A79FB0;margin:0;line-height:1.5;}
  .ac-more{min-height:44px;}
  .ac-settings{border-top:1px solid var(--line);margin-top:8px;padding-top:6px;}
  .ac-settings summary{min-height:44px;display:flex;align-items:center;cursor:pointer;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#C8C0D2;}
  .ac-settings form{margin-top:6px;}
  .ac-settings h4{margin:14px 0 0;font-size:13px;font-weight:500;color:var(--ivory);}
  .ac-danger{color:#F0A49A!important;border-color:rgba(232,120,110,.45)!important;background:transparent!important;}
  .ac-msg{margin:0;padding:12px;border:1px dashed rgba(201,163,78,.4);border-radius:4px;background:var(--void);font:12px/1.6 ui-monospace,Menlo,monospace;color:#E9DDBE;white-space:pre-wrap;word-break:break-word;}
  .ac-wallet{display:flex;justify-content:space-between;align-items:center;min-height:54px;padding:0 16px;border:1px solid rgba(201,163,78,.5);border-radius:4px;background:var(--void);font-size:15px;width:100%;}
  .ac-wallet:hover{border-color:var(--gold-bright);}
  .ac-busy{position:absolute;inset:0;z-index:2;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:rgba(20,17,25,.92);border-radius:4px;
    font-size:14px;color:var(--ivory);text-align:center;padding:24px;}
  .ac-spin{width:34px;height:34px;border-radius:50%;border:2px solid rgba(201,163,78,.25);border-top-color:var(--gold-bright);animation:acspin .9s linear infinite;}
  @keyframes acspin{to{transform:rotate(360deg);}}
  .acct-toast{position:fixed;left:50%;top:calc(16px + env(safe-area-inset-top));transform:translateX(-50%);z-index:120;max-width:min(92vw,420px);
    padding:12px 18px;border:1px solid var(--gold);border-radius:4px;background:var(--obsidian);color:var(--ivory);font-size:14px;box-shadow:0 10px 30px rgba(0,0,0,.5);}
  `;
  const HTML = `
  <div class="sheet ac-sheet" id="acSheet" hidden role="dialog" aria-modal="true" aria-label="Your Atelier account">
    <div class="sheet-card ac-card" id="acCard">
      <button class="ac-x" id="acClose" type="button" aria-label="Close">×</button>

      <section data-view="auth" hidden>
        <img class="ac-logo" src="icons/icon-192.png" alt="" width="56" height="56">
        <h2 class="ac-h ac-center">Enter the Atelier</h2>
        <p class="ac-sub">Keep your creations. Wear your goddess.</p>
        <div class="ac-tabs" role="tablist" aria-label="Account">
          <button type="button" role="tab" id="acTabIn" aria-selected="true">Sign in</button>
          <button type="button" role="tab" id="acTabUp" aria-selected="false">Create account</button>
        </div>
        <p class="ac-help" id="acWhy" hidden></p>
        <form id="acAuthForm" novalidate>
          <label for="acUser">Username</label>
          <input id="acUser" type="text" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="20" required>
          <p class="ac-help" data-up>3–20 letters, numbers or _. It's public on your profile — don't use your real name.</p>
          <label for="acPass">Password</label>
          <input id="acPass" type="password" autocomplete="current-password" maxlength="128" required>
          <div class="ac-meter" data-up aria-hidden="true"><i></i><i></i><i></i><i></i></div>
          <p class="ac-help" data-up id="acPassHelp">At least 12 characters. A few random words works well.</p>
          <label for="acPass2" data-up>Confirm password</label>
          <input id="acPass2" type="password" autocomplete="new-password" maxlength="128" data-up>
          <p class="ac-err" id="acAuthErr" role="alert"></p>
          <button class="btn btn--gold ac-wide" id="acAuthGo" type="submit">Sign in</button>
        </form>
        <button class="ac-link" id="acForgot" type="button">Forgot password?</button>
        ${PROMISE(['No email. No phone number.', 'No trackers, no ads, no IP logs.', 'Delete your account any time, instantly.'])}
      </section>

      <section data-view="kit" hidden>
        <h2 class="ac-h">Your recovery kit</h2>
        <p class="ac-p">With no email on file, these 12 words are the only way back in if you forget your password. They were made on this device; we only ever keep a one-way scramble of them.</p>
        <ol class="ac-words" id="acWords" aria-label="Your 12 recovery words"></ol>
        <div class="ac-row2"><button class="btn" id="acCopy" type="button">Copy words</button><button class="btn" id="acDl" type="button">Download kit</button></div>
        <p class="ac-warn">Shown once. Write them down or keep them offline. Anyone with these words and your username can reset your password.</p>
        <label class="ac-check"><input type="checkbox" id="acSaved"> I saved my 12 words somewhere safe</label>
        <button class="btn btn--gold ac-wide" id="acKitDone" type="button" disabled>Enter the Atelier</button>
      </section>

      <section data-view="recover" hidden>
        <button class="ac-back" type="button" data-go="auth">‹ Back to sign in</button>
        <h2 class="ac-h">Reset password</h2>
        <p class="ac-p">Enter your username and the 12 words from your recovery kit. No inbox needed.</p>
        <form id="acRecForm" novalidate>
          <label for="acRecUser">Username</label>
          <input id="acRecUser" type="text" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="20" required>
          <label for="acRecWords">Recovery words</label>
          <textarea id="acRecWords" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" required></textarea>
          <p class="ac-help" id="acRecCount">0 of 12 words</p>
          <label for="acRecPass">New password</label>
          <input id="acRecPass" type="password" autocomplete="new-password" maxlength="128" required>
          <label for="acRecPass2">Confirm new password</label>
          <input id="acRecPass2" type="password" autocomplete="new-password" maxlength="128" required>
          <p class="ac-err" id="acRecErr" role="alert"></p>
          <button class="btn btn--gold ac-wide" type="submit">Reset &amp; sign in</button>
        </form>
        <p class="ac-help">After a reset you get a fresh set of 12 words (the old ones stop working) and every other device is signed out.</p>
      </section>

      <section data-view="profile" hidden>
        <div class="ac-prof">
          <div class="ac-pfp" id="acPfpBig"><canvas width="320" height="320" hidden></canvas><img alt="Your PFP" hidden><span class="ac-letter" hidden></span></div>
          <div style="min-width:0">
            <div class="ac-name" id="acName"></div>
            <div class="ac-meta" id="acMeta"></div>
            <div class="ac-holder" id="acHolder" hidden><svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v6c0 4-3 7.5-7 9-4-1.5-7-5-7-9V6z"/><path d="M9 12l2 2 4-4"/></svg>Verified holder</div>
          </div>
        </div>
        <div class="ac-sec"><h3>My creations</h3><span id="acCount"></span></div>
        <div class="ac-grid" id="acCreations"></div>
        <p class="ac-empty" id="acNoCreations" hidden>Nothing saved yet. Build a goddess and tap “Save to creations”.</p>
        <button class="btn ac-more" id="acMore" type="button" hidden>Show more</button>
        <div id="acHoldBox" hidden style="display:flex;flex-direction:column;gap:12px">
          <div class="ac-sec"><h3>My holdings</h3><span id="acWalletShort"></span></div>
          <div class="ac-grid" id="acHoldings"></div>
          <p class="ac-empty" id="acHoldMsg" hidden></p>
          <button class="btn ac-wide" id="acLink" type="button" hidden>Verify my Nuddies</button>
          <button class="ac-link" id="acUnlink" type="button" hidden>Unlink wallet</button>
        </div>
        <details class="ac-settings" id="acSettings">
          <summary>Account settings</summary>
          <h4>Change password</h4>
          <form id="acPwForm" novalidate>
            <label for="acPwOld">Current password</label>
            <input id="acPwOld" type="password" autocomplete="current-password" maxlength="128" required>
            <label for="acPwNew">New password</label>
            <input id="acPwNew" type="password" autocomplete="new-password" maxlength="128" required>
            <label for="acPwNew2">Confirm new password</label>
            <input id="acPwNew2" type="password" autocomplete="new-password" maxlength="128" required>
            <p class="ac-err" id="acPwErr" role="alert"></p>
            <button class="btn ac-wide" type="submit">Change password</button>
          </form>
          <button class="btn ac-wide" id="acOut" type="button" style="margin-top:16px">Sign out</button>
          <h4>Delete account</h4>
          <p class="ac-help">Removes your account, creations and linked wallet for good. This can't be undone.</p>
          <form id="acDelForm" novalidate>
            <label for="acDelPass">Password</label>
            <input id="acDelPass" type="password" autocomplete="current-password" maxlength="128" required>
            <p class="ac-err" id="acDelErr" role="alert"></p>
            <button class="btn ac-wide ac-danger" type="submit">Delete my account</button>
          </form>
        </details>
      </section>

      <section data-view="wallet" hidden>
        <button class="ac-back" type="button" data-go="profile">‹ Profile</button>
        <h2 class="ac-h">Show your Nuddies</h2>
        <p class="ac-p">Prove you hold Nuddies by signing a short message with your wallet. Your Nuddies then appear on your profile and any of them can be your PFP. Optional.</p>
        <div id="acWallets" style="display:flex;flex-direction:column;gap:10px"></div>
        <p class="ac-empty" id="acNoWallet" hidden>No Solana wallet found in this browser. On a phone, open atelier.nuddiesnwo.xyz inside your wallet app's browser (Phantom, Solflare or Backpack) and come back here.</p>
        <pre class="ac-msg" id="acMsg" hidden></pre>
        <p class="ac-err" id="acWalletErr" role="alert"></p>
        ${PROMISE(['No transaction, no fees, no approvals.', 'We can never move or see your funds.', 'Your wallet address is already public on-chain. Unlink any time.'])}
      </section>

      <div class="ac-busy" id="acBusy" hidden><div class="ac-spin"></div><div id="acBusyText">Working…</div></div>
    </div>
  </div>
  <div class="acct-toast" id="acToast" role="status" aria-live="polite" hidden></div>`;

  // ---------------------------------------------------------------- UI helpers
  let view = 'auth', mode = 'in', toastT = 0, shown = 0;
  function show(v) {
    view = v;
    document.querySelectorAll('#acCard [data-view]').forEach((s) => { s.hidden = s.dataset.view !== v; });
    $('acCard').scrollTop = 0;
    const first = document.querySelector(`#acCard [data-view="${v}"] input:not([type=checkbox])`);
    if (first && !$('acSheet').hidden && matchMedia('(pointer: fine)').matches) first.focus();
  }
  function open(v) { $('acSheet').hidden = false; document.body.style.overflow = 'hidden'; show(v); }
  function close(force) {
    if (!force && view === 'kit' && !kitConfirmed &&
      !confirm("You haven't confirmed you saved your 12 recovery words. Without them a forgotten password can't be recovered. Close anyway?")) return;
    if (view === 'kit') kitConfirmed = true;
    pendingWords = null;
    $('acSheet').hidden = true; document.body.style.overflow = '';
  }
  function busy(text) { $('acBusy').hidden = !text; $('acBusyText').textContent = text || ''; }
  function toast(t) {
    const el = $('acToast'); el.textContent = t; el.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 3200);
  }
  function setErr(id, e) { $(id).textContent = e ? (typeof e === 'string' ? e : message(e)) : ''; }
  function normUser(u) { return String(u || '').trim().toLowerCase(); }
  function checkUser(u) { return /^[a-z0-9_]{3,20}$/.test(u) ? '' : MSG.bad_username; }
  function checkPass(p, u) {
    if (p.length < 12) return 'Passwords need at least 12 characters.';
    if (p.length > 128) return 'Passwords can be up to 128 characters.';
    if (u && p.toLowerCase().includes(u)) return "Your password can't contain your username.";
    return '';
  }
  function strength(p) {
    let s = 0;
    if (p.length >= 12) s++;
    if (p.length >= 16) s++;
    const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(p)).length;
    if (classes >= 3 || p.length >= 20) s++;
    if (p.length >= 12 && !/^(.)\1+$/.test(p) && !/password|123456|qwerty|nuddies/i.test(p)) s++;
    return p.length < 12 ? Math.min(s, 1) : s;
  }
  function parseWords(t) { return String(t || '').toLowerCase().split(/[\s,.;]+/).filter(Boolean).map((w) => w.replace(/^\d+[).:-]?/, '')).filter(Boolean); }
  function shortAddr(a) { return a ? a.slice(0, 4) + '…' + a.slice(-4) : ''; }

  // ---------------------------------------------------------------- chrome (header chip + stage buttons)
  function refreshChrome() {
    const chip = $('acctChip'), row = $('acctRow');
    if (!chip) return;
    const on = !!HEALTH;
    chip.hidden = !on; if (row) row.hidden = !on;
    if (!on) return;
    const label = $('acctLabel'), av = $('acctAv');
    if (session && ME) {
      label.textContent = ME.username; chip.setAttribute('aria-label', 'Your profile, ' + ME.username);
      chip.classList.add('signed-in');
      paintPfp(av, ME.pfp, 'thumbs', ME.username.slice(0, 1));
    } else {
      label.textContent = 'Sign in'; chip.setAttribute('aria-label', 'Sign in or create an account');
      chip.classList.remove('signed-in');
      av.querySelector('canvas').hidden = true; av.querySelector('img').hidden = true;
      const l = av.querySelector('.ac-letter'); l.hidden = false; l.innerHTML = ICON_USER;
    }
  }

  // ---------------------------------------------------------------- auth view
  function setMode(m) {
    mode = m;
    $('acTabIn').setAttribute('aria-selected', m === 'in'); $('acTabUp').setAttribute('aria-selected', m === 'up');
    document.querySelectorAll('#acAuthForm [data-up]').forEach((el) => { el.hidden = m !== 'up'; });
    $('acPass').autocomplete = m === 'up' ? 'new-password' : 'current-password';
    $('acAuthGo').textContent = m === 'up' ? 'Create account' : 'Sign in';
    $('acForgot').hidden = m === 'up';
    setErr('acAuthErr');
  }
  function openAuth(why) {
    setMode(why ? 'up' : 'in');
    $('acWhy').hidden = !why; $('acWhy').textContent = why || '';
    open('auth');
  }
  function paintMeter() {
    const s = strength($('acPass').value);
    document.querySelectorAll('#acAuthForm .ac-meter i').forEach((i, k) => i.classList.toggle('on', k < s));
    $('acPassHelp').textContent = $('acPass').value ? ['Too short — 12 characters minimum.', 'Okay.', 'Good.', 'Strong.', 'Very strong.'][s] : 'At least 12 characters. A few random words works well.';
  }
  async function getPowSolution() {
    const ch = await api('GET', '/v1/pow', null, false);
    return { challenge: ch.challenge, counter: await solvePow(ch.challenge, ch.bits) };
  }
  async function submitAuth(ev) {
    ev.preventDefault();
    const u = normUser($('acUser').value), p = $('acPass').value;
    let bad = checkUser(u);
    if (!bad && mode === 'up') bad = checkPass(p, u) || (p !== $('acPass2').value ? "Passwords don't match." : '');
    if (!bad && mode === 'in' && !p) bad = 'Enter your password.';
    if (bad) return setErr('acAuthErr', bad);
    setErr('acAuthErr');
    try {
      busy('Securing your password on this device…');
      const authKey = await deriveAuth(u, p);
      if (mode === 'in') {
        busy('Signing in…');
        const r = await api('POST', '/v1/login', { username: u, authKey }, false);
        saveSession(r.token, r.me.username); ME = r.me; refreshChrome();
        $('acPass').value = ''; busy(); close(true); toast('Welcome back, ' + ME.username);
      } else {
        const words = newWords();
        const recoveryKey = await deriveRec(u, words);
        busy('Creating your account…');
        let r;
        for (let attempt = 0; ; attempt++) {
          try { r = await api('POST', '/v1/signup', { username: u, authKey, recoveryKey, pow: await getPowSolution() }, false); break; }
          catch (e) { if (attempt < 2 && /^pow_/.test(e.code)) continue; throw e; }
        }
        saveSession(r.token, r.me.username); ME = r.me; refreshChrome();
        $('acPass').value = $('acPass2').value = '';
        busy(); showKit(u, words);
      }
    } catch (e) { busy(); setErr('acAuthErr', e); }
  }

  // ---------------------------------------------------------------- recovery kit
  function showKit(username, words) {
    pendingWords = { username, words }; kitConfirmed = false;
    const ol = $('acWords'); ol.textContent = '';
    words.forEach((w) => { const li = document.createElement('li'); li.textContent = w; ol.appendChild(li); });
    $('acSaved').checked = false; $('acKitDone').disabled = true; $('acCopy').textContent = 'Copy words';
    open('kit');
  }
  function kitText() {
    const { username, words } = pendingWords;
    return 'Nuddies Atelier — recovery kit\n\nUsername: ' + username + '\n\n' + words.map((w, i) => (i + 1) + '. ' + w).join('\n') +
      '\n\nKeep this private and offline. Anyone with these words and your username can reset your password.\nhttps://atelier.nuddiesnwo.xyz\n';
  }

  // ---------------------------------------------------------------- recover view
  function paintRecCount() {
    const w = parseWords($('acRecWords').value), unknown = w.find((x) => !WORDSET.has(x));
    $('acRecCount').textContent = unknown ? `“${unknown}” isn't a recovery word — check the spelling.` : `${Math.min(w.length, 99)} of 12 words`;
  }
  async function submitRecover(ev) {
    ev.preventDefault();
    const u = normUser($('acRecUser').value), words = parseWords($('acRecWords').value), p = $('acRecPass').value;
    const unknown = words.find((x) => !WORDSET.has(x));
    const bad = checkUser(u) || (unknown ? `“${unknown}” isn't a recovery word — check the spelling.` : '') ||
      (words.length !== 12 ? 'Enter all 12 recovery words, in order.' : '') || checkPass(p, u) ||
      (p !== $('acRecPass2').value ? "Passwords don't match." : '');
    if (bad) return setErr('acRecErr', bad);
    setErr('acRecErr');
    try {
      busy('Checking your recovery words…');
      const recoveryKey = await deriveRec(u, words);
      busy('Securing your new password on this device…');
      const newAuthKey = await deriveAuth(u, p);
      const fresh = newWords();
      const newRecoveryKey = await deriveRec(u, fresh);
      busy('Resetting…');
      const r = await api('POST', '/v1/recover', { username: u, recoveryKey, newAuthKey, newRecoveryKey }, false);
      saveSession(r.token, r.me.username); ME = r.me; refreshChrome();
      ['acRecWords', 'acRecPass', 'acRecPass2'].forEach((id) => { $(id).value = ''; });
      busy(); showKit(u, fresh); toast('Password reset. Save your new recovery words.');
    } catch (e) { busy(); setErr('acRecErr', e); }
  }

  // ---------------------------------------------------------------- profile
  let creations = [], holdings = [];
  async function openProfile() {
    if (!session) return openAuth();
    open('profile');
    paintProfileHead();
    loadCreations();
    loadHoldings();
    try { ME = await api('GET', '/v1/me'); paintProfileHead(); refreshChrome(); } catch {}
  }
  function paintProfileHead() {
    if (!ME) return;
    $('acName').textContent = ME.username;
    $('acMeta').textContent = ME.creations + (ME.creations === 1 ? ' creation' : ' creations') + (ME.since ? ' · since ' + ME.since.slice(0, 7) : '');
    $('acHolder').hidden = !ME.wallet;
    paintPfp($('acPfpBig'), ME.pfp, 'layers', ME.username.slice(0, 1));
    $('acHoldBox').hidden = !(HEALTH && HEALTH.holdings);
  }
  async function loadCreations() {
    $('acCreations').textContent = ''; $('acCount').textContent = 'Loading…'; $('acNoCreations').hidden = true; $('acMore').hidden = true;
    try {
      const r = await api('GET', '/v1/creations');
      creations = r.items; shown = 0;
      $('acCount').textContent = creations.length + ' / ' + r.max;
      $('acNoCreations').hidden = creations.length > 0;
      renderMoreCreations();
    } catch (e) { $('acCount').textContent = ''; $('acNoCreations').hidden = false; $('acNoCreations').textContent = message(e); }
  }
  function renderMoreCreations() {
    const box = $('acCreations'), next = creations.slice(shown, shown + 30);
    next.forEach((c) => box.appendChild(creationTile(c)));
    shown += next.length;
    $('acMore').hidden = shown >= creations.length;
  }
  function isPfp(kind, key) { const p = ME && ME.pfp; return !!p && p.kind === kind && (kind === 'creation' ? p.id === key : p.mint === key); }
  function tileShell(isP, labelOpen) {
    const t = document.createElement('div'); t.className = 'ac-tile' + (isP ? ' is-pfp' : '');
    const b = document.createElement('button'); b.type = 'button'; b.className = 'ac-tile-img'; b.setAttribute('aria-label', labelOpen);
    t.appendChild(b);
    if (isP) { const tag = document.createElement('span'); tag.className = 'ac-tag'; tag.textContent = 'PFP'; b.appendChild(tag); }
    const act = document.createElement('div'); act.className = 'ac-tile-act'; t.appendChild(act);
    const set = document.createElement('button'); set.type = 'button'; set.className = 'ac-setpfp';
    set.textContent = isP ? 'Current PFP' : 'Set as PFP'; set.disabled = isP; act.appendChild(set);
    return { t, b, act, set };
  }
  function creationTile(c) {
    const { t, b, set } = tileShell(isPfp('creation', c.id), 'Open this creation in the Atelier');
    const cv = document.createElement('canvas'); cv.width = cv.height = 160; b.prepend(cv);
    drawCombo(cv, c.combo, 'thumbs');
    b.onclick = () => {
      const missing = window.Atelier.apply(c.combo);
      close(true);
      toast(missing ? `Loaded. ${missing} trait${missing > 1 ? 's are' : ' is'} no longer in the Atelier.` : 'Loaded into the Atelier.');
    };
    set.onclick = () => setPfp({ kind: 'creation', id: c.id });
    const del = document.createElement('button'); del.type = 'button'; del.className = 'ac-del';
    const x = document.createElement('span'); x.textContent = '✕'; x.setAttribute('aria-hidden', 'true'); del.appendChild(x);
    del.setAttribute('aria-label', 'Delete this creation');
    del.onclick = async () => {
      if (!confirm('Delete this creation?')) return;
      try {
        await api('DELETE', '/v1/creations/' + c.id);
        creations = creations.filter((x) => x.id !== c.id); t.remove();
        if (ME) { ME.creations = Math.max(0, ME.creations - 1); if (isPfp('creation', c.id)) ME.pfp = null; }
        $('acCount').textContent = creations.length + ' / 300'; $('acNoCreations').hidden = creations.length > 0;
        paintProfileHead(); refreshChrome();
      } catch (e) { toast(message(e)); }
    };
    t.appendChild(del);
    return t;
  }
  async function setPfp(body) {
    try {
      busy('Setting your PFP…');
      const r = await api('PUT', '/v1/pfp', body);
      ME.pfp = r.pfp; busy(); refreshChrome();
      if (!$('acSheet').hidden && view === 'profile') { paintProfileHead(); repaintTiles(); }
      toast('PFP updated.');
    } catch (e) { busy(); toast(message(e)); }
  }
  function repaintTiles() {
    $('acCreations').textContent = ''; const n = shown; shown = 0;
    const next = creations.slice(0, Math.max(n, 30)); next.forEach((c) => $('acCreations').appendChild(creationTile(c))); shown = next.length;
    renderHoldings();
  }
  async function loadHoldings() {
    holdings = [];
    $('acHoldings').textContent = ''; $('acHoldMsg').hidden = true; $('acLink').hidden = true; $('acUnlink').hidden = true; $('acWalletShort').textContent = '';
    if (!(HEALTH && HEALTH.holdings) || !ME) return;
    if (!ME.wallet) {
      $('acHoldMsg').hidden = false; $('acHoldMsg').textContent = 'Hold Nuddies? Verify your wallet and wear one as your PFP.';
      $('acLink').hidden = false; return;
    }
    $('acWalletShort').textContent = 'Wallet ' + shortAddr(ME.wallet); $('acUnlink').hidden = false;
    $('acHoldMsg').hidden = false; $('acHoldMsg').textContent = 'Loading your Nuddies…';
    try {
      const r = await api('GET', '/v1/holdings');
      holdings = r.items;
      if (r.pfpCleared && ME.pfp) { ME.pfp = null; paintProfileHead(); refreshChrome(); }
      renderHoldings();
    } catch (e) { $('acHoldMsg').textContent = message(e); }
  }
  function renderHoldings() {
    const box = $('acHoldings'); box.textContent = '';
    if (!ME || !ME.wallet) return;
    $('acHoldMsg').hidden = holdings.length > 0;
    if (!holdings.length) $('acHoldMsg').textContent = 'No Nuddies in this wallet right now.';
    holdings.forEach((h) => {
      const { t, b, set } = tileShell(isPfp('held', h.mint), h.name);
      const im = document.createElement('img'); im.alt = h.name; im.loading = 'lazy'; im.decoding = 'async'; im.referrerPolicy = 'no-referrer';
      if (h.thumb || h.image) im.src = h.thumb || h.image;
      im.onerror = () => {
        if (h.image && im.src !== h.image) { im.src = h.image; return; }
        im.remove(); const ph = document.createElement('span'); ph.className = 'ac-noimg'; ph.textContent = 'NU'; b.prepend(ph);
      };
      b.prepend(im);
      const nm = document.createElement('span'); nm.className = 'ac-tile-name'; nm.textContent = h.name; b.appendChild(nm);
      b.onclick = () => { if (h.image) window.open(h.image, '_blank', 'noopener,noreferrer'); };
      set.onclick = () => setPfp({ kind: 'held', mint: h.mint });
      box.appendChild(t);
    });
  }

  // ---------------------------------------------------------------- wallet
  function providers() {
    const w = window, list = [];
    const add = (name, p) => { if (p && typeof p.signMessage === 'function' && typeof p.connect === 'function' && !list.some((x) => x.p === p)) list.push({ name, p }); };
    add('Phantom', w.phantom && w.phantom.solana);
    add('Solflare', w.solflare);
    add('Backpack', w.backpack && (w.backpack.solana || w.backpack));
    if (!list.length) add('Solana wallet', w.solana);
    return list;
  }
  function openWallet() {
    open('wallet'); setErr('acWalletErr'); $('acMsg').hidden = true;
    const box = $('acWallets'); box.textContent = '';
    const list = providers();
    $('acNoWallet').hidden = list.length > 0;
    list.forEach(({ name, p }) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'ac-wallet';
      const s = document.createElement('span'); s.textContent = name; b.appendChild(s);
      b.insertAdjacentHTML('beforeend', '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E7C56A" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>');
      b.onclick = () => linkWallet(name, p);
      box.appendChild(b);
    });
  }
  async function linkWallet(name, p) {
    setErr('acWalletErr');
    try {
      busy('Connecting to ' + name + '…');
      const res = await p.connect();
      const pk = (res && res.publicKey) || p.publicKey;
      const address = pk && (typeof pk.toBase58 === 'function' ? pk.toBase58() : String(pk));
      if (!address) throw Object.assign(new Error('x'), { code: 'bad_signature' });
      const ch = await api('GET', '/v1/wallet/challenge');
      $('acMsg').textContent = ch.message; $('acMsg').hidden = false;
      busy('Approve the message in ' + name + ' — it is not a transaction.');
      const signed = await p.signMessage(enc.encode(ch.message), 'utf8');
      const sig = signed && signed.signature ? signed.signature : signed;
      busy('Verifying…');
      ME = await api('POST', '/v1/wallet', { address, signature: b64(new Uint8Array(sig)), challenge: ch.challenge });
      busy(); refreshChrome(); toast('Wallet verified. Your Nuddies are on your profile.');
      openProfile();
    } catch (e) {
      busy();
      setErr('acWalletErr', e && e.code ? e : (e && /reject|cancel|denied|declined/i.test(String(e.message)) ? 'Cancelled in your wallet.' : "Couldn't talk to your wallet. Try again."));
    }
  }

  // ---------------------------------------------------------------- stage buttons
  async function saveCreation(asPfp) {
    if (!session) return openAuth(asPfp ? 'Create a free account to wear this Nuddie as your PFP.' : 'Create a free account to keep your creations.');
    try {
      const r = await api('POST', '/v1/creations', { combo: window.Atelier.combo() });
      if (!r.existed && ME) ME.creations++;
      if (asPfp) {
        const p = await api('PUT', '/v1/pfp', { kind: 'creation', id: r.id });
        ME.pfp = p.pfp; refreshChrome(); toast('This Nuddie is now your PFP.');
      } else toast(r.existed ? 'Already in your creations.' : 'Saved to your creations.');
    } catch (e) { toast(message(e)); }
  }

  // ---------------------------------------------------------------- wire up
  function mount() {
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    document.body.insertAdjacentHTML('beforeend', HTML);
    $('acClose').onclick = () => close();
    $('acSheet').addEventListener('click', (e) => { if (e.target.id === 'acSheet') close(); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('acSheet').hidden) close(); });
    document.querySelectorAll('#acCard [data-go]').forEach((b) => { b.onclick = () => (b.dataset.go === 'profile' ? openProfile() : show(b.dataset.go)); });
    $('acTabIn').onclick = () => setMode('in'); $('acTabUp').onclick = () => setMode('up');
    $('acPass').addEventListener('input', paintMeter);
    $('acAuthForm').addEventListener('submit', submitAuth);
    $('acForgot').onclick = () => { $('acRecUser').value = normUser($('acUser').value); setErr('acRecErr'); paintRecCount(); show('recover'); };
    $('acRecWords').addEventListener('input', paintRecCount);
    $('acRecForm').addEventListener('submit', submitRecover);
    $('acSaved').onchange = () => { $('acKitDone').disabled = !$('acSaved').checked; };
    $('acKitDone').onclick = () => { kitConfirmed = true; pendingWords = null; close(true); toast('Welcome to the Atelier, ' + (ME ? ME.username : '') + '.'); };
    $('acCopy').onclick = async () => {
      try { await navigator.clipboard.writeText(pendingWords.words.join(' ')); $('acCopy').textContent = 'Copied'; }
      catch { $('acCopy').textContent = 'Select the words above'; }
    };
    $('acDl').onclick = () => {
      const url = URL.createObjectURL(new Blob([kitText()], { type: 'text/plain' }));
      const a = document.createElement('a'); a.href = url; a.download = 'nuddies-recovery-' + pendingWords.username + '.txt';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
    };
    $('acMore').onclick = renderMoreCreations;
    $('acLink').onclick = openWallet;
    $('acUnlink').onclick = async () => {
      if (!confirm('Unlink this wallet? Your Nuddies will leave your profile.')) return;
      try { ME = await api('DELETE', '/v1/wallet'); refreshChrome(); openProfile(); } catch (e) { toast(message(e)); }
    };
    $('acOut').onclick = async () => { try { await api('POST', '/v1/logout', {}); } catch {} localSignOut(); close(true); toast('Signed out.'); };
    $('acPwForm').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const old = $('acPwOld').value, nw = $('acPwNew').value;
      const bad = (!old ? 'Enter your current password.' : '') || checkPass(nw, ME.username) || (nw !== $('acPwNew2').value ? "Passwords don't match." : '');
      if (bad) return setErr('acPwErr', bad);
      setErr('acPwErr');
      try {
        busy('Securing your passwords on this device…');
        const authKey = await deriveAuth(ME.username, old), newAuthKey = await deriveAuth(ME.username, nw);
        await api('POST', '/v1/password', { authKey, newAuthKey });
        ['acPwOld', 'acPwNew', 'acPwNew2'].forEach((id) => { $(id).value = ''; });
        busy(); toast('Password changed. Other devices were signed out.');
      } catch (e) { busy(); setErr('acPwErr', e); }
    });
    $('acDelForm').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const pw = $('acDelPass').value;
      if (!pw) return setErr('acDelErr', 'Enter your password to confirm.');
      if (!confirm('Delete your account, creations and linked wallet for good?')) return;
      setErr('acDelErr');
      try {
        busy('Deleting…');
        await api('POST', '/v1/account/delete', { authKey: await deriveAuth(ME.username, pw) });
        $('acDelPass').value = ''; busy(); localSignOut(); close(true); toast('Your account is gone. Nothing of it remains.');
      } catch (e) { busy(); setErr('acDelErr', e); }
    });
    $('acctChip').onclick = () => (session ? openProfile() : openAuth());
    const sp = $('acSetPfp'), sv = $('acSaveCreation');
    if (sp) sp.onclick = () => saveCreation(true);
    if (sv) sv.onclick = () => saveCreation(false);
  }

  async function start() {
    if (!window.crypto || !crypto.subtle || !window.fetch) return;
    try {
      const c = await (await fetch('api-config.json', { cache: 'no-cache' })).json();
      API = typeof c.api === 'string' ? c.api.replace(/\/+$/, '') : '';
    } catch { API = ''; }
    if (!/^https:\/\/[a-z0-9.-]+$|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(API)) return;   // accounts not switched on
    try {
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 6000);
      const r = await fetch(API + '/v1/health', { cache: 'no-store', credentials: 'omit', signal: ctl.signal, referrerPolicy: 'no-referrer' });
      clearTimeout(t);
      const h = await r.json();
      if (!h.configured) return;
      HEALTH = h;
    } catch { return; }
    mount();
    session = loadSession();
    refreshChrome();
    if (session) {
      try { ME = await api('GET', '/v1/me'); } catch (e) { if (e.code !== 'signed_out') ME = { username: session.username, pfp: null, creations: 0 }; }
      refreshChrome();
    }
  }
  const go = () => { start().catch(() => {}); };
  if (window.Atelier && window.Atelier.ready) go(); else addEventListener('atelier:ready', go, { once: true });
})();
