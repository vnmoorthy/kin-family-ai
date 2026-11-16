"""Build deck/Kin-pitch.pptx (10 slides) with python-pptx.

Run from the repo root:  python3 deck/build_pptx.py
Coordinates are in "px" on a 1920x1080 canvas (same grid as deck/index.html).
"""
import copy
import os

from lxml import etree
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_CONNECTOR, MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.oxml.ns import qn
from pptx.util import Emu, Pt

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "Kin-pitch.pptx")

INK = RGBColor(0x0B, 0x0B, 0x0F)
BG = RGBColor(0xF5, 0xF5, 0xF7)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
MUTED = RGBColor(0x6B, 0x6B, 0x76)
SOFT = RGBColor(0xA1, 0xA1, 0xAA)
LINE = RGBColor(0xD4, 0xD4, 0xDB)
DARKCARD = RGBColor(0x1A, 0x1A, 0x21)
GREEN = RGBColor(0x22, 0xC5, 0x5E)
BLUE = RGBColor(0x3B, 0x82, 0xF6)
PURPLE = RGBColor(0xA8, 0x55, 0xF7)
ORANGE = RGBColor(0xFF, 0x6B, 0x2C)
MINT = RGBColor(0xE9, 0xF9, 0xEF)
FONT = "Arial"


def P(px):
    return Emu(int(px * 6350))  # 1920px == 13.333in


prs = Presentation()
prs.slide_width = P(1920)
prs.slide_height = P(1080)
BLANK = prs.slide_layouts[6]


def new_slide(dark=False, notes=""):
    s = prs.slides.add_slide(BLANK)
    fill = s.background.fill
    fill.solid()
    fill.fore_color.rgb = INK if dark else BG
    if notes:
        s.notes_slide.notes_text_frame.text = notes
    return s


def box(s, x, y, w, h, fill=WHITE, radius=24, line=None, dash=False, shape=None):
    shp_type = shape or (MSO_SHAPE.ROUNDED_RECTANGLE if radius else MSO_SHAPE.RECTANGLE)
    sh = s.shapes.add_shape(shp_type, P(x), P(y), P(w), P(h))
    if shp_type == MSO_SHAPE.ROUNDED_RECTANGLE:
        sh.adjustments[0] = min(0.5, radius / float(min(w, h)))
    if fill is None:
        sh.fill.background()
    else:
        sh.fill.solid()
        sh.fill.fore_color.rgb = fill
    if line is None:
        sh.line.fill.background()
    else:
        sh.line.color.rgb = line
        sh.line.width = Pt(2)
        if dash:
            sh.line.dash_style = 4  # dash
    sh.shadow.inherit = False
    sh.text_frame.text = ""
    return sh


def circle(s, cx, cy, d, fill=WHITE, line=None):
    return box(s, cx - d / 2, cy - d / 2, d, d, fill=fill, line=line, shape=MSO_SHAPE.OVAL)


def text(s, x, y, w, h, runs, size=16, color=INK, bold=False, align=PP_ALIGN.LEFT,
         anchor=MSO_ANCHOR.TOP, shape=None, spacing=None):
    """runs: str, or list of paragraphs; each paragraph a str or list of (text, {opts})."""
    if shape is None:
        shape = s.shapes.add_textbox(P(x), P(y), P(w), P(h))
    tf = shape.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = anchor
    paras = runs if isinstance(runs, list) else [runs]
    for i, para in enumerate(paras):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        if spacing:
            p.space_after = Pt(spacing)
        segs = para if isinstance(para, list) else [(para, {})]
        for seg_text, o in segs:
            r = p.add_run()
            r.text = seg_text
            f = r.font
            f.name = FONT
            f.size = Pt(o.get("size", size))
            f.bold = o.get("bold", bold)
            f.color.rgb = o.get("color", color)
    return shape


def boxtext(s, x, y, w, h, runs, fill=WHITE, radius=24, pad=24, line=None, dash=False,
            anchor=MSO_ANCHOR.MIDDLE, **kw):
    sh = box(s, x, y, w, h, fill=fill, radius=radius, line=line, dash=dash)
    tf = sh.text_frame
    text(s, 0, 0, 0, 0, runs, anchor=anchor, shape=sh, **kw)
    tf.margin_left = tf.margin_right = P(pad)
    tf.margin_top = tf.margin_bottom = P(min(pad, 16))
    return sh


