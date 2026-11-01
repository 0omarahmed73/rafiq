# Builds manual/guide.html (Arabic, RTL, A4) from the app's real screenshots. Run: python3 manual/build.py
import pathlib
OUT = pathlib.Path(__file__).parent / "guide.html"
AR = str.maketrans("0123456789", "٠١٢٣٤٥٦٧٨٩")
n = lambda x: str(x).translate(AR)

pages = []

def phone(img, h=118, cls=""):
    h = round(h * (1.38 if h <= 92 else 1.3))  # rows of phones are shorter in the source; fill the page
    return f'<figure class="phone {cls}" style="--h:{h}mm"><img src="../screenshots/{img}" alt=""></figure>'

def callout(kind, title, body):
    return f'<aside class="callout {kind}"><strong>{title}</strong><span>{body}</span></aside>'

def page(title, lead, left, right="", tag="", cls=""):
    pages.append(dict(title=title, lead=lead, left=left, right=right, tag=tag, cls=cls))

def bullets(items):
    return "<ul class='feat'>" + "".join(f"<li>{i}</li>" for i in items) + "</ul>"

def steps(items):
    return "<ol class='steps'>" + "".join(f"<li>{i}</li>" for i in items) + "</ol>"

# 1 welcome + install
page("مرحبًا بك في رفيق",
 "رفيقٌ هادئ وخاص يرافقني في عشر خطوات للعناية بنفسي، ويبقى كل ما أكتبه فيه على جهازي فقط.",
 bullets([
  "<b>هادئ:</b> لا سلاسل أيام تضغط عليّ، ولا إشعارات تلومني، ولا درجات. أسجّل حين أريد.",
  "<b>خاص:</b> لا حساب ولا خادم ولا تتبّع. بياناتي لا تغادر جهازي.",
  "<b>يعمل دون إنترنت:</b> بعد أول فتح يعمل كاملًا بلا اتصال.",
  "<b>مرتبط بعلاجي:</b> يساعدني على تجهيز ما أقوله لمعالجي، وتسجيل الجلسات والواجبات، وطباعة ملخّص أسلّمه له.",
 ]) + callout("warn","تنبيه مهم","رفيق أداة مساعدة ذاتية، وليس جهازًا طبيًا، ولا يقدّم تشخيصًا أو علاجًا، ولا يحلّ محل المعالج النفسي. وإن شعرتُ بأنني قد أكون في خطر، أتواصل فورًا مع خدمات الطوارئ في بلدي أو مع شخص أثق به.") + \
 "<div class='install'><h3>كيف أثبّته؟</h3><div class='cols'>"
 "<div><h4>من المتصفح</h4>" + steps(["أفتح <span class='ltr'>rafiq-iota-neon.vercel.app</span>","أختار من قائمة المتصفح «إضافة إلى الشاشة الرئيسية»","يظهر رفيق كتطبيق مستقل ويعمل دون إنترنت"]) + "</div>"
 "<div><h4>على أندرويد (ملف APK)</h4>" + steps(["أنزّل الملف من صفحة الإصدارات في GitHub","أفتحه وأسمح بالتثبيت من هذا المصدر إن طُلب","بيانات التطبيق مستقلة عن المتصفح؛ أنقلها بنسخة احتياطية"]) + "</div>"
 "</div></div>",
 "",
 tag="البداية")

# 2 map
page("خريطة التطبيق",
 "خمسة أقسام في الشريط السفلي، وزران في أعلى الرئيسية. أعرف أين أجد كل شيء.",
 "<table class='map'><tr><th>القسم</th><th>ما أجده فيه</th></tr>"
 "<tr><td>الرئيسية</td><td>تسجيل سريع، الخطوة الحالية، محفّزاتي، ملاحظاتي، مراجعة الأسبوع، خطة السنة</td></tr>"
 "<tr><td>الرحلة</td><td>الخطوات العشر وتمارينها الموجّهة</td></tr>"
 "<tr><td>التتبّع</td><td>تقويم الشهر، منحنى الشدّة، أكثر المشاعر حضورًا</td></tr>"
 "<tr><td>لمعالجي</td><td>أجندة الجلسة، ملاحظات الجلسات، واجباتي، ملاحظاتي، ملخّص المعالج</td></tr>"
 "<tr><td>مكتبتي</td><td>قراءة هادئة عن اضطراب الشخصية الحدّية من مصادر موثوقة</td></tr>"
 "<tr><td>أحتاج تهدئة</td><td>زر في أعلى الرئيسية: تنفّس، تأريض بالحواس، وأرقام دعم عاجلة</td></tr>"
 "<tr><td>الإعدادات</td><td>رابط في أسفل الرئيسية: المظهر، البلد، النسخ الاحتياطي، التذكير، معلوماتي</td></tr></table>"
 + callout("tip","نصيحة","في أعلى كل صفحة رابط «‹ الرجوع» يعيدني إلى الصفحة التي جئتُ منها، وكل صفحة جديدة تبدأ من أعلاها."),
 phone("home.png", 128), tag="البداية")

