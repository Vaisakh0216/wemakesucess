/**
 * Resume sheet styles. Shared by the live preview and the server-side PDF render,
 * so the downloaded PDF matches the preview exactly.
 * ATS rules for every template: single column, real text, standard headings,
 * no tables, no images, no text in page headers or footers.
 */
export const RESUME_CSS = `.sheet{width:794px;min-height:1123px;background:#fff;color:#1b1b1b;padding:53px 57px;position:relative;transform-origin:top left}
.r{--rc:#1f3a68;font-size:calc(10.5pt*var(--fs,1));line-height:1.38}
.r.f-sans{font-family:"Source Sans 3",Arial,sans-serif}
.r.f-serif{font-family:"Source Serif 4",Georgia,"Times New Roman",serif}
.r.f-plex{font-family:"IBM Plex Sans",Helvetica,Arial,sans-serif}
.r h1{margin:0;font-size:calc(24pt*var(--fs,1));line-height:1.1;font-weight:700}
.r .headline{margin:3px 0 0;font-size:calc(11.5pt*var(--fs,1));font-weight:600}
.r .contact{margin:6px 0 0;font-size:calc(9.5pt*var(--fs,1));color:#333}
.r .contact .sep{color:#999;padding:0 6px}
.r section{margin-top:calc(14px*var(--sp,1))}
.r h2{margin:0 0 calc(6px*var(--sp,1));font-size:calc(11pt*var(--fs,1));font-weight:700;text-transform:uppercase;letter-spacing:.06em;break-after:avoid}
.r p{margin:0}
.r .item{margin-top:calc(8px*var(--sp,1));break-inside:avoid}
.r .item:first-of-type{margin-top:0}
.r .row{display:flex;justify-content:space-between;gap:12px;align-items:baseline}
.r .row .when{white-space:nowrap;font-size:calc(9.5pt*var(--fs,1));color:#444}
.r .role{font-weight:700}
.r .org{font-style:normal}
.r ul{margin:4px 0 0;padding-left:16px}
.r li{margin:1px 0}
.r .skills{margin:0}

/* Classic: centred header, black rules */
.r.t-classic header{text-align:center}
.r.t-classic h1{text-transform:uppercase;letter-spacing:.08em;font-size:calc(21pt*var(--fs,1))}
.r.t-classic .headline{font-weight:400;font-style:italic}
.r.t-classic h2{border-bottom:1px solid #222;padding-bottom:2px;letter-spacing:.08em}
/* Modern: accent name and headings */
.r.t-modern h1{color:var(--rc);font-size:calc(26pt*var(--fs,1));letter-spacing:-.01em}
.r.t-modern .headline{color:#333}
.r.t-modern h2{color:var(--rc);font-size:calc(10.5pt*var(--fs,1));letter-spacing:.1em;display:flex;align-items:center;gap:10px}
.r.t-modern h2::after{content:"";flex:1;height:1px;background:color-mix(in srgb,var(--rc) 35%,#fff)}
.r.t-modern .org{color:var(--rc)}
/* Compact: dense, one-page friendly */
.r.t-compact{font-size:calc(9.75pt*var(--fs,1));line-height:1.3}
.r.t-compact h1{font-size:calc(19pt*var(--fs,1))}
.r.t-compact header{border-bottom:2px solid var(--rc);padding-bottom:8px}
.r.t-compact section{margin-top:calc(10px*var(--sp,1))}
.r.t-compact h2{font-size:calc(9.75pt*var(--fs,1));color:var(--rc);margin-bottom:calc(3px*var(--sp,1))}
.r.t-compact .item{margin-top:calc(5px*var(--sp,1))}
.r.t-compact .row{justify-content:flex-start}
.r.t-compact .row .when{margin-left:auto}
/* Executive: double rule, serif feel */
.r.t-executive h1{font-size:calc(25pt*var(--fs,1));font-weight:600;letter-spacing:.01em}
.r.t-executive .headline{text-transform:uppercase;letter-spacing:.06em;font-size:calc(9.5pt*var(--fs,1));color:var(--rc)}
.r.t-executive header{border-bottom:3px double #333;padding-bottom:10px}
.r.t-executive h2{text-transform:none;letter-spacing:0;font-size:calc(13pt*var(--fs,1));font-weight:600;color:var(--rc)}
.r.t-executive .org{font-style:italic}

/* Optional photo: sits beside the name; ATS ignore images, the text order is unchanged. */
.r header{display:flex;gap:16px;align-items:center}
.r header .hd{flex:1;min-width:0}
.r .photo{width:84px;height:84px;border-radius:50%;object-fit:cover;flex:none}
.r.t-classic header{justify-content:center}
.r.t-classic header .hd{flex:0 1 auto}
@media print{
  @page{size:A4;margin:14mm 15mm}
  html,body{margin:0;background:#fff}
  .sheet{box-shadow:none;padding:0;width:auto;min-height:0;transform:none}
}
`;