def line(s, x1, y1, x2, y2, color=LINE, width=2.5, dash=True):
    c = s.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, P(x1), P(y1), P(x2), P(y2))
    c.line.color.rgb = color
    c.line.width = Pt(width)
    if dash:
        c.line.dash_style = 4
    return c


def kicker(s, t, dark=False, y=96):
    text(s, 130, y, 1200, 40, t.upper(), size=14, bold=True, color=SOFT if dark else MUTED)


def title(s, l1, l2=None, y=136, size=40, dark=False):
    paras = [[(l1, {"color": WHITE if dark else INK})]]
    if l2:
        paras.append([(l2, {"color": SOFT if dark else MUTED})])
    text(s, 130, y, 1660, 200, paras, size=size, bold=True)


def add_transition(slide, kind="fade"):
    """Inject <p:transition> after <p:clrMapOvr> (schema order: cSld, clrMapOvr, transition, timing)."""
    sld = slide._element
    for old in sld.findall(qn("p:transition")):
        sld.remove(old)
    tr = etree.SubElement(sld, qn("p:transition"))
    tr.set("spd", "med")
    if kind == "push":
        child = etree.SubElement(tr, qn("p:push"))
        child.set("dir", "u")
    else:
        etree.SubElement(tr, qn("p:fade"))
    clr = sld.find(qn("p:clrMapOvr"))
    sld.remove(tr)
    if clr is not None:
        clr.addnext(tr)
    else:
        sld.find(qn("p:cSld")).addnext(tr)


# ---------------------------------------------------------------- 1 TITLE
s = new_slide(dark=True, notes=(
    "0:00-0:12. Hi, I'm building Kin: one shared brain for your whole family. Every family member "
    "knows different things. Kin puts it in one place and gets it to the right person, automatically. "
    "Built today, here at YC."))
kicker(s, "YC Consumer Mobile Hackathon · San Francisco", dark=True, y=150)
text(s, 122, 210, 900, 260, "Kin", size=150, bold=True, color=WHITE)
text(s, 130, 580, 860, 180, [[("One shared brain for ", {}), ("your whole family.", {"color": SOFT})]],
     size=40, bold=True, color=WHITE)
text(s, 130, 790, 820, 120, "Tell it anything. It remembers, decides who should handle it, and nudges them — instantly.",
     size=18, color=SOFT)
cx, cy, R = 1440, 520, 300
circle(s, cx, cy, 2 * R, fill=None, line=RGBColor(0x33, 0x33, 0x3D))
for (dx, dy, emo, name) in [(0, -1, "👩🏽", "Priya · Mom"), (1, 0, "👨🏽", "Raj · Dad"),
                            (0, 1, "👵🏽", "Paati"), (-1, 0, "👦🏽", "Arjun · 12")]:
    ax, ay = cx + dx * R, cy + dy * R
    c = circle(s, ax, ay, 116, fill=DARKCARD, line=RGBColor(0x3A, 0x3A, 0x44))
    text(s, 0, 0, 0, 0, emo, size=28, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, shape=c)
    text(s, ax - 110, ay + 64, 220, 30, name, size=12, bold=True, color=RGBColor(0xC9, 0xC9, 0xD1), align=PP_ALIGN.CENTER)
c = circle(s, cx, cy, 220, fill=WHITE)
text(s, 0, 0, 0, 0, "Kin", size=34, bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, shape=c)
for (x, y, w, t) in [(860, 300, 480, "🥚 Eggs → Raj, on his way home"),
                     (1400, 950, 390, "📄 Field-trip slip → Arjun"),
                     (900, 860, 400, "🔥 Family streak · 12 days")]:
    boxtext(s, x, y, w, 64, t, radius=22, pad=20, size=13, bold=True)
add_transition(s)

# ---------------------------------------------------------------- 2 PROBLEM
s = new_slide(notes=(
    "0:12-0:27. Every household has a default coordinator, usually Mom. She's the human router: she knows "
    "the eggs are gone, the slip is due Friday, Paati's refill is Thursday, and she texts it back out to "
    "everyone, all day. Every single day."))
kicker(s, "The problem")
text(s, 130, 136, 780, 220, ["Every home has a", "human router."], size=40, bold=True)
text(s, 130, 360, 740, 140, "The default parent — usually Mom — holds what everyone knows, and nags it back out, one text at a time.",
     size=17, color=MUTED)