# 3 home
page("الرئيسية",
 "أول ما أراه حين أفتح التطبيق: كيف حالي اليوم، وما الخطوة التالية.",
 bullets([
  "<b>الشريط العلوي:</b> التاريخ، وأيقونة الكتاب لفتح مكتبتي، وزر «أحتاج تهدئة».",
  "<b>تسجيل سريع:</b> أختار شعورًا أو أكثر، وأحرّك الشريط لأحدّد شدّته من صفر إلى عشرة، وأحفظ في لحظات. «تفصيل أكثر» يفتح الصفحة الكاملة.",
  "<b>بطاقة الخطوة الحالية:</b> تذكّرني بالخطوة التي أعمل عليها مع زر «تابع التمرين».",
  "<b>محفّزاتي:</b> طريق مختصر إلى سجلّي لفهم ما يزعجني.",
  "<b>ملاحظاتي:</b> مربع أكتب فيه ملاحظة في لحظتها، ورابط «كل ملاحظاتي» يعرض عدد ملاحظاتي الحالية.",
  "<b>مراجعة الأسبوع</b> وبطاقة <b>خطة السنة</b>، وشريط تذكير هادئ بالتسجيل وبنسخة احتياطية إن مرّ وقت طويل.",
 ]), phone("home-notes.png", 60, "wide") + phone("home-dark.png", 100), tag="الاستخدام اليومي")

# 4 checkin
page("تسجيل المشاعر",
 "صفحة التسجيل الكاملة تتّسع لما أشعر به. لا توجد مشاعر خاطئة.",
 steps([
  "<b>أختار كلمات المشاعر</b> مرتّبة في مجموعات: الحزن، الخوف، الخجل، الغضب، التعب، الراحة. يمكنني اختيار أكثر من كلمة.",
  "<b>أحدّد الشدّة</b> من ٠ إلى ١٠.",
  "<b>أضيف وسومًا</b> (النوم، العمل، العلاقات، الجسد، الوحدة) <b>وملاحظة</b> إن أردت.",
  "<b>أعلّم التسجيل «للجلسة القادمة»</b> فيظهر لاحقًا في أجندة معالجي.",
 ]) + callout("tip","نصيحة","كلمة المشاعر الدقيقة تساعدني على فهم نفسي، وتساعد معالجي لاحقًا. لا أحتاج إلى التسجيل كل يوم."),
 phone("checkin.png", 128), tag="الاستخدام اليومي")

# 5 tracker
page("التتبّع",
 "أرى كيف مرّت أيامي دون ضغط ولا لوم.",
 bullets([
  "<b>تقويم الشهر</b> يلوّن الأيام التي سجّلتُ فيها فقط، بثلاث درجات: خفيف ومتوسط وشديد.",
  "أضغط على أي يوم فأرى ما سجّلتُه فيه.",
  "<b>منحنى الشدّة</b> لآخر سبعة أيام مسجّلة.",
  "<b>أكثر المشاعر حضورًا</b> في الشهر.",
 ]) + callout("tip","بلا لوم","اليوم الذي لا أسجّل فيه يبقى فارغًا دون تعليق. لا سلاسل أيام ولا نقاط."),
 phone("tracker.png", 128), tag="الاستخدام اليومي")

# 6 journey
page("الرحلة: عشر خطوات",
 "أمشيها بالترتيب الذي يناسبني، وأعود إلى أي خطوة في أي وقت. لا شيء مقفل.",
 "<table class='map'><tr><th>#</th><th>الخطوة</th><th>سؤالها الأساسي</th></tr>"
 + "".join(f"<tr><td>{n(a)}</td><td>{b}</td><td>{c}</td></tr>" for a,b,c in [
  (1,"تصديق المشاعر","هل مشاعري مشروعة حتى لو كانت مؤلمة؟"),
  (2,"تقبّل الذات","هل أستطيع أن أكون مع نفسي كما أنا اليوم؟"),
  (3,"تنظيم الذات","كيف أهدّئ نفسي وأوجّه انفعالي؟"),
  (4,"فهم الذات","ما الذي أحتاج إلى فهمه حقًا عن نفسي؟"),
  (5,"التعاطف مع الذات","كيف أخاطب نفسي حين أخطئ؟"),
  (6,"مسامحة الذات","كيف أتحرر من الذنب والعار عن الماضي؟"),
  (7,"الحدود واحترام الذات","ما الذي أقبله من الآخرين وما الذي لا أقبله؟"),
  (8,"الثقة بالنفس","هل أستطيع أن أفي بوعودي لنفسي؟"),
  (9,"العناية والعادات","ما الروتين الذي يبقيني ثابتًا؟"),
  (10,"القيم والاتجاه","من أريد أن أصبح، وما الذي يهمّني حقًا؟")]) + "</table>"
 + "<p class='small'>حالة كل خطوة تظهر على بطاقتها: «قيد التمرين» أو «مكتملة». الخطوات ١–٣ تتبع بنية وضعها معالج صاحب المشروع، والخطوات ٤–١٠ مسودات يراجعها مختص.</p>",
 phone("journey.png", 128), tag="الرحلة")

# 7 practices
page("التمارين الموجّهة",
 "داخل كل خطوة شرح قصير وتمارين من أسئلة متفرّعة: ما أجيب به يحدّد السؤال التالي.",
 bullets([
  "<b>شرح قصير</b> يوضّح فكرة الخطوة.",
  "<b>حفظ تلقائي للمسودة:</b> إن خرجتُ في منتصف تمرين يبقى كما تركتُه وأكمله لاحقًا.",
  "<b>فحص جاهزية لطيف</b> قبل بعض الخطوات.",
  "في الخطوة الثالثة <b>متابعة بعد التمرين:</b> هل ساعدني ما جرّبتُه؟ وكم انخفضت الشدّة؟",
  "في التعاطف والمسامحة والامتنان <b>رسائل</b> أكتبها لنفسي.",
  "أستطيع أن أرجع خطوة داخل التمرين بزر «السابق».",
 ]), phone("step.png", 92) + phone("practice.png", 92), tag="الرحلة")

# 8 triggers
page("محفّزاتي",
 "سجلّ لما يزعجني، أفهمه ببطء. هو تمرين الخطوة الرابعة.",
 "<p>أبدأ <b>«فهم مشكلة»</b> وأجيب عن خمسة أسئلة:</p>" + steps([
  "ما المشكلة في جملة واحدة؟",
  "ماذا يقول لي صوت الخزي عني بسبب هذه المشكلة؟",
  "ما الذي يحاول هذا النمط أن يحميني منه؟",
  "ما الذي كان ينقصني كلما حاولتُ التغيير؟",
  "ماذا كان سيقول صديق منصف، لا يحكم عليّ، عن قصتي؟"]) +
 "<p>تظهر سجلاتي المكتملة في قائمة. أفتح أي سجلّ فأقرأه، وأستطيع <b>تعديله</b> أو <b>حذفه</b> (مع تأكيد قبل الحذف).</p>",
 phone("triggers.png", 128), tag="الرحلة")

# 9 calm
page("أحتاج تهدئة",
 "زر واحد في أعلى الرئيسية وصفحة تقول لي: «لا شيء مطلوب منّي الآن سوى أن أتنفّس».",
 bullets([
  "<b>تنفّس هادئ:</b> شهيق بطيء أربع ثوانٍ، وزفير أطول ست ثوانٍ، خمس مرات.",
  "<b>التأريض بالحواس:</b> ٥ أشياء أراها، ٤ ألمسها، ٣ أسمعها، شيئان أشمّهما، شيء واحد أتذوّقه.",
  "<b>مساعدة عاجلة:</b> أرقام الدعم المحلية. أختار بلدي من الإعدادات، وإن لم أحدّده تظهر أرقام مصر كخيار احتياطي، وكل رقم معه مصدره وتاريخ التحقق منه.",
  "الأرقام محفوظة في التطبيق وتعمل دون إنترنت.",
  "«‹ الرجوع» يعيدني إلى الصفحة التي كنتُ فيها.",
 ]) + callout("warn","في الخطر","إن شعرتُ بأنني قد أكون في خطر، أتواصل الآن مع خدمات الطوارئ في بلدي أو مع شخص أثق به."),
 phone("calm.png", 128), tag="الاستخدام اليومي")