for i, (num, lab, col) in enumerate([("4", "people who each know different things", INK),
                                     ("1", "person routing all of it", INK),
                                     ("0", "shared memory for the family", ORANGE)]):
    x = 130 + i * 250
    text(s, x, 560, 220, 130, num, size=64, bold=True, color=col)
    text(s, x, 700, 210, 90, lab, size=14, bold=True, color=MUTED)
text(s, 1000, 100, 790, 40, "PRIYA'S OUTBOX · A NORMAL TUESDAY", size=13, bold=True, color=MUTED)
msgs = [("6:45a", "Arjun", BLUE, "Did you pack the peanut-free snack?? 🥜🚫"),
        ("7:30a", "Raj", INK, "Can you grab eggs tonight? We're out."),
        ("12:10p", "Me", SOFT, "Field-trip slip due FRIDAY. Don't forget."),
        ("3:20p", "Arjun", BLUE, "Send me a photo of the homework sheet pls"),
        ("5:55p", "Raj", INK, "Eggs?? You passed Trader Joe's, didn't you 😩"),
        ("9:40p", "Paati", PURPLE, "Amma, refill is Thursday — did you call the pharmacy?")]
for i, (t, who, col, m) in enumerate(msgs):
    y = 150 + i * 106
    box(s, 1000, y, 790, 92, radius=22)
    text(s, 1026, y, 90, 92, t, size=12, bold=True, color=MUTED, anchor=MSO_ANCHOR.MIDDLE)
    boxtext(s, 1120, y + 28, 96, 36, who, fill=col, radius=18, pad=4, size=11, bold=True, color=WHITE,
            align=PP_ALIGN.CENTER)
    text(s, 1236, y, 540, 92, m, size=14, bold=True, anchor=MSO_ANCHOR.MIDDLE)
st = boxtext(s, 1200, 840, 590, 100, "Every. Single. Day.", fill=BG, radius=24, line=ORANGE, size=26, bold=True,
             color=ORANGE, align=PP_ALIGN.CENTER)
st.line.width = Pt(4)
st.rotation = -5
add_transition(s)

# ---------------------------------------------------------------- 3 INSIGHT
s = new_slide(notes=(
    "0:27-0:38. The insight: everyone in the family already has their own knowledge silo -- their head, their "
    "own ChatGPT, a flyer crumpled in a backpack. Nobody has a FAMILY brain. Kin merges it into one memory "
    "shared only inside the family."))
kicker(s, "The insight")
title(s, "Everyone has their own AI.", "No family has a shared brain.")
people = [(130, 400, "👩🏽 Priya", "Eggs are gone. Arjun is allergic to peanuts.", "🔒 in her head"),
          (130, 760, "👨🏽 Raj", "Drives past Trader Joe's at 6pm.", "🔒 in his own AI chat"),
          (1410, 400, "👦🏽 Arjun", "Field-trip slip due Friday. Needs poster board.", "🔒 in his backpack"),
          (1410, 760, "👵🏽 Paati", "Pharmacy refill on Thursday.", "🔒 on a sticky note")]
bx, by = 960, 690
for (x, y, n, k, sil) in people:
    ex = x + 380 if x < 900 else x
    line(s, ex, y + 85, bx, by)
for (x, y, n, k, sil) in people:
    box(s, x, y, 380, 190, radius=24)
    text(s, x + 26, y + 20, 340, 40, n, size=18, bold=True)
    text(s, x + 26, y + 66, 330, 70, k, size=13, bold=True)
    text(s, x + 26, y + 146, 330, 30, sil, size=11, bold=True, color=MUTED)
c = circle(s, bx, by, 260, fill=INK)
text(s, 0, 0, 0, 0, [[("Kin", {"size": 32, "bold": True, "color": WHITE})],
                     [("one family memory", {"size": 11, "color": SOFT})]],
     align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, shape=c)
for (x, y, t) in [(560, 470, "🥚 out of eggs"), (540, 860, "🚗 Trader Joe's · 6pm"),
                  (1140, 470, "📄 slip due Fri"), (1150, 860, "💊 refill Thu")]:
    boxtext(s, x, y, 260, 48, t, radius=24, pad=12, size=11, bold=True, align=PP_ALIGN.CENTER)
text(s, 130, 990, 1660, 40, "Kin merges it — shared only inside the family.", size=16, bold=True, align=PP_ALIGN.CENTER)
add_transition(s)