# 10 therapist
page("لمعالجي: الجلسات والواجبات",
 "قسم يجمع كل ما يخصّ جلساتي، ليكون ما أقوله لمعالجي مرتّبًا.",
 bullets([
  "<b>«ما أريد مناقشته في الجلسة القادمة»:</b> أجندة تتجمّع فيها نقاطي، والتسجيلات التي علّمتُها «للجلسة القادمة». أعدّل النقاط وأحذفها وأعلّمها منجزة.",
  "<b>«إضافة ملاحظات جلسة»:</b> أكتب ما قاله المعالج وما أخذتُه معي، وأضيف الواجبات.",
  "<b>الجلسات السابقة:</b> كل جلسة بتاريخها وعدد الواجبات المنجزة.",
  "<b>واجباتي:</b> قائمة بكل الواجبات من كل الجلسات، والمفتوح منها أولًا. لكل واجب سجلّه: عنوان، ملاحظات، حتى ٦ صور (تُصغَّر وتبقى على جهازي)، وإجابتي المكتوبة مع صور خاصة بها، وعلامة «أنجزتُ هذا الواجب». الحفظ تلقائي عند الخروج.",
 ]) + callout("tip","الخصوصية","صور الإجابة خاصة ولا تظهر في ملخّص المعالج."),
 phone("therapist.png", 76) + phone("homework-list.png", 76) + phone("homework.png", 76), tag="لمعالجي")

# 11 notes
page("ملاحظاتي",
 "مكان أكتب فيه ما أريد تذكّره طوال الأسبوع، دون أن أنتظر الجلسة.",
 bullets([
  "<b>أضيف ملاحظة</b> من الرئيسية في ثوانٍ، أو من صفحة «ملاحظاتي». لكل ملاحظة تاريخها ووقتها، وأستطيع <b>تعديلها</b> أو <b>حذفها</b> (مع تأكيد).",
  "<b>«تجديد»:</b> في نهاية الأسبوع أضغط «تجديد» فيسألني التطبيق أولًا، ثم ينقل كل ملاحظات الأسبوع إلى <b>الأرشيف</b> وتبدأ القائمة فارغة. لا يُحذف شيء.",
  "<b>الأرشيف:</b> كل «تجديد» مجموعة مطويّة فيها تاريخها وعدد ملاحظاتها وسطر من أحدثها. أضغط عليها فتنفتح بحركة هادئة لأقرأها.",
  "<b>في الملخّص:</b> خيار «ملاحظاتي» يضيف إلى ملخّص المعالج الملاحظات التي كُتبت داخل الفترة التي اخترتُها، الحالية والمؤرشفة.",
  "ملاحظاتي تدخل في النسخة الاحتياطية وتُستعاد منها، وهي خاصة ما لم أفعّل الخيار.",
 ]), phone("notes-archive.png", 128), tag="لمعالجي")

# 12 summary
page("ملخّص للمعالج",
 "ورقة منظّمة بحجم A4 أسلّمها لمعالجي. لا يُرسَل شيء إلى أي مكان.",
 steps([
  "<b>أحدّد الفترة</b> (من/إلى).",
  "<b>أختار ما يدخل فيها:</b> تسجيلات المشاعر، منحنى الشدّة، مراجعات الأسبوع، الممارسات الموجّهة، نقاط «للنقاش في الجلسة»، <b>إجابات الواجبات</b>، و<b>ملاحظاتي</b>.",
  "<b>أرى المعاينة</b> كما ستُطبع: اسمي واسم معالجي وفترة الملخّص وأيام التسجيل وأكثر شعور حضورًا.",
  "<b>أحفظ ملفًا PDF</b> أو أطبعها وأرسلها بالطريقة التي أفضّلها.",
 ]) + callout("tip","ما الذي لا يدخل أبدًا","الممارسات التي لم أُعلّمها للمشاركة تبقى خاصة. وصور الإجابة لا تدخل الملخّص أبدًا. وملاحظات الجلسات التي كتبتُها عن كلام المعالج لا تدخله."),
 phone("summary.png", 128), tag="لمعالجي")

# 13 library
page("مكتبتي",
 "قراءة هادئة عن اضطراب الشخصية الحدّية، من مصادر موثوقة وبكلمات لا تؤذي. القراءة ليست تشخيصًا.",
 bullets([
  "<b>ما هو اضطراب الشخصية الحدّية؟</b> شرح بسيط: ما هو، وأربعة مجالات يظهر فيها، ومن أين يأتي، ومن يشخّصه، وهل له علاج.",
  "<b>الأعراض بكلمات رحيمة:</b> تسع بطاقات. في كل بطاقة: كيف قد أشعر به، وما الحاجة خلفه، وجمل أختار منها ما يناسبني (أو لا أختار شيئًا)، وزر يفتح أداة في رفيق تساعدني الآن.",
  "<b>الأمل والتعافي:</b> ما تقوله الأبحاث بصدق مع حدوده: كثيرون يتحسّنون، والتعافي الكامل أبطأ من خفّة الأعراض.",
  "<b>المصادر</b> في آخر كل صفحة، مكتوبة نصًّا قابلًا للنسخ مع حدّ كل مصدر.",
  "<b>«مسودة للمراجعة»:</b> كل نص يحمل هذه الشارة إلى أن يراجعه معالج مختص ويعتمده.",
 ]) + callout("warn","أفكار إيذاء النفس","بطاقة أفكار إيذاء النفس تبدأ بزر «أحتاج مساعدة الآن» قبل أي نص."),
 phone("library.png", 76) + phone("library-symptoms.png", 76) + phone("library-symptom.png", 76), tag="مكتبتي")

# 14 year plan
page("خطة السنة",
 "خطة من اثني عشر شهرًا تبدأ من الشهر الذي أختاره.",
 bullets([
  "<b>رؤيتي للسنة</b> وعنوانها يتبع عمري الذي أدخله («عامي الثامن والعشرون»).",
  "<b>أهداف السنة</b> أعلّمها كلما أنجزتُ هدفًا، ويظهر <b>تقدّمي</b> في أعلاها.",
  "<b>شهر بشهر:</b> لكل شهر موضوعه، وخطوات أسبوعية أعلّمها، وملاحظة تحت كل خطوة.",
  "<b>مراجعة السنة:</b> أسئلة أجيب عنها في آخر الرحلة.",
  "أضبط عمري وشهر البداية من نفس الصفحة.",
 ]), phone("year-plan.png", 128), tag="الخطة")

# 15 settings
page("الإعدادات",
 "كل ما يخصّ مظهر التطبيق وبياناتي في مكان واحد.",
 bullets([
  "<b>المظهر:</b> تلقائي أو فاتح أو داكن، و<b>ستة ألوان مفضّلة</b> (تركوازي، أزرق، بنفسجي، وردي، كهرماني، أخضر) تلوّن التطبيق كله.",
  "<b>بلدي الحالي:</b> يحدّد أرقام الدعم المحلية في صفحة «أحتاج تهدئة».",
  "<b>النسخ الاحتياطي:</b> تصدير واستيراد، وفي أندرويد زر <b>مشاركة نسخة احتياطية</b>.",
  "<b>تذكير يومي</b> بوقت أختاره في أندرويد. التذكير غير دقيق عمدًا ليوفّر البطارية، ولا يلوم إن فاتني.",
  "<b>معلوماتي:</b> اسمي واسم معالجي وشخص أثق به ورقمه. تبقى على جهازي وتظهر أعلى ملخّص المعالج.",
  "<b>عن رفيق</b> و<b>عن المطوّر.</b>",
 ]), phone("settings.png", 128), tag="الإعدادات")

# 16 backup
page("النسخ الاحتياطي ونقل بياناتي",
 "بياناتي على جهازي فقط. إن مسحتُ بيانات المتصفح أو فقدتُ الهاتف فلن أستعيدها إلا من نسخة احتياطية.",
 "<table class='map'><tr><th>ما أريده</th><th>ما أفعله</th></tr>"
 "<tr><td>حفظ نسخة</td><td>الإعدادات ← <b>تصدير نسخة احتياطية</b> (في أندرويد أختار مكان الحفظ على جهازي)</td></tr>"
 "<tr><td>نقل بياناتي إلى جهاز آخر</td><td>في أندرويد: <b>مشاركة نسخة احتياطية</b> ← أرسلها إلى الجهاز الآخر عبر تطبيق أثق به، ثم أستوردها هناك</td></tr>"
 "<tr><td>الاستعادة</td><td><b>اختيار ملف النسخة الاحتياطية</b> ← أختار الطريقة ← <b>استيراد</b></td></tr></table>"
 "<h3>عند الاستيراد أختار بين</h3>" + bullets([
  "<b>دمج مع بياناتي:</b> أحتفظ بالأحدث عند التعارض.",
  "<b>استبدال بياناتي الحالية:</b> يمحو ما عندي ويضع ما في الملف.",
 ]) + callout("warn","أحفظها في مكان آمن","ملف النسخة فيه كل بياناتي وصوري، وهو <b>غير مشفّر</b>. أشاركه مع تطبيق أثق به فقط. ورسالة «فتحتُ قائمة المشاركة» تعني أن القائمة ظهرت فقط، ولا تثبت أن الملف وصل.")
 + "<p class='small'>يتحقّق التطبيق من الملف قبل أن يلمس بياناتي، والاستيراد إمّا أن ينجح كاملًا أو لا يغيّر شيئًا، ولا يتغيّر شيء قبل أن أؤكّد.</p>",
 "", tag="بياناتي")