# ---------------------------------------------------------------- 4 SOLUTION
s = new_slide(notes=(
    "0:38-0:50. Tell Kin anything -- a text, or a photo of the fridge, a school flyer, homework. Kin remembers "
    "it, decides who should handle it using what it knows about your family, and nudges that person. AI is "
    "the coordinator. Not Mom. Let me show you."))
kicker(s, "The solution")
title(s, "Tell Kin anything.", "It remembers, assigns, and nudges.")
steps = [("1", INK, "Tell", "Text it, or snap a photo",
          ["💬 “we're out of eggs”", "📷 photo of the fridge", "🧾 school flyer", "📚 homework sheet"]),
         ("2", PURPLE, "Remember", "One family memory",
          ["Eggs: out", "Arjun: allergic to peanuts", "Field trip · Friday", "Raj: Trader Joe's at 6pm"]),
         ("3", BLUE, "Decide who", "Using family memory",
          ["🚗 Raj passes Trader Joe's → eggs go to Raj", "🥜 Arjun's allergic → snack must be nut-free"]),
         ("4", GREEN, "Nudge", "Live, on the right phone", None)]
for i, (n, col, h, d, items) in enumerate(steps):
    x = 130 + i * 429
    box(s, x, 390, 373, 500, radius=26)
    boxtext(s, x + 28, 418, 56, 56, n, fill=col, radius=16, pad=2, size=16, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    text(s, x + 28, 490, 330, 56, h, size=26, bold=True)
    text(s, x + 28, 546, 330, 34, d, size=13, bold=True, color=MUTED)
    if items:
        ih = 62 if len(items) > 2 else 110
        for j, it in enumerate(items):
            boxtext(s, x + 24, 596 + j * (ih + 10), 325, ih, it, fill=BG, radius=14, pad=14, size=12, bold=True)
    else:
        boxtext(s, x + 24, 596, 325, 180, [[("KIN · RAJ'S PHONE", {"size": 9, "color": SOFT})],
                                          "🥚 Hey Raj — Priya noticed we're out of eggs. Grab a dozen at Trader Joe's on your way home?"],
                fill=INK, radius=16, pad=14, size=11, bold=True, color=WHITE, anchor=MSO_ANCHOR.TOP)
        boxtext(s, x + 24, 790, 325, 62, "✅ Raj finished Eggs", fill=MINT, radius=14, pad=14, size=12, bold=True)
    if i < 3:
        text(s, x + 378, 610, 48, 60, "›", size=30, bold=True, color=SOFT, align=PP_ALIGN.CENTER)
text(s, 130, 940, 1660, 60, [[("AI is the coordinator. ", {}), ("Not Mom.", {"color": MUTED})]], size=26, bold=True)
add_transition(s)

# ---------------------------------------------------------------- 5 DEMO
s = new_slide(notes=(
    "0:50-1:50 LIVE DEMO (this slide is the backdrop / backup). Priya types 'we're out of eggs'. Kin recalls "
    "that Raj drives past Trader Joe's at six, assigns it to him, and his phone buzzes. He taps Done -- Priya "
    "gets 'Raj finished Eggs'. Then: snap a fridge or flyer photo; then a private 'Just me' surprise-party note."))
kicker(s, "Demo moment", y=70)
text(s, 130, 104, 1200, 90, "“We're out of eggs.”", size=34, bold=True)


def phone(x, y, dark_screen=False):
    box(s, x, y, 380, 780, fill=INK, radius=60)
    box(s, x + 14, y + 14, 352, 752, fill=RGBColor(0x1C, 0x1C, 0x2A) if dark_screen else BG, radius=48)
    box(s, x + 131, y + 26, 118, 32, fill=RGBColor(0, 0, 0), radius=16)


text(s, 190, 222, 380, 34, "👩🏽 Priya's phone", size=14, bold=True, align=PP_ALIGN.CENTER)
phone(190, 262)
boxtext(s, 214, 410, 280, 104, "Morning Priya ☀️ Field-trip slip is due Friday — on Arjun's list.",
        radius=20, pad=14, size=11, anchor=MSO_ANCHOR.MIDDLE)
boxtext(s, 266, 528, 278, 52, "We're out of eggs 🥚", fill=INK, radius=20, pad=12, size=11, bold=True, color=WHITE)
boxtext(s, 214, 594, 290, 100, "Got it. Raj drives past Trader Joe's around 6 — sending it to him. 🛒",
        radius=20, pad=14, size=11)
boxtext(s, 214, 708, 290, 80, "Raj picked up a dozen. Nothing left tonight 🎉", fill=MINT, radius=20, pad=14, size=11)
boxtext(s, 214, 320, 332, 60, "✅ Raj finished Eggs", fill=GREEN, radius=20, pad=14, size=13, bold=True, color=WHITE)
boxtext(s, 214, 960, 332, 56, "Tell Kin anything…", radius=28, pad=18, size=12, color=SOFT)

c = circle(s, 960, 450, 240, fill=INK)
text(s, 0, 0, 0, 0, [[("Kin", {"size": 30, "bold": True, "color": WHITE})], [("family brain", {"size": 10, "color": SOFT})]],
     align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, shape=c)
line(s, 580, 450, 836, 450, color=GREEN, width=3)
line(s, 1084, 450, 1340, 450, color=BLUE, width=3)
text(s, 740, 610, 440, 30, "RECALLING FAMILY MEMORY", size=11, bold=True, color=MUTED, align=PP_ALIGN.CENTER)
boxtext(s, 760, 652, 400, 52, "🚗 Raj · passes Trader Joe's ~6pm", radius=26, pad=14, size=12, bold=True, align=PP_ALIGN.CENTER)
boxtext(s, 760, 716, 400, 52, "🥚 We usually buy a dozen", radius=26, pad=14, size=12, bold=True, align=PP_ALIGN.CENTER)
boxtext(s, 760, 780, 400, 52, "→ Assign to Raj · nudge now", fill=BLUE, radius=26, pad=14, size=12, bold=True,
        color=WHITE, align=PP_ALIGN.CENTER)

text(s, 1350, 222, 380, 34, "👨🏽 Raj's phone", size=14, bold=True, align=PP_ALIGN.CENTER)
phone(1350, 262, dark_screen=True)
text(s, 1364, 350, 352, 100, "5:52", size=48, color=WHITE, align=PP_ALIGN.CENTER)
text(s, 1364, 452, 352, 30, "Tuesday, on the drive home", size=11, bold=True, color=SOFT, align=PP_ALIGN.CENTER)
boxtext(s, 1364, 510, 352, 230, [[("KIN · NOW", {"size": 9, "color": MUTED})],
                                 "🥚 Hey Raj — Priya noticed we're out of eggs. Grab a dozen at Trader Joe's on your way home?"],
        radius=24, pad=16, size=12, bold=True, anchor=MSO_ANCHOR.TOP)
boxtext(s, 1380, 680, 156, 44, "✓ Done", fill=GREEN, radius=14, pad=6, size=12, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
boxtext(s, 1546, 680, 156, 44, "Later", fill=BG, radius=14, pad=6, size=12, bold=True, align=PP_ALIGN.CENTER)
boxtext(s, 1364, 880, 352, 120, [[("RAJ · TONIGHT", {"size": 9, "color": SOFT})],
                                 [("☑ 🥚 Eggs · a dozen", {"color": GREEN})],
                                 "☐ 📄 Sign Arjun's slip"],
        fill=RGBColor(0x2C, 0x2C, 0x3A), radius=22, pad=16, size=12, bold=True, color=WHITE, anchor=MSO_ANCHOR.TOP)
add_transition(s, "push")

# ---------------------------------------------------------------- 6 PRIVACY
s = new_slide(notes=(
    "1:50-2:05. Families also keep secrets. Everyone gets a private 'Just me' memory. I told Kin about Raj's "
    "surprise party -- Kin uses it to help me, but when Raj asks what's happening Saturday, Kin never reveals "
    "it. Shared is family-only. Private is private. Two separate memory namespaces."))
kicker(s, "Privacy model")
title(s, "Shared with your family.", "Private to you.")
box(s, 130, 390, 700, 470, radius=26)
text(s, 166, 420, 560, 50, "🏠  Family memory", size=24, bold=True)
text(s, 166, 480, 560, 40, "Visible to the family — and no one else.", size=13, bold=True, color=MUTED)
for j, t in enumerate(["🥚 Out of eggs", "🥜 Arjun: peanut allergy", "🚌 Field trip Friday",
                       "💊 Paati's refill Thursday", "🛒 Raj: Trader Joe's at 6"]):
    boxtext(s, 166 + (j % 2) * 320, 540 + (j // 2) * 70, 308, 56, t, fill=BG, radius=28, pad=12, size=11, bold=True)
text(s, 166, 790, 560, 40, "Shared with 👩🏽👨🏽👦🏽👵🏽", size=13, bold=True, color=MUTED)
box(s, 860, 390, 520, 470, fill=INK, radius=26)
text(s, 896, 420, 440, 50, "🤫  Just me  🔒", size=24, bold=True, color=WHITE)
text(s, 896, 480, 440, 40, "Priya's private memory. Kin never reveals it.", size=13, bold=True, color=SOFT)
boxtext(s, 896, 540, 450, 56, "🎉 Surprise party for Raj · Sat 7pm", fill=DARKCARD, radius=28, pad=16, size=12, bold=True, color=WHITE)
boxtext(s, 896, 610, 450, 56, "🎁 Gift: new running shoes", fill=DARKCARD, radius=28, pad=16, size=12, bold=True, color=WHITE)
text(s, 896, 790, 440, 40, "Visible to 👩🏽 only", size=13, bold=True, color=SOFT)
text(s, 1420, 470, 370, 40, "👨🏽 Raj asks Kin…", size=14, bold=True, color=MUTED)
boxtext(s, 1420, 520, 370, 70, "Anything happening Saturday?", fill=INK, radius=22, pad=16, size=13, bold=True, color=WHITE)
boxtext(s, 1420, 610, 370, 130, "Nothing on the family plan yet — keep the evening free 😉", radius=22, pad=16, size=13, bold=True)
text(s, 130, 930, 1660, 50, [[("Kin uses your private memory ", {}), ("to help you", {"color": PURPLE}),
                              (" — never to tell anyone else.", {})]], size=18, bold=True)
add_transition(s)

# ---------------------------------------------------------------- 7 DAILY LOOP
s = new_slide(notes=(
    "2:05-2:20. Built for every day, not once a month. Everyone gets a personal brief morning and evening, "
    "shared live lists, nudges at the right moment, and every check-off keeps the family streak alive."))
kicker(s, "Why every day")
title(s, "Built for every single day.")
lx, ly, r = 470, 660, 240
circle(s, lx, ly, 2 * r, fill=None, line=LINE)
for (dx, dy, t, on) in [(0, -1, "☀️ Brief", True), (1, 0, "🛒 Lists", False), (0, 1, "🔔 Nudges", False), (-1, 0, "✅ Check-off", False)]:
    boxtext(s, lx + dx * r - 105, ly + dy * r - 44, 210, 88, t, fill=INK if on else WHITE, radius=24, pad=8,
            size=15, bold=True, color=WHITE if on else INK, align=PP_ALIGN.CENTER)
circle(s, lx + 170, ly - 170, 26, fill=ORANGE)
text(s, lx - 150, ly - 120, 300, 240, [[("🔥", {"size": 36})], [("12", {"size": 64, "bold": True})],
                                     [("day family streak", {"size": 12, "bold": True, "color": MUTED})]],
     align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
box(s, 900, 330, 890, 400, radius=26)
text(s, 936, 360, 820, 30, "KIN · MORNING BRIEF · 7:00 AM", size=11, bold=True, color=MUTED)
text(s, 936, 396, 820, 60, "Good morning, Raj ☀️ 3 things today", size=22, bold=True)
for j, (t, col, done) in enumerate([("🥚 Eggs — Trader Joe's is on your way home", GREEN, True),
                                    ("📄 Sign Arjun's field-trip slip", BLUE, True),
                                    ("🩺 Paati's appointment at 4 — Priya's driving", PURPLE, False)]):
    y = 490 + j * 70
    circle(s, 950, y + 22, 16, fill=col)
    text(s, 976, y, 680, 44, t, size=15, bold=True, anchor=MSO_ANCHOR.MIDDLE)
    boxtext(s, 1720, y + 6, 32, 32, "✓" if done else "", fill=GREEN if done else WHITE, radius=10, pad=0,
            line=None if done else LINE, size=12, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
boxtext(s, 900, 760, 890, 120, [[("EVENING BRIEF · 8:30 PM", {"size": 10, "color": SOFT})],
                                "🌙 Everything got done today. Tomorrow: poster board for the science fair."],
        fill=INK, radius=26, pad=34, size=15, bold=True, color=WHITE)
add_transition(s)

# ---------------------------------------------------------------- 8 ARCHITECTURE
s = new_slide(notes=(
    "2:20-2:32. Expo React Native on every phone; Convex as the reactive backend, so every family phone updates "
    "live. OpenAI for reasoning and vision; Supermemory holds a family namespace and a private namespace per "
    "person; Whop runs Kin Plus checkout and webhooks. Capy built it with us through PRs; Revyl tested it on "
    "cloud devices with plain-English tests."))
kicker(s, "How it's built")
title(s, "Every family phone, live.")
ox, oy = 130, 330
for j, n in enumerate(["Priya", "Raj", "Arjun", "Paati"]):
    y = oy + 20 + j * 120
    line(s, ox + 300, y + 50, ox + 560, oy + 250)
    box(s, ox, y, 300, 100, radius=24)
    box(s, ox + 20, y + 20, 34, 60, fill=INK, radius=9)
    text(s, ox + 74, y + 18, 220, 70, [[(n, {"size": 15, "bold": True})],
                                       [("Expo · React Native", {"size": 11, "color": MUTED, "bold": True})]],
         anchor=MSO_ANCHOR.MIDDLE)
for (sy) in (85, 250, 415):
    line(s, ox + 1080, oy + 250, ox + 1320, oy + sy)
boxtext(s, ox + 560, oy + 90, 520, 320,
        [[("● LIVE", {"size": 10, "color": GREEN})], [("Convex", {"size": 32})],
         [("Reactive backend — every phone updates the instant anything changes.", {"size": 13, "color": SOFT})],
         [("live queries · mutations · actions", {"size": 12, "color": WHITE})]],
        fill=INK, radius=28, pad=34, bold=True, color=WHITE, anchor=MSO_ANCHOR.TOP, spacing=8)
for (sy, n, d) in [(20, "OpenAI", "Reasoning to assign + vision for fridge, flyer & homework snaps"),
                   (185, "Supermemory", "Family + private “Just me” namespaces · semantic recall"),
                   (350, "Whop", "Kin Plus subscription checkout + webhook")]:
    boxtext(s, ox + 1320, oy + sy, 340, 130, [[(n, {"size": 17, "bold": True})], [(d, {"size": 11, "color": MUTED})]],
            radius=24, pad=22, bold=True, anchor=MSO_ANCHOR.MIDDLE)
text(s, 130, 905, 150, 60, "DEV LOOP", size=12, bold=True, color=MUTED, anchor=MSO_ANCHOR.MIDDLE)
for j, (n, d) in enumerate([("Capy", " — AI software engineer; built Kin through PRs"),
                            ("Revyl", " — cloud-device tests in plain English"),
                            ("Ship", " — to every family phone, same day")]):
    x = 290 + j * 510
    boxtext(s, x, 880, 450, 100, [[(n, {"size": 15}), (d, {"size": 13})]], radius=22, pad=22, line=LINE, dash=True,
            bold=True)
    if j < 2:
        text(s, x + 452, 900, 56, 60, "→", size=20, bold=True, color=MUTED, align=PP_ALIGN.CENTER)
add_transition(s)

# ---------------------------------------------------------------- 9 BUSINESS
s = new_slide(notes=(
    "2:32-2:45. Kin Plus: $4.99 a month per family, checkout through Whop. One subscription covers the whole "
    "household. Growth is built in: every family invites 3-5 members by code, grandparents and nannies join "
    "over SMS, and shared grandparents carry Kin into the next household."))
kicker(s, "Business & growth")
title(s, "One price. The whole family.")
box(s, 130, 340, 700, 640, radius=26)
text(s, 176, 370, 640, 150, "$4.99", size=80, bold=True)
text(s, 176, 545, 640, 40, "per month, per family · Kin Plus", size=15, bold=True, color=MUTED)
for j, t in enumerate(["Unlimited members & memories", "Photo snaps — fridge, flyers, homework",
                       "Daily briefs for everyone", "Grandparents over SMS"]):
    y = 610 + j * 64
    boxtext(s, 176, y, 40, 40, "✓", fill=INK, radius=12, pad=0, size=12, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    text(s, 236, y, 580, 40, t, size=15, bold=True, anchor=MSO_ANCHOR.MIDDLE)
boxtext(s, 176, 892, 420, 52, "Checkout + webhook via Whop", fill=BG, radius=26, pad=16, size=12, bold=True)
text(s, 900, 250, 890, 90, [[("Every family invites ", {"color": MUTED}), ("3–5 members by code", {}),
                             (". Grandparents & nannies join over SMS — and shared grandparents ", {"color": MUTED}),
                             ("carry Kin into the next family.", {"color": ORANGE})]], size=15, bold=True)
vx, vy = 900, 360
cxv, cyv = vx + 440, vy + 300
nodes = [(440, 80, "👨🏽 Raj", "solid"), (649, 232, "👦🏽 Arjun", "solid"), (569, 478, "👵🏽 Paati", "solid"),
         (311, 478, "💬 Nanny · SMS", "sms"), (231, 232, "💬 Grandpa · SMS", "sms")]
for (nx, ny, t, kind) in nodes:
    line(s, cxv, cyv, vx + nx, vy + ny, color=INK if kind == "solid" else SOFT, width=2.5, dash=kind != "solid")
line(s, vx + 569, vy + 478, vx + 760, vy + 575, color=ORANGE, width=3, dash=False)
boxtext(s, cxv - 160, cyv - 40, 320, 80, "👩🏽 Priya starts Kin", fill=INK, radius=40, pad=12, size=15, bold=True,
        color=WHITE, align=PP_ALIGN.CENTER)
boxtext(s, cxv - 120, cyv + 56, 240, 44, "CODE · KIN-7Q2F", fill=BG, radius=12, pad=6, line=LINE, size=12, bold=True,
        align=PP_ALIGN.CENTER)
for (nx, ny, t, kind) in nodes:
    w = 270 if kind == "sms" else 180
    boxtext(s, vx + nx - w / 2, vy + ny - 32, w, 64, t, fill=BG if kind == "sms" else WHITE, radius=32, pad=10,
            line=SOFT if kind == "sms" else None, dash=kind == "sms", size=13, bold=True,
            color=MUTED if kind == "sms" else INK, align=PP_ALIGN.CENTER)
boxtext(s, vx + 760 - 125, vy + 575 - 32, 250, 64, "🏠 Next family", fill=RGBColor(0xFF, 0xF1, 0xEA), radius=32,
        pad=10, line=ORANGE, size=13, bold=True, color=ORANGE, align=PP_ALIGN.CENTER)
add_transition(s)

# ---------------------------------------------------------------- 10 VISION
s = new_slide(dark=True, notes=(
    "2:45-3:00. Where this goes: SMS and voice so Paati can just call Kin, calendar and school-email ingest, "
    "location-aware nudges ('you're near Costco, three things on the list'), chores and allowance for kids. "
    "Kin becomes the operating system of the home. Google Photos remembered your life. Kin remembers your "
    "family's. The ask: put Kin on your family's phones tonight. Thank you."))
kicker(s, "Vision", dark=True)
text(s, 130, 136, 1660, 220, [[("Kin becomes the", {"color": WHITE})],
                              [("operating system of the home.", {"color": SOFT})]], size=50, bold=True)
for j, (e, h, d) in enumerate([("📞", "SMS & voice for grandparents", "Paati just texts or calls Kin"),
                               ("📅", "Calendar & school email ingest", "Flyers and portals become tasks"),
                               ("📍", "Location-aware nudges", "“You're near Costco — 3 things on the list”"),
                               ("⭐", "Chores & allowance for kids", "Arjun earns for check-offs")]):
    x = 130 + j * 422
    boxtext(s, x, 420, 394, 220, [[(e, {"size": 24})], [(h, {"size": 16, "color": WHITE})],
                                  [(d, {"size": 12, "color": SOFT})]],
            fill=RGBColor(0x17, 0x17, 0x1D), radius=24, pad=26, bold=True, anchor=MSO_ANCHOR.TOP, spacing=6)
text(s, 130, 740, 960, 160, [[("Google Photos remembered your life.", {"color": WHITE})],
                             [("Kin remembers your family's.", {"color": SOFT})]], size=24, bold=True)
boxtext(s, 1100, 720, 690, 110, [[("The ask: ", {"color": ORANGE}),
                                  ("put Kin on your family's phones tonight — and tell us what it should take care of next.", {})]],
        fill=RGBColor(0x17, 0x17, 0x1D), radius=18, pad=22, size=14, bold=True, color=WHITE)
text(s, 1100, 860, 690, 40, "github.com/vnmoorthy/kin-family-ai", size=16, bold=True, color=WHITE, align=PP_ALIGN.RIGHT)
text(s, 1000, 910, 790, 60, "Thank you 🙏 · Built today with Capy · Revyl · Convex · Supermemory · Whop · OpenAI · Expo",
     size=11, bold=True, color=SOFT, align=PP_ALIGN.RIGHT)
add_transition(s)

prs.save(OUT)
print("wrote", OUT, len(prs.slides), "slides")