# 17 privacy
page("الخصوصية والأمان",
 "صُمّم رفيق ليبقى كل شيء بيدي.",
 bullets([
  "كل شيء محفوظ في <b>قاعدة بيانات داخل المتصفح</b> (أو داخل تطبيق أندرويد). لا يُرفع شيء إلى أي خادم.",
  "<b>لا حساب، ولا تحليلات، ولا كوكيز، ولا خطوط خارجية.</b>",
  "<b>المشاركة اختيارية دائمًا:</b> ملاحظاتي وإجابات واجباتي وممارساتي خاصة ما لم أقرّر مشاركتها، وملخّص المعالج لا يحتوي إلا ما اخترتُه.",
  "في أندرويد لا يطلب التطبيق إذن الكاميرا ولا التخزين. الصور تُختار من المعرض أو تُلتقط عبر نافذة النظام.",
  "نسخة أندرويد تستثني بياناتها من النسخ التلقائي لجوجل، فلا تغادر الجهاز إلا بنسخة أصدرها أنا.",
  "مصادر المكتبة تُعرض نصًّا قابلًا للنسخ، دون روابط تخرج من التطبيق.",
 ]) + callout("tip","قفل الهاتف","من يستخدم جهازي نفسه قد يرى ما كتبتُه. أستخدم قفل الهاتف لحماية بياناتي."), "", tag="بياناتي")

# 18 faq
page("أسئلة شائعة", "إجابات قصيرة لما يسأله كثيرون.",
 "<dl class='faq'>"
 "<dt>هل أحتاج إنترنت؟</dt><dd>بعد أول فتح لا. التطبيق كله يعمل دون اتصال.</dd>"
 "<dt>هل بياناتي في المتصفح هي نفسها في تطبيق أندرويد؟</dt><dd>لا، كل واحد منهما يحفظ بياناته وحده. أنقلها بنسخة احتياطية.</dd>"
 "<dt>هل يمكنني مزامنة جهازين تلقائيًا؟</dt><dd>لا. جرّبنا المزامنة المباشرة بين جهازين، لكنها تتعطّل على شبكات كثيرة، فاعتمدنا المشاركة والاستيراد.</dd>"
 "<dt>أخطأتُ في الاسم الذي كتبتُه.</dt><dd>من الإعدادات ← «معلوماتي» أعدّله وأحفظ.</dd>"
 "<dt>كيف أحذف كل شيء؟</dt><dd>أمسح بيانات الموقع من المتصفح، أو أُزيل تطبيق أندرويد. أصدر نسخة احتياطية قبل ذلك إن أردت الاحتفاظ بشيء.</dd>"
 "<dt>ما معنى «مسودة للمراجعة»؟</dt><dd>أن نص المكتبة كُتب من مصادر موثوقة ولم يعتمده بعد معالج مختص.</dd>"
 "<dt>هل رفيق بديل عن المعالج؟</dt><dd>لا. هو أداة مساعدة، ويستعين بك على التحضير للجلسات وفهم نفسك.</dd>"
 "</dl>", "", tag="ختام")

# closing
page("وفي الختام",
 "رفيق أداة مساعدة ذاتية، وليس جهازًا طبيًا ولا يقدّم تشخيصًا أو علاجًا.",
 "<div class='closing'><p>إن كنتُ في أزمة، أتصل بخدمات الطوارئ المحلية أو بشخص أثق به فورًا. وفي التطبيق صفحة «أحتاج تهدئة» فيها أرقام الدعم.</p>"
 "<p>أستطيع دائمًا أن أبدأ من جديد، وأن أسير بسرعتي، وأن أتوقف حين أشاء.</p></div>"
 "<table class='map'><tr><th>الرابط</th><th>العنوان</th></tr>"
 "<tr><td>التطبيق على الويب</td><td class='ltr'>https://rafiq-iota-neon.vercel.app</td></tr>"
 "<tr><td>تطبيق أندرويد والإصدارات</td><td class='ltr'>github.com/0omarahmed73/rafiq/releases</td></tr></table>"
 "<p class='small'>صُنع بعناية · Omar A. Saeed · Full Stack Developer</p>", "", tag="ختام", cls="last")

CSS = r"""
@font-face{font-family:'IBM Plex Sans Arabic';font-weight:400;src:url('../public/fonts/ibm-plex-sans-arabic-400.woff2') format('woff2')}
@font-face{font-family:'IBM Plex Sans Arabic';font-weight:500;src:url('../public/fonts/ibm-plex-sans-arabic-500.woff2') format('woff2')}
@font-face{font-family:'IBM Plex Sans Arabic';font-weight:600;src:url('../public/fonts/ibm-plex-sans-arabic-600.woff2') format('woff2')}
@font-face{font-family:'IBM Plex Sans Arabic';font-weight:700;src:url('../public/fonts/ibm-plex-sans-arabic-700.woff2') format('woff2')}
@page{size:A4;margin:0}
:root{--teal:#2f6f66;--soft:#dcebe7;--ink:#17302b;--muted:#51655f;--line:#dce5e1;--bg:#f3f6f4}
*{box-sizing:border-box}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;font-family:'IBM Plex Sans Arabic',sans-serif;color:var(--ink);font-size:12.2pt;line-height:1.9;background:#fff}
.ltr{direction:ltr;unicode-bidi:embed;display:inline-block}
.page{width:210mm;height:297mm;position:relative;overflow:hidden;page-break-after:always;padding:0;background:var(--bg)}
.cover{background:linear-gradient(160deg,#2f6f66 0%,#1f5249 55%,#102b27 100%);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:9mm}
.cover .mark{width:46mm;height:46mm;border-radius:50%;background:#fff;color:var(--teal);display:flex;align-items:center;justify-content:center;font-size:74pt;font-weight:700;line-height:1;box-shadow:0 0 0 7mm rgba(255,255,255,.12),0 0 0 15mm rgba(255,255,255,.06)}
.cover h1{font-size:50pt;margin:6mm 0 0;font-weight:700;line-height:1.2}
.cover .sub{font-size:17pt;opacity:.92;margin:0;font-weight:400}
.cover .rule{width:30mm;height:1.2mm;background:rgba(255,255,255,.55);border-radius:2mm}
.cover .meta{font-size:11pt;opacity:.8;position:absolute;bottom:18mm;left:0;right:0}
.band{background:var(--teal);color:#fff;padding:13mm 16mm 9mm}
.band .tag{font-size:10pt;opacity:.85;font-weight:500;letter-spacing:.02em}
.band h2{margin:1mm 0 2mm;font-size:27pt;line-height:1.3;font-weight:700}
.band p{margin:0;font-size:12pt;line-height:1.75;opacity:.95;max-width:165mm}
.body{padding:9mm 16mm 0;display:grid;grid-template-columns:1fr auto;gap:9mm;align-items:start}
.body.solo{grid-template-columns:1fr}
.txt{min-width:0}
.pics{display:flex;flex-direction:column;gap:6mm;align-items:center}
.pics.row{flex-direction:row;grid-column:1/-1;justify-content:center}
.phone{margin:0;width:62mm;max-height:var(--h);border-radius:7mm;border:2.2mm solid #17302b;overflow:hidden;background:#fff;box-shadow:0 3mm 7mm rgba(23,48,43,.22);flex:none}
.phone img{width:100%;height:auto;display:block}
.phone.wide{width:72mm}
.pics.row .phone,.pics.multi .phone{width:55mm}
.feat{list-style:none;margin:0 0 5mm;padding:0;display:flex;flex-direction:column;gap:3mm}
.feat li{position:relative;padding:0 6mm 0 0;font-size:12pt;line-height:1.8}
.feat li::before{content:"";position:absolute;right:0;top:3.2mm;width:2.4mm;height:2.4mm;border-radius:50%;background:var(--teal)}
.steps{counter-reset:s;list-style:none;margin:0 0 5mm;padding:0;display:flex;flex-direction:column;gap:3mm}
.steps li{counter-increment:s;position:relative;padding:0 11mm 0 0;font-size:12pt;line-height:1.8}
.steps li::before{content:counter(s,arabic-indic);position:absolute;right:0;top:.5mm;width:7.5mm;height:7.5mm;border-radius:50%;background:var(--soft);color:var(--teal);font-weight:700;font-size:10.5pt;display:flex;align-items:center;justify-content:center;line-height:1}
.callout{display:flex;flex-direction:column;gap:1mm;border-radius:4mm;padding:4mm 5mm;margin:5mm 0;font-size:11.4pt;line-height:1.75}
.callout strong{font-size:11pt}
.callout.tip{background:var(--soft);border:.35mm solid #b9d6cf;color:#1f5249}
.callout.warn{background:#fdf2e3;border:.35mm solid #efcf9f;color:#6b4513}
table.map{width:100%;border-collapse:separate;border-spacing:0;border:.35mm solid var(--line);border-radius:4mm;overflow:hidden;background:#fff;margin:2mm 0 4mm;font-size:11.4pt;line-height:1.75}
.map th{background:var(--teal);color:#fff;text-align:right;padding:2.4mm 4mm;font-weight:600}
.map td{padding:2.4mm 4mm;border-top:.3mm solid var(--line);vertical-align:top}
.map tr:nth-child(even) td{background:#f7faf9}
.map td:first-child{font-weight:600;color:var(--teal);white-space:nowrap}
p{margin:0 0 3mm}
p.small{font-size:9.8pt;color:var(--muted);line-height:1.75}
h3{font-size:14pt;margin:5mm 0 2mm;color:var(--teal)}
h4{font-size:12pt;margin:0 0 2mm;color:var(--ink)}
.install{background:#fff;border:.35mm solid var(--line);border-radius:5mm;padding:5mm 6mm;margin-top:3mm}
.install h3{margin-top:0}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:8mm}
.faq{margin:0}
.faq dt{font-weight:700;color:var(--teal);margin-top:5.5mm;font-size:13pt}
.faq dd{margin:.5mm 0 0;font-size:12pt}
.closing{background:#fff;border:.35mm solid var(--line);border-radius:5mm;padding:7mm 8mm;margin-bottom:6mm;font-size:13.5pt;line-height:2.05}
.foot{position:absolute;bottom:7mm;left:16mm;right:16mm;display:flex;justify-content:space-between;font-size:9pt;color:var(--muted);border-top:.3mm solid var(--line);padding-top:2.5mm}
.toc ol{list-style:none;margin:0;padding:0;columns:2;column-gap:12mm}
.toc li{display:flex;justify-content:space-between;gap:4mm;padding:4.2mm 0;border-bottom:.3mm dotted #b8c8c2;break-inside:avoid;font-size:14pt}
.toc li b{color:var(--teal)}
"""

html = ['<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>رفيق: دليل المستخدم</title><style>', CSS, '</style></head><body>']
html.append('<section class="page cover"><div class="mark">ر</div><h1>رفيق</h1><div class="rule"></div><p class="sub">دليل المستخدم</p><p class="sub" style="font-size:13pt;opacity:.8">رفيقٌ يرافقني في رحلة العناية بنفسي</p><div class="meta">الإصدار ٠٫٢٫٠ · بياناتك تبقى على جهازك</div></section>')

# toc page
toc_items = "".join(f"<li><span>{p['title']}</span><b>{n(i+3)}</b></li>" for i, p in enumerate(pages))
html.append(f'<section class="page"><div class="band"><div class="tag">المحتويات</div><h2>ماذا في هذا الدليل؟</h2><p>جولة مصوّرة في كل أجزاء رفيق، بلغة بسيطة.</p></div><div class="body solo toc"><div class="txt"><ol>{toc_items}</ol></div></div><div class="foot"><span>رفيق · دليل المستخدم</span><span>{n(2)}</span></div></section>')

for i, p in enumerate(pages):
    right = p["right"]
    multi = right.count("class=\"phone") > 1
    pics = f'<div class="pics{" multi" if multi else ""}">{right}</div>' if right and not multi else (f'<div class="pics row">{right}</div>' if right else "")
    solo = "" if right and not multi else (" solo" if not right else "")
    if multi:
        body = f'<div class="body solo"><div class="txt">{p["left"]}</div>{pics}</div>'
    else:
        body = f'<div class="body{" solo" if not right else ""}"><div class="txt">{p["left"]}</div>{pics}</div>'
    html.append(f'<section class="page {p["cls"]}"><div class="band"><div class="tag">{p["tag"]}</div><h2>{p["title"]}</h2><p>{p["lead"]}</p></div>{body}<div class="foot"><span>رفيق · دليل المستخدم</span><span>{n(i+3)}</span></div></section>')
html.append("</body></html>")
OUT.write_text("".join(html), encoding="utf-8")
print("wrote", OUT, len(pages) + 2, "pages")
